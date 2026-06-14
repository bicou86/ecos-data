#!/usr/bin/env python3
"""
ECOS Pocketcards → Anki (.apkg) exporter.

Reads the YAML pocketcards in ../../data/*.yaml and produces a single Anki
deck package with the "atomic + cloze" study style:

  - red_flags / dd_top5 / score_interpretation  → atomic Q/A cards
  - prose sections (anamnèse, examen, PEC, pièges…) → one Q/A card per section
  - single-line items carrying a {r:…} (valeur/traitement) or {s:…} (signe) token
    → cloze cards (the key value/sign is hidden)

Design notes
------------
* Semantic colour tokens {s|p|t|r|e:…} are rendered to coloured <span>s, in
  parity with the Node renderer (src/render.js → SEM_CLASS + assets/card.css).
* Decks are organised by discipline:  "ECOS Pocketcards::<Discipline>".
* GUIDs and deck/model IDs are DETERMINISTIC (content-stable), so re-running the
  build and re-importing the .apkg UPDATES existing notes instead of duplicating
  them — your Anki review scheduling is preserved across rebuilds.
* Images / diagrams are NOT embedded in v1 (their assets live in the gitignored
  dist/ tree produced by the Node build). A "📎 <légende>" marker is appended so
  the reference is not silently lost. Media embedding is a documented TODO.

This is a standalone Python tool — it does NOT require the Node build toolchain.

Usage
-----
    python3 build_anki.py                 # build everything → dist/anki/
    python3 build_anki.py --status ready  # only status: ready cards
    python3 build_anki.py --out /tmp/x.apkg
"""

from __future__ import annotations

import argparse
import hashlib
import html as _html
import re
import sys
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:
    sys.exit("Missing dependency: pyyaml.  pip install -r requirements.txt")
try:
    import genanki
except ModuleNotFoundError:
    sys.exit("Missing dependency: genanki.  pip install -r requirements.txt")


# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
HERE = Path(__file__).resolve().parent
POCKETCARDS_ROOT = HERE.parent.parent          # …/CS/Pocketcards
DATA_DIR = POCKETCARDS_ROOT / "data"
DEFAULT_OUT = POCKETCARDS_ROOT / "dist" / "anki" / "ECOS-Pocketcards.apkg"


# --------------------------------------------------------------------------- #
# Semantic token rendering — port of src/render.js (formatItem + SEM_CLASS)
# --------------------------------------------------------------------------- #
SEM_CLASS = {
    "s": "sem-symptom",     # signe / symptôme   (rose)
    "p": "sem-pathology",   # pathologie / dx    (rouge)
    "t": "sem-test",        # test / examen      (vert)
    "r": "sem-treatment",   # traitement/valeur  (ambre)
    "e": "sem-state",       # état               (brun)
}
TOKEN_RE = re.compile(r"\{([sprte]):([^}]+)\}")
BULLET_RE = re.compile(r"^[•\-]\s")
LEAD_RE = re.compile(r"^([^:,\n]{1,40}):\s+(.+)$")
# Tokens we hide as cloze deletions in the "atomic + cloze" style:
CLOZE_TOKENS = {"r", "s"}


def escape_html(s) -> str:
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _span(token_type: str, content: str) -> str:
    return f'<span class="{SEM_CLASS[token_type]}">{content}</span>'


def colorize(escaped: str) -> str:
    """Replace {x:…} tokens with coloured spans (no cloze)."""
    return TOKEN_RE.sub(lambda m: _span(m.group(1), m.group(2)), escaped)


def inline(text) -> str:
    """Escape + colourise + turn newlines into <br>. For short inline strings."""
    if text is None:
        return ""
    return colorize(escape_html(text)).replace("\n", "<br>")


def format_item(text) -> str:
    """Faithful port of formatItem() in src/render.js, with \\n→<br> fallback."""
    if text is None:
        return ""
    colored = colorize(escape_html(text))

    if "\n" in colored:
        lines = colored.split("\n")
        lead = lines[0]
        bullets = [l for l in lines[1:] if BULLET_RE.match(l)]
        if len(bullets) >= 2:
            items = "".join(f"<li>{BULLET_RE.sub('', b)}</li>" for b in bullets)
            return f'<strong>{lead}</strong><ul class="nested-bullets">{items}</ul>'

    m = LEAD_RE.match(colored)
    if m:
        return f"<strong>{m.group(1)}:</strong> {m.group(2)}"

    return colored.replace("\n", "<br>")


def render_list(items) -> str:
    """Render a list of strings as a <ul> of formatted items."""
    items = [i for i in (items or []) if i is not None and str(i).strip()]
    if not items:
        return ""
    lis = "".join(f"<li>{format_item(i)}</li>" for i in items)
    return f"<ul>{lis}</ul>"


