"""Draws the intro's placeholder pixel art: the wall with the fresh "VANDAL" tag and, on request,
a placeholder cop. Same grid as the player sprites (50x50, dark outline, facing right), so an
artist can redraw these PNGs by hand later and keep the file names.

    python3 scripts/make-intro-sprites.py                      # the wall and the tag
    python3 scripts/make-intro-sprites.py --placeholder-cop    # also the old placeholder cop

Writes src/assets/sprites/intro/*.png, and src/assets/sprites/cop/*.png with --placeholder-cop
(that replaces the cop art imported with scripts/import-sprite-sheet.py). Needs Pillow.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
COP_DIR = ROOT / "src/assets/sprites/cop"
INTRO_DIR = ROOT / "src/assets/sprites/intro"

OUTLINE = (14, 11, 22, 255)
NAVY_DARK = (22, 32, 64, 255)
NAVY = (36, 55, 104, 255)
NAVY_LIGHT = (64, 94, 164, 255)
PANTS = (26, 34, 64, 255)
PANTS_FAR = (18, 24, 46, 255)
SHIRT = (143, 179, 232, 255)
SKIN = (217, 154, 108, 255)
SKIN_SHADE = (176, 116, 74, 255)
HAIR = (58, 36, 24, 255)
GOLD = (255, 210, 63, 255)
SHOE = (14, 11, 22, 255)
SHADOW = (5, 4, 3, 255)

SIZE = 50
HIP = (24, 32)
NEAR_SHOULDER = (27, 21)
FAR_SHOULDER = (21, 21)


def limb(draw, points, color, width):
    """A limb with its own outline, so it reads on top of the body."""
    draw.line(points, fill=OUTLINE, width=width + 2, joint="curve")
    draw.line(points, fill=color, width=width, joint="curve")


def foot(draw, x, y, color=SHOE):
    draw.rectangle([x - 2, y - 2, x + 3, y], fill=OUTLINE)
    draw.rectangle([x - 1, y - 1, x + 2, y - 1], fill=color)


def hand(draw, x, y):
    draw.rectangle([x - 1, y - 1, x + 1, y + 1], fill=OUTLINE)
    draw.point((x, y), fill=SKIN)


def leg(draw, knee, foot_at, near):
    color = PANTS if near else PANTS_FAR
    limb(draw, [HIP, knee, foot_at], color, 4 if near else 3)
    foot(draw, foot_at[0], foot_at[1] + 1)


def arm(draw, shoulder, elbow, hand_at, near):
    color = NAVY if near else NAVY_DARK
    limb(draw, [shoulder, elbow, hand_at], color, 3 if near else 2)
    hand(draw, *hand_at)


def body(draw, bob=0, shout=False):
    y = bob
    # torso
    draw.rectangle([17, 17 + y, 32, 32 + y], fill=OUTLINE)
    draw.rectangle([18, 18 + y, 31, 31 + y], fill=NAVY)
    draw.rectangle([18, 18 + y, 19, 31 + y], fill=NAVY_DARK)
    draw.rectangle([30, 19 + y, 31, 29 + y], fill=NAVY_LIGHT)
    # shirt collar and badge
    draw.polygon([(24, 18 + y), (28, 18 + y), (26, 21 + y)], fill=SHIRT)
    draw.rectangle([28, 22 + y, 29, 23 + y], fill=GOLD)
    # belt and buckle
    draw.rectangle([18, 30 + y, 31, 31 + y], fill=OUTLINE)
    draw.rectangle([26, 30 + y, 27, 31 + y], fill=GOLD)
    # neck and head
    draw.rectangle([23, 16 + y, 27, 18 + y], fill=SKIN_SHADE)
    draw.rectangle([20, 7 + y, 31, 17 + y], fill=OUTLINE)
    draw.rectangle([21, 8 + y, 30, 16 + y], fill=SKIN)
    draw.rectangle([21, 8 + y, 23, 13 + y], fill=HAIR)  # back of the head
    draw.point((22, 12 + y), fill=SKIN_SHADE)  # ear
    draw.point((31, 12 + y), fill=SKIN)  # nose
    draw.point((28, 11 + y), fill=OUTLINE)  # eye
    draw.line([(27, 9 + y), (29, 9 + y)], fill=HAIR)  # angry brow
    if shout:
        draw.rectangle([28, 14 + y, 29, 15 + y], fill=OUTLINE)
    else:
        draw.line([(28, 15 + y), (29, 15 + y)], fill=OUTLINE)
    # cap with a gold badge and a black visor
    draw.rectangle([19, 3 + y, 31, 8 + y], fill=OUTLINE)
    draw.rectangle([20, 4 + y, 30, 7 + y], fill=NAVY_DARK)
    draw.rectangle([21, 4 + y, 29, 5 + y], fill=NAVY)
    draw.rectangle([25, 5 + y, 26, 6 + y], fill=GOLD)
    draw.rectangle([29, 7 + y, 35, 8 + y], fill=OUTLINE)


def shadow(draw):
    draw.line([(13, 48), (37, 48)], fill=SHADOW)


def frame(pose):
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    shadow(d)
    pose(d)
    return im


# Leg poses around the hip: contact (one leg forward, one back) and passing (one under the body,
# one swinging). The near leg alternates, so the four frames make a full stride.
CONTACT_FWD = ((29, 38), (34, 45))
CONTACT_BACK = ((20, 39), (15, 44))
PASS_SUPPORT = ((25, 40), (25, 46))
PASS_SWING = ((29, 36), (26, 41))


def arm_pose(shoulder, kind):
    sx, sy = shoulder
    if kind == "fwd":
        return (sx + 5, sy + 3), (sx + 8, sy)
    if kind == "back":
        return (sx - 4, sy + 5), (sx - 7, sy + 8)
    return (sx + 1, sy + 5), (sx + 3, sy + 8)


def run_frame(near_leg, far_leg, near_arm, far_arm, bob):
    def pose(d):
        arm(d, (FAR_SHOULDER[0], FAR_SHOULDER[1] + bob), *arm_pose((FAR_SHOULDER[0], FAR_SHOULDER[1] + bob), far_arm), near=False)
        leg(d, far_leg[0], far_leg[1], near=False)
        body(d, bob)
        leg(d, near_leg[0], near_leg[1], near=True)
        arm(d, (NEAR_SHOULDER[0], NEAR_SHOULDER[1] + bob), *arm_pose((NEAR_SHOULDER[0], NEAR_SHOULDER[1] + bob), near_arm), near=True)

    return frame(pose)


def shout_frame():
    def pose(d):
        arm(d, FAR_SHOULDER, (18, 26), (21, 29), near=False)
        leg(d, (22, 40), (20, 46), near=False)
        body(d, 0, shout=True)
        leg(d, (27, 40), (29, 46), near=True)
        arm(d, NEAR_SHOULDER, (32, 21), (37, 19), near=True)  # pointing at the player

    return frame(pose)


def catch_frame():
    def pose(d):
        arm(d, FAR_SHOULDER, (27, 22), (34, 21), near=False)
        leg(d, CONTACT_BACK[0], CONTACT_BACK[1], near=False)
        body(d, 1, shout=True)
        leg(d, CONTACT_FWD[0], CONTACT_FWD[1], near=True)
        arm(d, NEAR_SHOULDER, (32, 24), (37, 23), near=True)  # grabbing

    return frame(pose)


# ---- wall with the tag ----
FONT = {
    "V": ["X...X", "X...X", "X...X", "X...X", ".X.X.", ".X.X.", "..X.."],
    "A": [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
    "N": ["X...X", "XX..X", "X.X.X", "X..XX", "X...X", "X...X", "X...X"],
    "D": ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
    "L": ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
}
TAG_TOP = (255, 77, 157, 255)
TAG_BOTTOM = (255, 210, 63, 255)


def tag_image(word="VANDAL"):
    cell = 2
    bounce = [0, -1, 1, 0, -1, 1]
    width = len(word) * (5 * cell + 2) + 4
    height = 7 * cell + 12
    im = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    fill = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for i, letter in enumerate(word):
        ox = 2 + i * (5 * cell + 2)
        oy = 3 + bounce[i % len(bounce)]
        for r, row in enumerate(FONT[letter]):
            for c, on in enumerate(row):
                if on == "X":
                    t = r / 6
                    color = tuple(int(TAG_TOP[k] + (TAG_BOTTOM[k] - TAG_TOP[k]) * t) for k in range(3)) + (255,)
                    for dy in range(cell):
                        for dx in range(cell):
                            fill.putpixel((ox + c * cell + dx, oy + r * cell + dy), color)
        # drips under some letters
        if letter in "AD":
            x = ox + (cell * 4 if letter == "A" else cell)
            for dy in range(4 + i % 3):
                fill.putpixel((x, oy + 7 * cell + dy), TAG_BOTTOM)
    # 1px outline around the letters
    px = fill.load()
    out = im.load()
    for y in range(height):
        for x in range(width):
            if px[x, y][3]:
                out[x, y] = px[x, y]
            elif any(
                0 <= x + dx < width and 0 <= y + dy < height and px[x + dx, y + dy][3]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1))
            ):
                out[x, y] = OUTLINE
    return im


def wall_image(width=110, height=62):
    im = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    brick = (122, 58, 62, 255)
    brick_dark = (96, 42, 48, 255)
    mortar = (66, 34, 42, 255)
    d.rectangle([0, 0, width - 1, height - 1], fill=mortar)
    for row, y in enumerate(range(1, height - 3, 6)):
        offset = 0 if row % 2 else 6
        for x in range(-offset, width, 12):
            color = brick if (x // 12 + row) % 3 else brick_dark
            d.rectangle([max(0, x + 1), y, min(width - 2, x + 11), y + 4], fill=color)
    # cap stones on top and a darker base
    d.rectangle([0, 0, width - 1, 2], fill=(150, 146, 160, 255))
    d.rectangle([0, height - 4, width - 1, height - 1], fill=(52, 28, 36, 255))
    d.rectangle([0, 0, width - 1, height - 1], outline=OUTLINE)
    return im


def main():
    INTRO_DIR.mkdir(parents=True, exist_ok=True)
    if "--placeholder-cop" in sys.argv:
        COP_DIR.mkdir(parents=True, exist_ok=True)
        frames = [
            run_frame((CONTACT_FWD), (CONTACT_BACK), "back", "fwd", 1),
            run_frame((PASS_SUPPORT), (PASS_SWING), "mid", "mid", 0),
            run_frame((CONTACT_BACK), (CONTACT_FWD), "fwd", "back", 1),
            run_frame((PASS_SWING), (PASS_SUPPORT), "mid", "mid", 0),
        ]
        for i, im in enumerate(frames, start=1):
            im.save(COP_DIR / f"cop-run-{i}.png")
        shout_frame().save(COP_DIR / "cop-shout.png")
        catch_frame().save(COP_DIR / "cop-catch.png")
        print("cop:", sorted(p.name for p in COP_DIR.glob("*.png")))
    wall_image().save(INTRO_DIR / "wall.png")
    tag_image().save(INTRO_DIR / "tag.png")
    print("intro:", sorted(p.name for p in INTRO_DIR.glob("*.png")))


if __name__ == "__main__":
    main()
