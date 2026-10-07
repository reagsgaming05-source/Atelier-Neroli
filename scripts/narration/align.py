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

LEAD, TAIL = 0.25, 0.5  # silence kept around each text, in seconds, when the neighbours leave room


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


def fit(segments, words, duration):
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

    # Each text owns the time up to the middle of the silence after it.
    spans = []
    for i, (start, end, _) in enumerate(times):
        prev_end = times[i - 1][1] if i else 0.0
        next_start = times[i + 1][0] if i + 1 < len(times) else duration
        lo = max(start - LEAD, (prev_end + start) / 2) if i else 0.0
        hi = min(end + TAIL, (end + next_start) / 2) if i + 1 < len(times) else duration
        spans.append([round(max(lo, 0.0), 3), round(min(hi, duration), 3)])
    return times, spans


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
    ap.add_argument("episode")
    ap.add_argument("audio", type=Path)
    ap.add_argument("--voice", default="Gemini (Google AI Studio)")
    ap.add_argument("--model", default="small", help="Whisper model size")
    ap.add_argument("--bitrate", default="64k")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    data = json.loads(SEGMENTS.read_text())
    episode = next((e for e in data["episodes"] if e["key"] == args.episode), None)
    if not episode:
        sys.exit(f"Unknown episode {args.episode}")
    segments = episode["segments"]

    words = transcribe(args.audio, args.model)
    print(f"{len(words)} words heard")
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(args.audio)], capture_output=True, text=True, check=True)
    duration = float(probe.stdout)
    times, spans = fit(segments, words, duration)

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
    }
    index["episodes"] = dict(sorted(index["episodes"].items()))
    index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