def format_cloze(text) -> tuple[str, int]:
    """
    Render a single-line item, turning {r:…}/{s:…} tokens into cloze deletions
    (other tokens stay coloured). Returns (html, n_clozes).
    """
    counter = {"n": 0}

    def repl(m):
        ttype, content = m.group(1), m.group(2)
        span = _span(ttype, content)
        if ttype in CLOZE_TOKENS:
            counter["n"] += 1
            n = counter["n"]
            # cap explosion: beyond 4 distinct gaps, collapse remaining into c1
            idx = n if n <= 4 else 1
            return "{{c%d::%s}}" % (idx, span)
        return span

    out = TOKEN_RE.sub(repl, escape_html(text))
    return out, counter["n"]


def is_single_line(text) -> bool:
    return text is not None and "\n" not in str(text)


# --------------------------------------------------------------------------- #
# Deterministic IDs
# --------------------------------------------------------------------------- #
def stable_id(key: str) -> int:
    """Stable positive 31-bit-ish int from a string (deck IDs)."""
    return int(hashlib.sha1(key.encode("utf-8")).hexdigest()[:9], 16)


def slug(s: str) -> str:
    return re.sub(r"\s+", "_", str(s).strip())


# Hardcoded, never-changing model IDs (changing them orphans existing cards).
MODEL_QA_ID = 1788000111
MODEL_CLOZE_ID = 1788000222

DECK_ROOT = "ECOS Pocketcards"


# --------------------------------------------------------------------------- #
# Anki models
# --------------------------------------------------------------------------- #
CARD_CSS = """
.card { font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
        font-size: 17px; line-height: 1.5; color: #1e293b; background: #f8fafc;
        text-align: left; padding: 4px 8px; }
.nightMode.card { color: #e2e8f0; background: #0f172a; }
.front-prompt { font-weight: 600; }
ul { margin: 6px 0; padding-left: 20px; }
li { margin: 3px 0; }
.nested-bullets { margin: 4px 0 6px 8px; list-style: square; }
.nested-bullets li { font-size: 0.95em; }
strong { font-weight: 700; }
.freq { display: inline-block; margin-top: 6px; font-size: 0.8em;
        text-transform: uppercase; letter-spacing: .5px; color: #b45309; }
.ctx { margin-top: 12px; font-size: 0.72em; color: #94a3b8;
       font-family: ui-monospace, SFMono-Regular, monospace; }
.media-ref { margin-top: 8px; font-size: 0.85em; color: #64748b; font-style: italic; }
hr#answer { border: none; border-top: 1px solid #cbd5e1; margin: 10px 0; }

/* Semantic word-level colour coding (parity with assets/card.css) */
.sem-symptom   { color:#9d174d; background:#fce7f3; padding:1px 5px; border-radius:3px; font-weight:600; }
.sem-pathology { color:#991b1b; background:#fee2e2; padding:1px 5px; border-radius:3px; font-weight:600; }
.sem-test      { color:#065f46; background:#d1fae5; padding:1px 5px; border-radius:3px; font-weight:600; }
.sem-treatment { color:#854d0e; background:#fef3c7; padding:1px 5px; border-radius:3px; font-weight:600; }
.sem-state     { color:#78350f; background:#fed7aa; padding:1px 5px; border-radius:3px; font-weight:600; }
.cloze { font-weight: 700; color: #2563eb; }
.nightMode .cloze { color: #93c5fd; }
"""

QA_MODEL = genanki.Model(
    MODEL_QA_ID,
    "ECOS Pocketcard Q/A",
    fields=[{"name": "Front"}, {"name": "Back"}, {"name": "Context"}],
    templates=[{
        "name": "Q/A",
        "qfmt": '<div class="front-prompt">{{Front}}</div>',
        "afmt": '{{FrontSide}}<hr id="answer">{{Back}}<div class="ctx">{{Context}}</div>',
    }],
    css=CARD_CSS,
)

CLOZE_MODEL = genanki.Model(
    MODEL_CLOZE_ID,
    "ECOS Pocketcard Cloze",
    fields=[{"name": "Text"}, {"name": "Context"}],
    templates=[{
        "name": "Cloze",
        "qfmt": "{{cloze:Text}}",
        "afmt": '{{cloze:Text}}<div class="ctx">{{Context}}</div>',
    }],
    model_type=genanki.Model.CLOZE,
    css=CARD_CSS,
)


