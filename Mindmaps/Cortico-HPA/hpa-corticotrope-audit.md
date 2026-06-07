# Axe corticotrope (HPA) — Tableau d'audit

> Source de vérité du diagramme (Markmap `hpa-corticotrope.md` + Mermaid `hpa-corticotrope-mindmap.mmd`).
>
> **Sources** : page Notion « Endocrinologie — Clinical Knowledge » (`36085631-…`) + synthèse Endocrino p.1 (`CS/Pocketcards/.../Endocrino synthèse_page-0001.jpg`).
>
> **2 tiers d'ancrage** (comme « lu » vs « déduit » pour l'Anémie) :
> `[socle]` = physiologie standard, **non spécifiquement citée** dans tes sources → à valider comme socle.
> `[CK]` = **ancré** sur un passage précis de la page CK Endocrino.

Statut : 🟠 **BROUILLON — en attente de validation médicale (Damien)**

---

## Socle physiologique (cascade) — `[socle]`

| #   | Affirmation                                                             | Tier  | À valider                                      |
| --- | ----------------------------------------------------------------------- | ----- | ---------------------------------------------- |
| S1  | Hypothalamus sécrète la **CRH**                                         | socle | Physiologie de base — OK ?                     |
| S2  | CRH → hypophyse antérieure sécrète l'**ACTH**                           | socle | OK ?                                           |
| S3  | ACTH → cortex surrénalien (**zone fasciculée**) sécrète le **cortisol** | socle | « zone fasciculée » ajoutée par moi — garder ? |
| S4  | **Rétrocontrôle négatif** du cortisol sur hypothalamus + hypophyse      | socle | OK ?                                           |
| S5  | CRH stimulée par stress + rythme circadien (pic matinal)                | socle | OK ?                                           |

## Effets du cortisol — `[CK]` (via présentation de Cushing)

| #   | Affirmation                                       | Verbatim source CK                                        | À valider                               |
| --- | ------------------------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| C1  | ↑ glycémie / **diabète**                          | « …HTA + diabète » (présentation Cushing)                 | 🟢                                      |
| C2  | **HTA**                                           | « …HTA + diabète »                                        | 🟢                                      |
| C3  | **prise de poids** (facio-tronculaire)            | « prise de poids 6 kg »                                   | « facio-tronculaire » ajouté — garder ? |
| C4  | **catabolisme musculaire** (faiblesse des jambes) | « faiblesse des jambes »                                  | 🟢                                      |
| C5  | **fragilité cutanée** (ecchymoses)                | « tendance aux hématomes »                                | 🟢                                      |
| C6  | **aménorrhée**                                    | « aménorrhée »                                            | 🟢                                      |
| C7  | **ostéoporose**                                   | pièges CK : « corticothérapie chronique = … ostéoporose » | 🟢                                      |

## Excès → Cushing — `[CK]`

| #   | Affirmation                                                      | Verbatim source CK                                                                    | À valider                 |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| E1  | Hypophysaire (adénome) **≈ 80 %** → ACTH normal/élevé            | « 80% Cushing hypophysaire (adénome) → ACTH normal/élevé »                            | 🟢 (= maladie de Cushing) |
| E2  | Ectopique = **K poumon à petites cellules** → ACTH élevé         | « ectopique (K poumon à petites cellules) »                                           | 🟢                        |
| E3  | Surrénalien (adénome/carcinome) → **ACTH ↓**                     | « surrénalien (adénome/carcinome) → ACTH ↓ »                                          | 🟢                        |
| E4  | **Iatrogène (corticoïdes) = 1ʳᵉ cause**                          | « corticoïdes iatrogènes (Cushing exogène) #1 cause »                                 | 🟢                        |
| E5  | Dépistage : **cortisol libre urinaire 24 h**, pas cortisol basal | « 17-OH corticoïdes urines 24h (= cortisol libre urinaire 24h) ; PAS cortisol basal » | 🟢                        |

## Déficit → Insuffisance surrénale — `[CK]`

| #   | Affirmation                                         | Verbatim source CK                                             | À valider |
| --- | --------------------------------------------------- | -------------------------------------------------------------- | --------- |
| D1  | Addison (primaire) : **test au Synacthène**         | « test au Synacthène (cortisol basal après stimulation ACTH) » | 🟢        |
| D2  | Mélanodermie + hypoNa + hyperK + hypoglycémie       | « mélanodermie + hypoNa + hyperK + hypoglycémie »              | 🟢        |
| D3  | Iatrogène : arrêt brutal corticothérapie → IS aiguë | pièges CK : « insuffisance surrénale en cas d'arrêt brutal »   | 🟢        |

## Complétude (anti-omission)

- [ ] Préciser que le cortex surrénalien produit AUSSI minéralocorticoïdes (aldostérone, zona glomerulosa) et androgènes (zona reticularis) — hors axe corticotrope strict, à mentionner ou non ?
- [ ] Insuffisance surrénale **secondaire/centrale** (déficit ACTH) — absente du diagramme, à ajouter ?
- [ ] Test de freination à la dexaméthasone (Cushing) — non cité dans CK, à sourcer si ajout.

---

## Note d'intégration Notion

- **Markmap** (`hpa-corticotrope.md`) : pas natif Notion → exporter PNG/SVG depuis markmap.js.org et insérer comme image.
- **Mermaid `mindmap`** (`hpa-corticotrope-mindmap.mmd`) : **natif Notion**, validé (`valid=true`), pipeline-ready (front-matter `@id: HPA-AXIS`). Pousser via `npm run publish:diagrams` + exécution MCP **après validation médicale**.
