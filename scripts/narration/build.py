#!/usr/bin/env python3
"""Records the story narration with a free neural French voice.

Reads .data-cache/narration/segments.json (made by export.mjs) and writes, for
each episode, one MP3 plus its entry in public/data/narration/index.json: the
time span of every text read in it. Episodes already recorded with the same
voice and the same texts are kept, so only edited episodes are recorded again.

Voices (free, run locally, nothing is sent anywhere):
  Kokoro-82M (Apache-2.0), French voice ff_siwis:
    python3 scripts/narration/build.py --engine kokoro \\
      --model kokoro-v1.0.onnx --voices voices-v1.0.bin --voice ff_siwis
  Piper (MIT), e.g. fr_FR-siwis-medium, fr_FR-tom-medium, fr_FR-upmc-medium:
    python3 scripts/narration/build.py --engine piper --model fr_FR-tom-medium.onnx

Requirements: pip install kokoro-onnx soundfile (or piper-tts), and ffmpeg.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SEGMENTS = ROOT / ".data-cache" / "narration" / "segments.json"
OUT = ROOT / "public" / "data" / "narration"

LEAD = 0.2  # silence before each text, in seconds
TAIL = 0.45  # silence after it: the player pauses here between scenes


def kokoro_engine(args):
    from kokoro_onnx import Kokoro

    kokoro = Kokoro(args.model, args.voices)

    def say(text: str):
        audio, rate = kokoro.create(text, voice=args.voice, speed=args.speed, lang="fr-fr")
        return np.asarray(audio, dtype=np.float32), rate

    return f"kokoro:{Path(args.model).name}:{args.voice}:{args.speed}", say


def piper_engine(args):
    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(args.model)
    speaker = args.speaker
    if speaker is not None and not speaker.isdigit():
        speaker = voice.config.speaker_id_map[speaker]
    config = SynthesisConfig(speaker_id=None if speaker is None else int(speaker), length_scale=1 / args.speed)

    def say(text: str):
        chunks = list(voice.synthesize(text, syn_config=config))
        rate = chunks[0].sample_rate if chunks else voice.config.sample_rate
        silence = np.zeros(int(rate * 0.25), dtype=np.float32)
        parts = []
        for chunk in chunks:
            parts += [chunk.audio_float_array.astype(np.float32), silence]
        return (np.concatenate(parts[:-1]) if parts else silence), rate

    return f"piper:{Path(args.model).name}:{args.speaker}:{args.speed}", say


def tone_engine(args):
    """Placeholder beeps timed like speech, to test the player without a voice."""

    def say(text: str):
        rate = 24000
        t = np.arange(int(rate * max(1.0, len(text) / 15))) / rate
        return (0.2 * np.sin(2 * np.pi * 440 * t) * (np.sin(2 * np.pi * 2 * t) > 0)).astype(np.float32), rate

    return "tone", say


ENGINES = {"kokoro": kokoro_engine, "piper": piper_engine, "tone": tone_engine}


def trim(audio: np.ndarray, rate: int, threshold: float = 0.01) -> np.ndarray:
    """Removes leading and trailing silence, keeping a few milliseconds."""
    loud = np.flatnonzero(np.abs(audio) > threshold)
    if not len(loud):
        return audio
    margin = int(rate * 0.03)
    return audio[max(0, loud[0] - margin) : loud[-1] + margin]


def encode(audio: np.ndarray, rate: int, path: Path, bitrate: str):
    # Even loudness from one episode to the next, without clipping.
    rms = float(np.sqrt(np.mean(audio**2))) or 1.0
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = audio * min(0.1 / rms, 0.89 / peak)
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
    # Constant bitrate keeps seeking exact in every browser.
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "-"]
        + ["-ar", "24000", "-c:a", "libmp3lame", "-b:a", bitrate, str(path)],
        input=pcm,
        check=True,
    )


def record(segments, say):
    """Reads the texts one after the other; returns the audio and each text's span."""
    parts, spans, at, rate = [], {}, 0.0, None
    for segment in segments:
        audio, sr = say(segment["speak"])
        if rate is None:
            rate = sr
        audio = trim(audio, sr)
        lead, tail = np.zeros(int(sr * LEAD), np.float32), np.zeros(int(sr * TAIL), np.float32)
        parts += [lead, audio, tail]
        length = (len(lead) + len(audio) + len(tail)) / sr
        spans[segment["hash"]] = [round(at, 3), round(at + length, 3)]
        at += length
    return np.concatenate(parts), rate, spans


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--engine", choices=ENGINES, required=True)
    parser.add_argument("--model", help="voice model (.onnx)")
    parser.add_argument("--voices", help="Kokoro voices file (voices-v1.0.bin)")
    parser.add_argument("--voice", default="ff_siwis", help="Kokoro voice name")
    parser.add_argument("--speaker", default=None, help="Piper speaker (id or name) for multi-speaker models")
    parser.add_argument("--speed", type=float, default=0.95, help="1 = model default; lower is slower")
    parser.add_argument("--credit", default="", help="voice credit shown in the app")
    parser.add_argument("--bitrate", default="40k")
    parser.add_argument("--only", help="comma-separated story ids or episode keys (adam, adam-0…)")
    parser.add_argument("--force", action="store_true", help="record again even if unchanged")
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--sample", type=Path, help="record only the start of the first episode to this file, to compare voices")
    args = parser.parse_args()

    data = json.loads(SEGMENTS.read_text())
    index_path = args.out / "index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {"voice": "", "episodes": {}}
    voice_id, say = ENGINES[args.engine](args)
    index["voice"] = args.credit or index.get("voice") or voice_id
    args.out.mkdir(parents=True, exist_ok=True)

    wanted = set(args.only.split(",")) if args.only else None
    episodes = [
        e for e in data["episodes"] if wanted is None or e["key"] in wanted or e["key"].rsplit("-", 1)[0] in wanted
    ]
    if not episodes:
        sys.exit(f"No episode matches --only {args.only}")
    if wanted is None:  # drop episodes that no longer exist
        keys = {e["key"] for e in data["episodes"]}
        index["episodes"] = {k: v for k, v in index["episodes"].items() if k in keys}

    if args.sample:
        audio, rate, _ = record(episodes[0]["segments"][:3], say)
        args.sample.parent.mkdir(parents=True, exist_ok=True)
        encode(audio, rate, args.sample, args.bitrate)
        return

    total = len(episodes)
    for n, episode in enumerate(episodes, 1):
        key = episode["key"]
        signature = hashlib.sha1(
            "\n".join([voice_id, args.bitrate] + [s["speak"] for s in episode["segments"]]).encode()
        ).hexdigest()[:8]
        name = f"{key}.{signature}.mp3"
        entry = index["episodes"].get(key)
        if entry and entry.get("custom") and not args.force:
            continue  # recorded elsewhere (align.py): keep that voice
        if not args.force and entry and entry["file"] == name and (args.out / name).exists():
            continue

        started = time.time()
        audio, rate, spans = record(episode["segments"], say)
        encode(audio, rate, args.out / name, args.bitrate)
        at = len(audio) / rate

        for old in args.out.glob(f"{key}.*.mp3"):
            if old.name != name:
                old.unlink()
        index["episodes"][key] = {"file": name, "spans": spans}
        index["episodes"] = dict(sorted(index["episodes"].items()))
        # Saved after every episode, so an interrupted run keeps its progress.
        index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n")
        spent = time.time() - started
        print(f"[{n}/{total}] {key}: {at / 60:.1f} min of audio in {spent:.0f} s", flush=True)

    if wanted is None:
        used = {e["file"] for e in index["episodes"].values()}
        for old in args.out.glob("*.mp3"):
            if old.name not in used:
                old.unlink()
    index_path.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    sys.exit(main())