# --------------------------------------------------------------------------- #
# Note assembly
# --------------------------------------------------------------------------- #
SECTION_LABEL = {
    "anamnese.socrates": "Anamnèse — SOCRATES",
    "anamnese.specifique": "Anamnèse — Spécifique",
    "anamnese.atcd": "Anamnèse — Antécédents",
    "examen.general": "Examen — Général",
    "examen.cible": "Examen — Ciblé",
    "pec.immediate": "PEC initiale — Immédiate",
    "pec.orientation": "PEC initiale — Orientation",
    "examens_complementaires": "Examens complémentaires",
    "criteres_hospitalisation": "Critères d'hospitalisation",
    "pieges": "Pièges classiques",
    "red_flags": "Red flags",
    "dd_top5": "Diagnostics différentiels",
    "anamnese_appareil": "Anamnèse par appareil",
    "manoeuvres": "Manœuvres",
    "echelles": "Échelles",
    "quand_utiliser": "Indications",
    "items": "Items / cotation",
    "limites": "Limites",
    "score": "Interprétation du score",
}


class NoteBuilder:
    def __init__(self):
        self.specs = []  # list of dicts

    def context(self, card, label):
        return f"{card['id']} · {card.get('discipline', '?')} · {label}"

    def media_marker(self, card, section):
        """Append a 'see figure' marker if the section carries images/diagrams."""
        bits = []
        for img in (card.get("images") or {}).get(section, []) or []:
            bits.append(img.get("legend") or img.get("file", "figure"))
        for d in (card.get("diagrams") or {}).get(section, []) or []:
            bits.append(d.get("caption") or d.get("id", "schéma"))
        if not bits:
            return ""
        return '<div class="media-ref">📎 ' + " · ".join(escape_html(b) for b in bits) + "</div>"

    def qa(self, card, section, key, front, back):
        if not back or not str(back).strip():
            return
        self.specs.append({
            "model": "qa", "card": card, "section": section,
            "guid_key": f"{card['id']}|{section}|qa|{key}",
            "fields": [front, back, self.context(card, SECTION_LABEL.get(section, section))],
        })

    def cloze(self, card, section, key, text):
        if not is_single_line(text):
            return
        html, n = format_cloze(text)
        if n == 0:
            return
        self.specs.append({
            "model": "cloze", "card": card, "section": section,
            "guid_key": f"{card['id']}|{section}|cz|{key}",
            "fields": [html, self.context(card, SECTION_LABEL.get(section, section))],
        })

    def section_qa(self, card, section, prompt, items):
        """One Q/A card whose back is a rendered <ul> of items."""
        body = render_list(items)
        if not body:
            return
        body += self.media_marker(card, section)
        self.qa(card, section, "list", prompt, body)

    def scan_cloze(self, card, section, items):
        for i, it in enumerate(items or []):
            self.cloze(card, section, i, it)


def build_ssp(nb: NoteBuilder, card: dict):
    title = card["title"]
    an = card.get("anamnese") or {}
    for sub in ("socrates", "specifique", "atcd"):
        sec = f"anamnese.{sub}"
        nb.section_qa(card, sec, f"{title} — {SECTION_LABEL[sec]} ?", an.get(sub))
        nb.scan_cloze(card, sec, an.get(sub))

    ex = card.get("examen") or {}
    for sub in ("general", "cible"):
        sec = f"examen.{sub}"
        nb.section_qa(card, sec, f"{title} — {SECTION_LABEL[sec]} ?", ex.get(sub))
        nb.scan_cloze(card, sec, ex.get(sub))

    for i, rf in enumerate(card.get("red_flags") or []):
        front = f'{title} — 🚩 Red flag :<br>« {inline(rf.get("description"))} »'
        back = (f'→ Suspecter : {inline(rf.get("dx_suspecte"))}'
                f'<br>→ Action : {inline(rf.get("action"))}')
        nb.qa(card, "red_flags", i, front, back)

    for i, dd in enumerate(card.get("dd_top5") or []):
        front = f'{title} — DD : indices évocateurs de « {inline(dd.get("dx"))} » ?'
        back = inline(dd.get("indices"))
        if dd.get("freq"):
            back += f'<div class="freq">Fréquence : {inline(dd.get("freq"))}</div>'
        nb.qa(card, "dd_top5", i, front, back)

    pec = card.get("pec_initiale") or {}
    for sub in ("immediate", "orientation"):
        sec = f"pec.{sub}"
        nb.section_qa(card, sec, f"{title} — {SECTION_LABEL[sec]} ?", pec.get(sub))
        nb.scan_cloze(card, sec, pec.get(sub))

    for sec in ("examens_complementaires", "criteres_hospitalisation", "pieges"):
        nb.section_qa(card, sec, f"{title} — {SECTION_LABEL[sec]} ?", card.get(sec))
        if sec != "pieges":
            nb.scan_cloze(card, sec, card.get(sec))


