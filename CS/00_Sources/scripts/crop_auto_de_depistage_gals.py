"""Recadre les images en détectant les bandes uniformes (mur/table) via la variance.

Stratégie : pour chaque ligne/colonne, on calcule l'écart-type des pixels en
niveaux de gris. Une bande sous le seuil = bande "vide" à supprimer.
On garde la plus grande boîte englobant les bandes "non vides", puis on ajoute
une marge de sécurité pour ne pas couper le sujet.
"""

from PIL import Image, ImageStat
from pathlib import Path

SOURCE_DIR = Path(__file__).parent
OUT_DIR = SOURCE_DIR / "cropped"
OUT_DIR.mkdir(exist_ok=True)

# Seuil bas : détecte tout ce qui n'est pas mur lisse (utilisé pour haut/bas)
STDDEV_LOW = 22
# Seuil haut : ignore les artefacts isolés (prises électriques) et ne déclenche
# que sur le sujet (peau, vêtements). Utilisé pour gauche/droite.
STDDEV_HIGH = 28
# Marge de sécurité ajoutée autour du contenu détecté (en % de la dimension)
MARGIN_PCT = 0.05
# Pas d'échantillonnage (1 pixel sur N) pour accélérer
STEP = 4

TARGETS = [
    "Inspection de la marche.jpg",
    "Mobilisation de la colonne cervicale.jpg",
    "Compression des métatarses.jpg",
]


def find_content_bounds(img: Image.Image, low: float, high: float, step: int):
    """Crop en deux passes : d'abord vertical, puis horizontal par fenêtres.

    Pour le crop horizontal, on découpe chaque colonne en N fenêtres
    verticales et on prend le MAX de stddev en ignorant les fenêtres trop
    sombres (sol, ombres). Cela isole le contenu "clair" (sujet sur mur)
    sans être pollué par les transitions vers le sol noir.
    """
    gray = img.convert("L")
    w, h = gray.size

    def row_stddev(g, y, gw):
        return ImageStat.Stat(g.crop((0, y, gw, y + 1))).stddev[0]

    top = 0
    for y in range(0, h, step):
        if row_stddev(gray, y, w) > low:
            top = max(0, y - step)
            break
    bottom = h
    for y in range(h - 1, -1, -step):
        if row_stddev(gray, y, w) > low:
            bottom = min(h, y + step)
            break

    sub_gray = gray.crop((0, top, w, bottom))
    sub_h = bottom - top
    n_windows = 10
    win_h = sub_h // n_windows
    DARK_MEAN = 80   # ignorer fenêtres trop sombres (sol noir)
    BAND = 8         # largeur de bande analysée (filtrage du bruit JPEG)
    RANGE_THRESHOLD = 70  # max-min pour considérer "contenu présent"

    MIN_MATCHING_WINDOWS = 3  # sujet étendu sur ≥3 fenêtres ; prise → 1-2

    def col_has_content(x: int) -> bool:
        x0 = max(0, x - BAND // 2)
        x1 = min(w, x0 + BAND)
        col = sub_gray.crop((x0, 0, x1, sub_h))
        n_match = 0
        for i in range(n_windows):
            win = col.crop((0, i * win_h, x1 - x0, (i + 1) * win_h))
            stat = ImageStat.Stat(win)
            if stat.mean[0] < DARK_MEAN:
                continue
            lo, hi = win.getextrema()
            if hi - lo > RANGE_THRESHOLD:
                n_match += 1
        return n_match >= MIN_MATCHING_WINDOWS

    left = 0
    for x in range(0, w, step):
        if col_has_content(x):
            left = max(0, x - step)
            break
    right = w
    for x in range(w - 1, -1, -step):
        if col_has_content(x):
            right = min(w, x + step)
            break

    return left, top, right, bottom


def add_margin(box, w, h, pct):
    left, top, right, bottom = box
    mx = int(w * pct)
    my = int(h * pct)
    return (
        max(0, left - mx),
        max(0, top - my),
        min(w, right + mx),
        min(h, bottom + my),
    )


def process(filename: str):
    src = SOURCE_DIR / filename
    if not src.exists():
        print(f"  ✗ introuvable: {filename}")
        return

    img = Image.open(src)
    w, h = img.size
    box = find_content_bounds(img, STDDEV_LOW, STDDEV_HIGH, STEP)
    box = add_margin(box, w, h, MARGIN_PCT)
    cropped = img.crop(box)

    out_path = OUT_DIR / filename
    cropped.save(out_path, quality=92)

    cw, ch = cropped.size
    saved_pct = 100 * (1 - (cw * ch) / (w * h))
    print(f"  ✓ {filename}")
    print(f"    {w}x{h} → {cw}x{ch}  (-{saved_pct:.1f}% surface)")
    print(f"    box={box}")


if __name__ == "__main__":
    print(f"Sortie : {OUT_DIR}")
    for name in TARGETS:
        process(name)
