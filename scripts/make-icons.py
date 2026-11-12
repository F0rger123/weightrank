"""Draw WeightRank's app icons: a lime rank shield with a cut-out double chevron.

Drawn at 4x and downsampled for clean edges. Run: python scripts/make-icons.py (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BG = (7, 8, 10, 255)
LIME = (200, 255, 61, 255)
LIME2 = (139, 234, 28, 255)
OUT = Path(__file__).resolve().parent.parent / "assets"
PUB = Path(__file__).resolve().parent.parent / "public"
S = 1024
K = 4  # supersampling


def shield_points(cx, cy, w):
    h = w * 1.16
    top = cy - h / 2
    return [
        (cx, top),
        (cx + w / 2, top + h * 0.16),
        (cx + w / 2, top + h * 0.52),
        (cx + w * 0.30, top + h * 0.80),
        (cx, top + h),
        (cx - w * 0.30, top + h * 0.80),
        (cx - w / 2, top + h * 0.52),
        (cx - w / 2, top + h * 0.16),
    ]


def chevron(cx, top, w, t):
    return [(cx - w / 2, top + w * 0.5), (cx, top), (cx + w / 2, top + w * 0.5),
            (cx + w / 2, top + w * 0.5 + t), (cx, top + t), (cx - w / 2, top + w * 0.5 + t)]


def gradient(size, c1, c2):
    g = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(g)
    for y in range(size):
        f = y / size
        d.line([(0, y), (size, y)], fill=tuple(int(c1[i] * (1 - f) + c2[i] * f) for i in range(4)))
    return g


def mark(scale: float, color=None, bg=None, glow=False) -> Image.Image:
    n = S * K
    img = Image.new("RGBA", (n, n), bg or (0, 0, 0, 0))
    w = n * scale
    cx, cy = n / 2, n / 2
    full = Image.new("L", (n, n), 0)
    ImageDraw.Draw(full).polygon(shield_points(cx, cy, w), fill=255)
    cut = Image.new("L", (n, n), 0)
    cd = ImageDraw.Draw(cut)
    cw, t = w * 0.56, w * 0.15
    cd.polygon(chevron(cx, cy - w * 0.36, cw, t), fill=255)
    cd.polygon(chevron(cx, cy - w * 0.08, cw, t), fill=255)
    mask = Image.composite(Image.new("L", (n, n), 0), full, cut)
    if glow:
        halo = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        halo.paste((*LIME[:3], 110), (0, 0), full.filter(ImageFilter.GaussianBlur(n * 0.04)))
        img = Image.alpha_composite(img, halo)
        img.paste(bg or BG, (0, 0), cut)  # keep the chevrons crisp black, not glowing
    fill = gradient(n, LIME, LIME2) if color is None else Image.new("RGBA", (n, n), color)
    img.paste(fill, (0, 0), mask)
    return img.resize((S, S), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    PUB.mkdir(exist_ok=True)
    icon = mark(0.58, bg=BG, glow=True)
    icon.save(OUT / "icon.png")
    mark(0.46).save(OUT / "android-icon-foreground.png")  # inside the adaptive-icon safe zone
    Image.new("RGBA", (S, S), BG).save(OUT / "android-icon-background.png")
    mark(0.46, color=(255, 255, 255, 255)).save(OUT / "android-icon-monochrome.png")
    mark(0.5).save(OUT / "splash-icon.png")
    icon.convert("RGB").resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
    for size in (180, 192, 512):
        icon.convert("RGB").resize((size, size), Image.LANCZOS).save(PUB / f"icon-{size}.png")


if __name__ == "__main__":
    main()
