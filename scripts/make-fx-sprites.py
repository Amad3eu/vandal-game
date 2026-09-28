"""Draws the skate SLAM's fire: the classic Doom fire (PSX version) — every pixel climbs up,
cooling one step down the palette and drifting sideways at random. Same frames on the web and
in the app, from a fixed seed.

    python3 scripts/make-fx-sprites.py

Writes src/assets/sprites/fx/fire-01.png ... (burning, then dying out). Needs Pillow.
Then run `npm run sprites` inside mobile/ to update the app.
"""
import random
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/assets/sprites/fx"

WIDTH, HEIGHT = 32, 40
BURNING_FRAMES = 8
DYING_FRAMES = 6
STEPS_PER_FRAME = 2

# The PSX Doom fire palette: black → red → orange → yellow → white (37 colors).
PALETTE = [
    (7, 7, 7), (31, 7, 7), (47, 15, 7), (71, 15, 7), (87, 23, 7), (103, 31, 7), (119, 31, 7),
    (143, 39, 7), (159, 47, 7), (175, 63, 7), (191, 71, 7), (199, 71, 7), (223, 79, 7),
    (223, 87, 7), (223, 87, 7), (215, 95, 7), (215, 95, 7), (215, 103, 15), (207, 111, 15),
    (207, 119, 15), (207, 127, 15), (207, 135, 23), (199, 135, 23), (199, 143, 23),
    (199, 151, 31), (191, 159, 31), (191, 159, 31), (191, 167, 39), (191, 167, 39),
    (191, 175, 47), (183, 175, 47), (183, 183, 47), (183, 183, 55), (207, 207, 111),
    (223, 223, 159), (239, 239, 199), (255, 255, 255),
]
TOP = len(PALETTE) - 1


def spread(fire, rng):
    for x in range(WIDTH):
        for y in range(1, HEIGHT):
            src = y * WIDTH + x
            pixel = fire[src]
            if pixel == 0:
                fire[src - WIDTH] = 0
                continue
            # Drift one column left or right at random, and cool down a bit faster than
            # Doom's full-screen fire so the flames end in tips inside a small sprite.
            r = rng.randint(0, 2)
            dst = src + (1 - r) - WIDTH
            if 0 <= dst < len(fire):
                fire[dst] = max(0, pixel - (r & 1) - (1 if rng.random() < 0.95 else 0))


def to_image(fire):
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    px = image.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            value = fire[y * WIDTH + x]
            if value <= 1:
                continue
            # Embers at the tips fade out instead of ending in black pixels.
            alpha = 255 if value > 8 else 60 + value * 24
            px[x, y] = PALETTE[value] + (alpha,)
    return image


def rounded_base(fire):
    """Hotter in the middle: the fire has a rounded silhouette, like a body burning."""
    for x in range(WIDTH):
        edge = abs(x - (WIDTH - 1) / 2) / (WIDTH / 2)
        fire[(HEIGHT - 1) * WIDTH + x] = TOP if edge < 0.7 else int(TOP * (1 - edge) * 2.4)


def main():
    rng = random.Random(1993)
    fire = [0] * (WIDTH * HEIGHT)
    rounded_base(fire)
    for _ in range(HEIGHT):  # let it climb before the first frame
        spread(fire, rng)

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("fire-*.png"):
        old.unlink()
    frames = []
    for _ in range(BURNING_FRAMES):
        for _ in range(STEPS_PER_FRAME):
            spread(fire, rng)
        frames.append(to_image(fire))
    for _ in range(DYING_FRAMES):
        # Take the fuel away: the base cools and the flames shrink.
        base = (HEIGHT - 1) * WIDTH
        for x in range(WIDTH):
            fire[base + x] = max(0, fire[base + x] - rng.randint(4, 9))
        for _ in range(STEPS_PER_FRAME):
            spread(fire, rng)
        frames.append(to_image(fire))

    for i, frame in enumerate(frames, start=1):
        frame.save(OUT / f"fire-{i:02d}.png")
    print(f"{len(frames)} fire frames in {OUT}")


if __name__ == "__main__":
    main()
