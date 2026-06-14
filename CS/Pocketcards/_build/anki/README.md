# Export Anki (.apkg) des pocketcards ECOS

Brique **Python autonome** (indépendante du build Node) qui convertit les
pocketcards `data/*.yaml` en un paquet Anki importable, style **« atomique +
cloze »** (rappel actif maximal).

## Ce qui est généré

Par pocketcard, l'exporteur produit plusieurs notes Anki :

| Source YAML | Type de carte Anki |
|---|---|
| `red_flags[]` | 1 carte Q/R atomique (description → dx suspecté + action) |
| `dd_top5[]` | 1 carte Q/R atomique (dx → indices + fréquence) |
| `score_interpretation[]` (tool) | 1 carte Q/R atomique (score → interprétation) |
| `anamnese`, `examen`, `pec_initiale`, `examens_complementaires`, `criteres_hospitalisation`, `pieges` (ssp) | 1 carte Q/R par (sous-)section |
| `anamnese_appareil`, `examen_physique.*`, `manoeuvres`, `echelles` (sys) | 1 carte Q/R par (sous-)section |
| `quand_utiliser`, `items`, `limites` (tool) | 1 carte Q/R par section |
| items mono-ligne contenant `{r:…}` (valeur/traitement) ou `{s:…}` (signe) | **carte cloze** (le fait clé est masqué) |

- Les tokens sémantiques `{s|p|t|r|e:…}` sont rendus en `<span>` colorés
  (parité exacte avec `src/render.js` / `assets/card.css`).
- Decks organisés par discipline : `ECOS Pocketcards::<Discipline>`.
- Tags par note : `ecos`, `disc::<Discipline>`, `type::<ssp|sys|tool>`,
  `card::<ID>`, `section::<…>`, `status::<draft|ready|…>` → filtrage facile dans Anki.

## Stabilité du planning (ré-import)

Les GUID de notes et les IDs de deck/modèle sont **déterministes** (dérivés du
contenu, pas aléatoires). Rebuild + réimport du `.apkg` **met à jour** les notes
existantes au lieu de les dupliquer → **ton planning de révision est préservé**.

> ⚠️ Ne change pas `MODEL_QA_ID` / `MODEL_CLOZE_ID` dans `build_anki.py` : cela
> orphelinerait les cartes déjà importées.

## Lancer

```bash
cd CS/Pocketcards/_build/anki
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python3 build_anki.py                      # tout → ../../dist/anki/ECOS-Pocketcards.apkg
python3 build_anki.py --status ready       # seulement les cartes prêtes
python3 build_anki.py --out /tmp/test.apkg
```

Ou via npm depuis `_build/` : `npm run build:anki`.

Importe ensuite le `.apkg` dans Anki (desktop ou AnkiMobile/AnkiDroid) :
*Fichier → Importer*.

## Limites v1 (TODO)

- **Images / diagrammes non embarqués.** Les assets (`dist/assets/images`,
  `dist/diagrams/*.svg`) sont produits par le build Node et gitignorés ; ils ne
  sont pas garantis présents. À la place, un marqueur `📎 <légende>` est ajouté
  au verso. Embarquer les médias (via `genanki.Package.media_files`) est un
  enrichissement futur.
- Les `cartes_liees` / `ssps_liees` ne sont pas (encore) transformées en liens
  entre cartes Anki.
