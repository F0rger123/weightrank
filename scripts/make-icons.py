"""Draw WeightRank's app icons: two stacked lime chevrons (rank up) on near-black.

Run: python scripts/make-icons.py  (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

BG = (11, 13, 16, 255)
LIME = (200, 255, 61, 255)
OUT = Path(__file__).resolve().parent.parent / "assets"
S = 1024


def chevrons(draw: ImageDraw.ImageDraw, size: int, color, scale: float):
    """Two upward chevrons, centered, occupying `scale` of the canvas."""
    w = size * scale
    cx, cy = size / 2, size / 2 - w * 0.11  # visual centre of the pair
    thick = w * 0.22
    for i, dy in enumerate((-w * 0.2, w * 0.2)):
        top = cy + dy - w * 0.25
        pts = [
            (cx - w / 2, top + w * 0.5),
            (cx, top),
            (cx + w / 2, top + w * 0.5),
            (cx + w / 2, top + w * 0.5 + thick),
            (cx, top + thick),
            (cx - w / 2, top + w * 0.5 + thick),
        ]
        # Lower chevron is a darker shade (solid, so it reads on any background).
        c = color if i == 0 else tuple([int(v * 0.55) for v in color[:3]] + [color[3]])
        draw.polygon(pts, fill=c)


def layer(scale: float, color, bg=None) -> Image.Image:
    img = Image.new("RGBA", (S, S), bg or (0, 0, 0, 0))
    chevrons(ImageDraw.Draw(img), S, color, scale)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    layer(0.56, LIME, BG).save(OUT / "icon.png")
    layer(0.42, LIME).save(OUT / "android-icon-foreground.png")  # inside the adaptive safe zone
    Image.new("RGBA", (S, S), BG).save(OUT / "android-icon-background.png")
    layer(0.42, (255, 255, 255, 255)).save(OUT / "android-icon-monochrome.png")
    layer(0.5, LIME).save(OUT / "splash-icon.png")
    layer(0.6, LIME, BG).resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")


if __name__ == "__main__":
    main()
