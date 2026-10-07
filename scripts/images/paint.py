"""Paints the pictures of the stories with a free image model, on CPU, in two styles.
  python paint.py <model> <prompts.json> <out dir>
Writes <out>/<style>/<key>.webp and <out>/index.json. Pictures already painted are kept."""
import sys, json, time, pathlib
import torch
from diffusers import AutoPipelineForText2Image

model, prompts_file, out = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
STYLES = {
    "book": "warm hand-painted children's storybook illustration, soft gouache and watercolor texture, golden light, rich warm colors, gentle, magical, no text",
    "cine": "cinematic matte painting, golden hour, volumetric light rays, atmospheric depth, rich warm colors, painterly, epic, no text",
}
prompts = json.loads(prompts_file.read_text())
pipe = AutoPipelineForText2Image.from_pretrained(model, torch_dtype=torch.float32)
pipe.set_progress_bar_config(disable=True)
index_path = out / "index.json"
index = json.loads(index_path.read_text()) if index_path.exists() else {}
for style, look in STYLES.items():
    (out / style).mkdir(parents=True, exist_ok=True)
    for n, (key, scene) in enumerate(prompts.items()):
        file = out / style / f"{key}.webp"
        if file.exists():
            index.setdefault(style, [])
            if key not in index[style]: index[style].append(key)
            continue
        t = time.time()
        image = pipe(prompt=f"{scene}, {look}", num_inference_steps=2, guidance_scale=0.0,
                     width=512, height=640, generator=torch.Generator("cpu").manual_seed(7 + n)).images[0]
        image.save(file, quality=80)
        index.setdefault(style, []).append(key)
        print(style, key, f"{time.time() - t:.1f}s", flush=True)
for style in index: index[style] = sorted(set(index[style]))
index_path.write_text(json.dumps(index, indent=1))
