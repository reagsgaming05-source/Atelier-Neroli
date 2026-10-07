#!/usr/bin/env python3
"""Puts a recording made elsewhere (e.g. read by Gemini in Google AI Studio) into the app.

  python scripts/narration/align.py EPISODE AUDIO [--voice CREDIT]

EPISODE is a key such as nuh-1, AUDIO the recording of that episode's texts read in order
(see .data-cache/narration/segments.json, made by export.mjs). A free speech recognizer
(Whisper, run locally) listens to it with word timestamps, the words are matched against
the texts, and each text gets its span in the file. The episode is then marked "custom" so
the automatic recorder never replaces it.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SEGMENTS = ROOT / ".data-cache" / "narration" / "segments.json"
OUT = ROOT / "public" / "data" / "narration"

# Bump when the way spans are computed changes: recordings aligned with an older version are done again.
VERSION = 2
KEEP_AFTER, KEEP_BEFORE = 0.3, 0.25  # silence kept at the end of a text and before the next one, in seconds
WINDOW = 1.2  # how far from Whisper's estimate a pause is looked for (its timings can be off by a second)
PENALTY = 0.8  # a pause scores its length minus this much per second away from Whisper's estimate
MIN_SCORE = 0.3  # below this the voice is taken to run on without a pause, and Whisper is trusted


def source_id(audio: Path) -> str:
    return hashlib.sha1(audio.read_bytes()).hexdigest()[:8]


def pending(directory: Path, out: Path) -> list[str]:
    """Recordings in `directory` that are not yet in the index, or were aligned by an older version."""
    index = json.loads((out / "index.json").read_text())["episodes"] if (out / "index.json").exists() else {}
    todo = []
    for f in sorted(directory.glob("*.mp3")):
        e = index.get(f.stem)
        if not e or not e.get("custom") or e.get("align") != VERSION or e.get("source") != source_id(f):
            todo.append(f.stem)
    return todo


def tokens(text: str) -> list[str]:
    plain = "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", plain)


def transcribe(audio: Path, model_name: str) -> list[tuple[str, float, float]]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    # Decoded here with ffmpeg: faster-whisper's own decoder breaks on some PyAV versions.
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(audio), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    parts, _ = model.transcribe(np.frombuffer(pcm, dtype=np.float32), language="fr", word_timestamps=True, beam_size=5, condition_on_previous_text=False)
    words = []
    for part in parts:
        for w in part.words or []:
            for t in tokens(w.word):
                words.append((t, w.start, w.end))
    return words


def fit(segments, words, duration, audio):
    ref, owner = [], []
    for i, s in enumerate(segments):
        t = tokens(s["speak"])
        ref += t
        owner += [i] * len(t)
    match = difflib.SequenceMatcher(None, ref, [w[0] for w in words], autojunk=False)
    found: dict[int, int] = {}
    for a, b, size in match.get_matching_blocks():
        for k in range(size):
            found[a + k] = b + k

    times = []
    for i, s in enumerate(segments):
        mine = [r for r, o in enumerate(owner) if o == i]
        hit = [r for r in mine if r in found]
        ratio = len(hit) / max(len(mine), 1)
        if not hit or ratio < 0.4:
            sys.exit(f"Text {i} ({s['text'][:50]!r}) is not in the recording: only {len(hit)}/{len(mine)} words matched.")
        start, end = words[found[hit[0]]][1], words[found[hit[-1]]][2]
        times.append((start, end, ratio))

    for i in range(1, len(times)):
        if times[i][0] < times[i - 1][1] - 0.05:
            sys.exit(f"Texts {i - 1} and {i} overlap in time ({times[i - 1][1]:.1f}s > {times[i][0]:.1f}s): the order differs from the recording.")

    return times, cut(times, silences(audio, duration), duration)


def silences(audio: Path, duration: float) -> list[tuple[float, float]]:
    """Pauses in the recording, found in the audio itself (more exact than Whisper's word times)."""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(audio), "-af", "silencedetect=noise=-38dB:d=0.2", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    starts = [max(float(x), 0.0) for x in re.findall(r"silence_start: (-?[\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    if len(starts) > len(ends):
        ends.append(duration)
    return list(zip(starts, ends))


def cut(times, pauses, duration):
    """One span per text, cut in the pauses between them: nothing is clipped mid-word."""
    spans = [[0.0, duration] for _ in times]
    previous = 0.0
    print("\nboundary  whisper  chosen  pause")
    for i in range(len(times) - 1):
        end, start = times[i][1], times[i + 1][0]
        guess = (end + start) / 2
        def score(p):
            # Paragraph breaks are longer than commas, but a pause far from the estimate is likelier another one.
            return (p[1] - p[0]) - PENALTY * abs((p[0] + p[1]) / 2 - guess)

        near = [p for p in pauses if abs((p[0] + p[1]) / 2 - guess) <= WINDOW and (p[0] + p[1]) / 2 > previous + 0.4]
        best = max(near, key=score, default=None)
        if best and score(best) >= MIN_SCORE:
            s0, e0 = best
            middle = (s0 + e0) / 2
            spans[i][1] = round(min(s0 + KEEP_AFTER, middle), 3)
            spans[i + 1][0] = round(max(e0 - KEEP_BEFORE, middle), 3)
            print(f"{i:4d}->{i + 1:<3d} {guess:7.2f} {middle:7.2f}  {e0 - s0:4.2f} s")
        else:
            middle = guess  # no pause (the voice runs on): trust Whisper
            spans[i][1] = spans[i + 1][0] = round(middle, 3)
            print(f"{i:4d}->{i + 1:<3d} {guess:7.2f} {middle:7.2f}  none (voice runs on)")
        previous = middle
    return spans


def encode(audio: Path, destination: Path, bitrate: str):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(audio), "-f", "s16le", "-ac", "1", "-ar", "24000", "-"], capture_output=True, check=True).stdout
    samples = np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
    rms = float(np.sqrt(np.mean(samples**2))) or 1.0
    peak = float(np.max(np.abs(samples))) or 1.0
    gain = min(0.1 / rms, 0.89 / peak)  # same loudness as the other episodes
    out = (np.clip(samples * gain, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-b:a", bitrate, str(destination)],
        input=out,
        check=True,
    )
    return len(samples) / 24000, gain


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode", nargs="?")
    ap.add_argument("audio", type=Path, nargs="?")
    ap.add_argument("--pending", type=Path, metavar="DIR", help="print the recordings of DIR that still have to be aligned")
    ap.add_argument("--voice", default="Gemini (Google AI Studio)")
    ap.add_argument("--model", default="small", help="Whisper model size")
    ap.add_argument("--bitrate", default="64k")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()
    if args.pending:
        print(" ".join(pending(args.pending, args.out)))
        return
    if not (args.episode and args.audio):
        ap.error("episode and audio are required")

    data = json.loads(SEGMENTS.read_text())
    episode = next((e for e in data["episodes"] if e["key"] == args.episode), None)
    if not episode:
        sys.exit(f"Unknown episode {args.episode}")
    segments = episode["segments"]

    words = transcribe(args.audio, args.model)
    print(f"{len(words)} words heard")
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(args.audio)], capture_output=True, text=True, check=True)
    duration = float(probe.stdout)
    times, spans = fit(segments, words, duration, args.audio)

    print("\n  #  start    end   words  chars/s  text")
    for i, ((start, end, ratio), s) in enumerate(zip(times, segments)):
        rate = len(s["speak"]) / max(end - start, 0.1)
        print(f"{i:3d} {start:6.1f} {end:6.1f}  {ratio:5.0%}  {rate:6.1f}  {s['text'][:60]}")

    signature = hashlib.sha1(args.audio.read_bytes() + "".join(s["speak"] for s in segments).encode()).hexdigest()[:8]
    name = f"{args.episode}.{signature}.mp3"
    args.out.mkdir(parents=True, exist_ok=True)
    seconds, gain = encode(args.audio, args.out / name, args.bitrate)
    print(f"\n{name}: {seconds:.1f} s, gain x{gain:.2f}")

    index_path = args.out / "index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {"voice": "", "episodes": {}}
    for old in args.out.glob(f"{args.episode}.*.mp3"):
        if old.name != name:
            old.unlink()
    index["episodes"][args.episode] = {
        "file": name,
        "spans": {s["hash"]: span for s, span in zip(segments, spans)},
        "custom": True,
        "voice": args.voice,
        "align": VERSION,
        "source": source_id(args.audio),
    }
    index["episodes"] = dict(sorted(index["episodes"].items()))
    index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
