"""Recadre les photos cliniques en détectant le mur uniforme.

Réutilise l'algo calibré sur le dossier GALS (même salle, même mur clair).
Exclut les schémas anatomiques et les PNGs composites déjà retravaillés.
"""

from PIL import Image, ImageStat
from pathlib import Path

SOURCE_DIR = Path(__file__).parent
OUT_DIR = SOURCE_DIR / "cropped"
OUT_DIR.mkdir(exist_ok=True)

STDDEV_LOW = 22
STDDEV_HIGH = 28
MARGIN_PCT = 0.08
STEP = 4

# Photos cliniques 4928×3264 — toutes prises dans la même salle
TARGETS = [
    "Flexion de la hanche contre résistance.jpg",
    "Log roll test.jpg",
    "Manœuvre de FABER.jpg",
    "Manœuvre de FADIR.jpg",
    "Manœuvre de Gaenslen.jpg",
    "Manœuvre de Mennel.jpg",
    "Palpation des épines iliaques antéro-supérieures.jpg",
]


def find_content_bounds(img: Image.Image, low: float, high: float, step: int):
    gray = img.convert("L")
    hsv_sat = img.convert("HSV").getchannel("S")  # canal saturation
    w, h = gray.size

    # Analyse uniquement la zone centrale des lignes (15%-85% horizontal)
    # pour ignorer objets marginaux. Combine stddev + range : le range
    # capture les transitions claires/claires (peau→table) mieux que stddev.
    side_margin = int(w * 0.15)
    ROW_RANGE_THRESHOLD = 60

    def row_has_content(g, y, gw):
        band = g.crop((side_margin, y, gw - side_margin, y + 1))
        if ImageStat.Stat(band).stddev[0] > low:
            return True
        lo, hi = band.getextrema()
        return (hi - lo) > ROW_RANGE_THRESHOLD

    top = 0
    for y in range(0, h, step):
        if row_has_content(gray, y, w):
            top = max(0, y - step)
            break
    bottom = h
    for y in range(h - 1, -1, -step):
        if row_has_content(gray, y, w):
            bottom = min(h, y + step)
            break

    sub_gray = gray.crop((0, top, w, bottom))
    sub_sat = hsv_sat.crop((0, top, w, bottom))
    sub_h = bottom - top
    n_windows = 10
    win_h = sub_h // n_windows
    DARK_MEAN = 80
    BAND = 8
    RANGE_THRESHOLD = 70
    SAT_THRESHOLD = 70  # pixel coloré (flèche orange/jaune moins saturée)
    MIN_MATCHING_WINDOWS = 3

    def col_has_content(x: int) -> bool:
        x0 = max(0, x - BAND // 2)
        x1 = min(w, x0 + BAND)
        gcol = sub_gray.crop((x0, 0, x1, sub_h))
        scol = sub_sat.crop((x0, 0, x1, sub_h))
        n_match = 0
        for i in range(n_windows):
            gw_ = gcol.crop((0, i * win_h, x1 - x0, (i + 1) * win_h))
            sw_ = scol.crop((0, i * win_h, x1 - x0, (i + 1) * win_h))
            # Détection par saturation : pixel coloré présent → flèche
            if sw_.getextrema()[1] > SAT_THRESHOLD:
                n_match += 1
                continue
            stat = ImageStat.Stat(gw_)
            if stat.mean[0] < DARK_MEAN:
                continue
            lo, hi = gw_.getextrema()
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
    raw_box = find_content_bounds(img, STDDEV_LOW, STDDEV_HIGH, STEP)
    rw, rh = raw_box[2] - raw_box[0], raw_box[3] - raw_box[1]

    # Garde sur la box DÉTECTÉE (avant marge) : la marge peut gonfler
    # artificiellement et masquer un échec de détection.
    max_ratio = max(rw / w, rh / h)
    area_ratio = (rw * rh) / (w * h)
    too_aggressive = max_ratio < 0.5 or area_ratio < 0.20

    box = add_margin(raw_box, w, h, MARGIN_PCT)
    bw, bh = box[2] - box[0], box[3] - box[1]
    saved_pct = 100 * (1 - (bw * bh) / (w * h))
    if too_aggressive:
        print(f"  ⚠ {filename}  crop suspect ({saved_pct:.0f}% perdus) — ignoré")
        return

    # Si réduction négligeable, ne rien sauvegarder
    if saved_pct < 3:
        print(f"  · {filename}  déjà serré ({saved_pct:.1f}%) — ignoré")
        return

    cropped = img.crop(box)
    out_path = OUT_DIR / filename
    cropped.save(out_path, quality=92)
    cw, ch = cropped.size
    print(f"  ✓ {filename}  {w}x{h} → {cw}x{ch}  (-{saved_pct:.1f}%)")


if __name__ == "__main__":
    print(f"Sortie : {OUT_DIR}")
    for name in TARGETS:
        process(name)