def build_sys(nb: NoteBuilder, card: dict):
    title = card["title"]
    nb.section_qa(card, "anamnese_appareil",
                  f"{title} — {SECTION_LABEL['anamnese_appareil']} ?",
                  card.get("anamnese_appareil"))
    nb.scan_cloze(card, "anamnese_appareil", card.get("anamnese_appareil"))

    exp = card.get("examen_physique") or {}
    for subname, items in exp.items():
        sec = f"examen_physique.{subname}"
        nb.section_qa(card, sec, f"{title} — Examen physique : {subname} ?", items)
        nb.scan_cloze(card, sec, items)

    nb.section_qa(card, "manoeuvres", f"{title} — {SECTION_LABEL['manoeuvres']} ?",
                  card.get("manoeuvres"))
    nb.scan_cloze(card, "manoeuvres", card.get("manoeuvres"))

    if card.get("echelles"):
        nb.section_qa(card, "echelles", f"{title} — {SECTION_LABEL['echelles']} ?",
                      card.get("echelles"))


def build_tool(nb: NoteBuilder, card: dict):
    title = card["title"]
    for i, si in enumerate(card.get("score_interpretation") or []):
        front = f'{title} — Interprétation du score {inline(si.get("score"))} ?'
        nb.qa(card, "score", i, front, inline(si.get("interpretation")))

    for sec in ("quand_utiliser", "items", "limites"):
        nb.section_qa(card, sec, f"{title} — {SECTION_LABEL[sec]} ?", card.get(sec))
        nb.scan_cloze(card, sec, card.get(sec))

    for i, si in enumerate(card.get("score_interpretation") or []):
        nb.cloze(card, "score", f"i{i}", si.get("interpretation"))


BUILDERS = {"ssp": build_ssp, "sys": build_sys, "tool": build_tool}


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def load_cards(status_filter=None):
    cards, skipped = [], []
    for path in sorted(DATA_DIR.glob("*.yaml")):
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            skipped.append((path.name, f"YAML error: {e}"))
            continue
        if not isinstance(data, dict) or "type" not in data or "id" not in data:
            skipped.append((path.name, "missing id/type"))
            continue
        if data["type"] not in BUILDERS:
            skipped.append((path.name, f"unknown type {data['type']!r}"))
            continue
        if status_filter and data.get("status") not in status_filter:
            continue
        cards.append(data)
    return cards, skipped


def make_note(spec):
    card = spec["card"]
    tags = [
        "ecos",
        f"disc::{slug(card.get('discipline', 'NA'))}",
        f"type::{card['type']}",
        f"card::{slug(card['id'])}",
        f"section::{slug(spec['section'])}",
        f"status::{slug(card.get('status', 'NA'))}",
    ]
    model = QA_MODEL if spec["model"] == "qa" else CLOZE_MODEL
    return genanki.Note(
        model=model,
        fields=spec["fields"],
        tags=tags,
        guid=genanki.guid_for(spec["guid_key"]),
    )


def main():
    ap = argparse.ArgumentParser(description="Build Anki .apkg from ECOS pocketcards")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--status", nargs="*", default=None,
                    help="only include these statuses (e.g. --status ready review-pending)")
    args = ap.parse_args()

    if not DATA_DIR.is_dir():
        sys.exit(f"data dir not found: {DATA_DIR}")

    cards, skipped = load_cards(args.status)
    if not cards:
        sys.exit("No cards loaded.")

    nb = NoteBuilder()
    type_counts = {"ssp": 0, "sys": 0, "tool": 0}
    for card in cards:
        type_counts[card["type"]] += 1
        BUILDERS[card["type"]](nb, card)

    # Group notes into per-discipline decks.
    decks = {}
    for spec in nb.specs:
        disc = spec["card"].get("discipline", "Divers")
        deck_name = f"{DECK_ROOT}::{disc}"
        if deck_name not in decks:
            decks[deck_name] = genanki.Deck(stable_id(f"deck::{deck_name}"), deck_name)
        decks[deck_name].add_note(make_note(spec))

    n_qa = sum(1 for s in nb.specs if s["model"] == "qa")
    n_cloze = sum(1 for s in nb.specs if s["model"] == "cloze")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    genanki.Package(list(decks.values())).write_to_file(str(args.out))

    # Report ---------------------------------------------------------------- #
    print(f"ECOS Pocketcards → Anki")
    print(f"  source cards : {len(cards)}  "
          f"(ssp={type_counts['ssp']} sys={type_counts['sys']} tool={type_counts['tool']})")
    print(f"  notes        : {len(nb.specs)}  (Q/A={n_qa}  cloze={n_cloze})")
    print(f"  decks        : {len(decks)}")
    for name in sorted(decks):
        print(f"      {name}: {len(decks[name].notes)} notes")
    if skipped:
        print(f"  skipped      : {len(skipped)}")
        for name, why in skipped:
            print(f"      - {name}: {why}")
    size_kb = args.out.stat().st_size / 1024
    print(f"  output       : {args.out}  ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
