#!/usr/bin/env python3
"""Records a short passage with several free French voices, to compare them by ear.

  python scripts/narration/lab.py xtts|chatterbox|edge OUT_DIR

Each engine writes one MP3 per voice into OUT_DIR. Used by the "Voice lab"
workflow; nothing here touches the app.
"""

import asyncio
import subprocess
import sys
from pathlib import Path

TEXT = (
    "Au commencement de l’histoire des hommes, Allah annonça aux anges : « Je vais établir sur la terre un successeur. » "
    "Les anges s’étonnèrent : cet être n’allait-il pas semer le désordre sur la terre, alors qu’eux célébraient Sa gloire ? "
    "Allah répondit : « Je sais ce que vous ne savez pas. » "
    "Allah appelle cette histoire « le meilleur récit ». C’est l’histoire de Youssouf, paix sur lui, et de ses frères."
)


def to_mp3(src: Path, dst: Path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-b:a", "64k", str(dst)], check=True)
    src.unlink()


def xtts(out: Path):
    import os

    os.environ["COQUI_TOS_AGREED"] = "1"  # CPML licence: free for non-commercial use
    from TTS.api import TTS

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    for speaker in ["Claribel Dervla", "Daisy Studios", "Ana Florence", "Gracie Wise", "Damien Black", "Viktor Menelaos"]:
        try:
            wav = out / "tmp.wav"
            tts.tts_to_file(text=TEXT, speaker=speaker, language="fr", file_path=str(wav), split_sentences=True, speed=0.95)
            to_mp3(wav, out / f"xtts-{speaker.split()[0].lower()}.mp3")
        except Exception as e:  # one voice failing must not lose the others
            print("xtts", speaker, "failed:", e)


def chatterbox(out: Path):
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    for name, exaggeration in [("calme", 0.35), ("expressif", 0.6)]:
        wav = out / "tmp.wav"
        audio = model.generate(TEXT, language_id="fr", exaggeration=exaggeration, cfg_weight=0.4)
        ta.save(str(wav), audio, model.sr)
        to_mp3(wav, out / f"chatterbox-{name}.mp3")


def edge(out: Path):
    import edge_tts

    async def run():
        for voice in ["fr-FR-VivienneMultilingualNeural", "fr-FR-DeniseNeural", "fr-FR-RemyMultilingualNeural", "fr-FR-HenriNeural", "fr-CH-ArianeNeural"]:
            try:
                await edge_tts.Communicate(TEXT, voice, rate="-8%").save(str(out / f"edge-{voice}.mp3"))
            except Exception as e:
                print("edge", voice, "failed:", e)

    asyncio.run(run())


if __name__ == "__main__":
    engine, directory = sys.argv[1], Path(sys.argv[2])
    directory.mkdir(parents=True, exist_ok=True)
    {"xtts": xtts, "chatterbox": chatterbox, "edge": edge}[engine](directory)
