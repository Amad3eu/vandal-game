"""Builds the app's sprites from the web project's pixel art.

React Native smooths images when it scales them up, which blurs pixel art. This copies the
sprites 4x larger with nearest-neighbour scaling (so the app only ever scales them down) and
rasterises the power-up SVGs, which are plain <rect> pixel art. Run it again whenever a
sprite in ../src/assets changes:

    python3 scripts/build-sprites.py      (needs Pillow: pip install pillow)
"""
import re
from pathlib import Path

from PIL import Image, ImageDraw

SCALE = 4
MOBILE = Path(__file__).resolve().parent.parent
SOURCE = MOBILE.parent / "src" / "assets" / "sprites"
OUT = MOBILE / "assets" / "sprites"

# output folder -> (source folder, glob)
GROUPS = {
    "walk": ("walk", "walk-*.png"),
    "jump": ("jump", "jump-*.png"),
    "duck": ("Abaixa", "Abaixa*.png"),
    "spray": ("Spray", "Sprite-*.png"),
    "train": ("Train", "Sprite-*.png"),
}


def natural_key(path: Path):
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", path.name)]


def upscale_group(name: str, folder: str, pattern: str):
    target = OUT / name
    target.mkdir(parents=True, exist_ok=True)
    for index, source in enumerate(sorted((SOURCE / folder).glob(pattern), key=natural_key), start=1):
        image = Image.open(source).convert("RGBA")
        image.resize((image.width * SCALE, image.height * SCALE), Image.NEAREST).save(target / f"{index}.png")


def rasterise_svg(source: Path, target: Path):
    svg = source.read_text()
    width = int(re.search(r'width="(\d+)"', svg).group(1))
    height = int(re.search(r'height="(\d+)"', svg).group(1))
    image = Image.new("RGBA", (width * SCALE, height * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for rect in re.finditer(r"<rect ([^>]*)/>", svg):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', rect.group(1)))
        x, y = int(attrs["x"]) * SCALE, int(attrs["y"]) * SCALE
        w, h = int(attrs["width"]) * SCALE, int(attrs["height"]) * SCALE
        draw.rectangle([x, y, x + w - 1, y + h - 1], fill=attrs["fill"])
    image.save(target)


def main():
    for name, (folder, pattern) in GROUPS.items():
        upscale_group(name, folder, pattern)
    (OUT / "powerups").mkdir(parents=True, exist_ok=True)
    for kind in ("jump", "lightning"):
        rasterise_svg(SOURCE / "powerups" / f"power-{kind}.svg", OUT / "powerups" / f"{kind}.png")
    print(f"sprites written to {OUT}")


if __name__ == "__main__":
    main()
