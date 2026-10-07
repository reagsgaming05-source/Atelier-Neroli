"""Paints a few sample pictures for one episode with a free image model, on CPU,
so that the look can be judged before painting every scene. Nothing here ships in the app."""
import sys, time, pathlib
import torch
from diffusers import AutoPipelineForText2Image

MODEL = sys.argv[1] if len(sys.argv) > 1 else "stabilityai/sd-turbo"
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "out")
OUT.mkdir(parents=True, exist_ok=True)

STYLES = {
    "livre": "warm hand-painted children's storybook illustration, soft gouache and watercolor texture, golden light, rich warm colors, gentle, magical, no text",
    "cine": "cinematic matte painting, golden hour, volumetric light rays, atmospheric depth, rich warm colors, painterly, epic, no text",
}
SCENES = {
    "nuit": "full moon over an ancient desert town at night, flat roofs, warm lantern light glowing in small windows, stars",
    "foule": "a crowd of tiny distant villagers in long robes seen from far behind, gathered at the foot of an old mud-brick city wall at golden sunset, nobody close, no faces",
    "arche": "men building a huge wooden ship on a dusty hill, planks, ropes, sawdust in the sunlight, tiny distant workers seen from far, no faces",
    "deluge": "dark storm clouds, heavy rain and lightning over a great flood, a big wooden ark riding the waves, dramatic",
    "colombe": "a white dove flying over calm water at sunrise, soft pink and gold sky, a distant mountain",
    "oasis": "an oasis with palm trees and a small spring at dawn, a distant camel caravan crossing the dunes, mist",
}

pipe = AutoPipelineForText2Image.from_pretrained(MODEL, torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True)
gen = torch.Generator("cpu")
for style, look in STYLES.items():
    for name, scene in SCENES.items():
        t = time.time()
        image = pipe(prompt=f"{scene}, {look}", num_inference_steps=2, guidance_scale=0.0,
                     width=512, height=640, generator=gen.manual_seed(7)).images[0]
        image.save(OUT / f"{style}-{name}.jpg", quality=88)
        print(style, name, f"{time.time() - t:.1f}s", flush=True)
