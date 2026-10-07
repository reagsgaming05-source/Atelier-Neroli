#!/usr/bin/env python3
"""Records a short passage with several free French voices, to compare them by ear.

  python scripts/narration/lab.py xtts|chatterbox|edge|kyutai OUT_DIR

kyutai records one voice per run: SHARD (0..SHARDS-1) picks it from the French voices
of Kyutai's catalogue, so several runs can work in parallel.

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


SHORT = " ".join(TEXT.split(" » ")[:2]) + " »"


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


def kyutai(out: Path):
    import os

    import numpy as np
    import sphn
    import torch
    from huggingface_hub import list_repo_files
    from moshi.models.loaders import CheckpointInfo
    from moshi.models.tts import DEFAULT_DSM_TTS_REPO, DEFAULT_DSM_TTS_VOICE_REPO, TTSModel

    shard, shards = int(os.environ.get("SHARD", 0)), int(os.environ.get("SHARDS", 1))
    tts = TTSModel.from_checkpoint_info(CheckpointInfo.from_hf_repo(DEFAULT_DSM_TTS_REPO), n_q=32, temp=0.6, device="cpu", dtype=torch.float32)
    suffix = tts.voice_suffix
    names = sorted(f[: -len(suffix)] for f in list_repo_files(DEFAULT_DSM_TTS_VOICE_REPO) if f.endswith(suffix))
    french = [n for n in names if "/fr/" in n or n.startswith("fr/")]
    print(len(names), "voices,", len(french), "French")
    if not french:
        raise SystemExit("no French voice found: " + ", ".join(names[:40]))
    # Evenly spread over the catalogue; each shard records its own voice.
    voice = french[(shard * len(french)) // shards + len(french) // (2 * shards)]
    print("voice:", voice)
    entries = tts.prepare_script([SHORT], padding_between=1)
    conditions = tts.make_condition_attributes([tts.get_voice_path(voice)], cfg_coef=2.0)
    result = tts.generate([entries], [conditions])
    with tts.mimi.streaming(1), torch.no_grad():
        pcm = np.concatenate([np.clip(tts.mimi.decode(f[:, 1:, :]).cpu().numpy()[0, 0], -1, 1) for f in result.frames[tts.delay_steps :]])
    wav = out / "tmp.wav"
    sphn.write_wav(str(wav), pcm, tts.mimi.sample_rate)
    to_mp3(wav, out / f"kyutai-{shard}-{Path(voice).stem}.mp3")


if __name__ == "__main__":
    engine, directory = sys.argv[1], Path(sys.argv[2])
    directory.mkdir(parents=True, exist_ok=True)
    {"xtts": xtts, "chatterbox": chatterbox, "edge": edge, "kyutai": kyutai}[engine](directory)
