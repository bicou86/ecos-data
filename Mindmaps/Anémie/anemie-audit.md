# Anémie — Tableau d'audit (source de vérité du diagramme)

> **Principe** : ce tableau est la _source de vérité_, le `.mmd` n'en est que la projection visuelle.
> Chaque nœud du diagramme doit pouvoir être justifié par une ligne ci-dessous.
>
> **Source autoritaire** : `Mindmaps/Hémato | Anémie.pdf`, p.1 — algorithme **imprimé** « Anémie ».
> **Source secondaire (non autoritaire)** : annotations manuscrites de la même page (notes perso).
>
> ⚠️ **Limite d'ancrage** : la source est une **photo**, sans couche texte fiable.
> La vérification déterministe par recherche verbatim (`grep`) est **impossible**.
> Elle est remplacée par une **relecture visuelle** → plus faible → d'où la colonne « Confiance lecture ».

Statut global : 🟢 **VALIDÉ — Damien, 2026-06-07** (correction D1 appliquée ; W1, D3/D4, T1/T2 confirmés)

---

## 1. Nœuds de décision et seuils (CRITIQUES — à valider en priorité)

| #   | Affirmation                                              | Lu dans la source                              | Confiance lecture | Statut / validation                                                             |
| --- | -------------------------------------------------------- | ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| D1  | Définition anémie : **Hb F < 120 / H < 130 g/L**         | « Hb < 120 g/l » (manuscrit + titre flowchart) | 🟢 Validé         | ✅ Corrigé : seuil par sexe (OMS) adopté à la place du 120 unisexe de la source |
| D2  | 1ᵉʳ tri = **Réticulocytes / IPR**                        | « Réticulocytes/IPR »                          | 🟢 Haute          | ✅ OK (structure régénératif-first)                                             |
| D3  | Hyperrégénératif si **réticulocytes > 120 G/L**          | « ↑ > 120 G/L »                                | 🟢 Validé         | ✅ Confirmé : seuil 120 G/L (×10⁹/L) retenu                                     |
| D4  | Hyporégénératif si **N ou ↓ < 120 G/L**                  | « N ou ↓ < 120 G/L »                           | 🟢 Validé         | ✅ Confirmé (idem D3)                                                           |
| D5  | 2ᵉ tri (hyporégén.) = **MCV** : < 80 / 80–100 / > 100 fL | « < 80 fL / 80-100 / > 100 fL »                | 🟢 Haute          | ✅ OK (cf. écart W1)                                                            |

## 2. Logique de branches

| #   | Chemin                                                                        | Lu dans la source | Confiance | Statut |
| --- | ----------------------------------------------------------------------------- | ----------------- | --------- | ------ |
| B1  | Hyperrégén. → **Bilan hémolytique** (Nég → hémorragie aiguë ; Pos → hémolyse) | flowchart         | 🟢        | ✅ OK  |
| B2  | Hémolyse → **Coombs** (Pos → immune ; Nég → non auto-immune)                  | flowchart         | 🟢        | ✅ OK  |
| B3  | Immune → auto-immune (Ac chauds/froids) **et** allo-immune                    | flowchart         | 🟢        | ✅ OK  |
| B4  | Non auto-immune → **Congénital** vs **Acquis**                                | flowchart         | 🟢        | ✅ OK  |
| B5  | Hyporégén. → microcytaire / normocytaire / macrocytaire (par MCV)             | flowchart         | 🟢        | ✅ OK  |

## 3. Faits cliniques spécifiques (lus, à confirmer)

| #   | Fait                                                                                                                                                                                      | Lu dans la source    | Confiance | À confirmer                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------- | --------------------------------------------------------------- |
| F1  | Microcytaire — labo : **ferritine + saturation transferrine**                                                                                                                             | flowchart            | 🟢        | OK ?                                                            |
| F2  | Microcytaire — causes : ferriprive, tumorale, inflammatoire, hémoglobinopathie (→ électrophorèse Hb)                                                                                      | flowchart            | 🟢        | OK ?                                                            |
| F3  | Normocytaire — **rénale si ClCr < 30 mL/min**                                                                                                                                             | flowchart            | 🟡        | Seuil 30 confirmé ?                                             |
| F4  | Normocytaire — moelle remplacée/comprimée : fibrose, lymphome, myélome, métastases                                                                                                        | flowchart            | 🟢        | OK ?                                                            |
| F5  | Macrocytaire — labo : **B12 + acide folique** ; causes incl. hypothyroïdie, SMD, grossesse, OH, médic.                                                                                    | flowchart            | 🟢        | OK ?                                                            |
| F6  | Macrocytaire — médicaments : **TMP/SMX, méthotrexate, phénytoïne**                                                                                                                        | flowchart (surligné) | 🟢        | Liste complète/à compléter ?                                    |
| F7  | Hémolyse non-AI acquise : MAT (SHU, PTT, HELLP), **HPN (gène PIG-A)**, sepsis (babesia, malaria, bartonella, C. difficile), trauma/brûlure, médic., hémolyse du coureur, sténose aortique | flowchart + annot.   | 🟡        | Lecture des annotations manuscrites (SHU/PTT/HELLP) à confirmer |
| F8  | Hémolyse congénitale : hémoglobinopathies (thalassémie, drépanocytose, Hb instables), enzymopathies (**G6PD, pyruvate kinase**), membranopathies (sphéro-, elliptocytose)                 | flowchart            | 🟢        | OK ?                                                            |

> Les lignes F1–F8 restent au niveau « lecture visuelle » : un coup d'œil de ta part sur les 🟡 (F3, F7) sécuriserait le tout.

## 4. Liens transverses (DÉDUITS — pas dans la source, ajout pédagogique)

| #   | Lien                                                                                       | Justification clinique                                                           | Statut                     |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------- |
| T1  | « Inflammatoire » (microcyt.) ↔ « Tumorale » (normocyt.) = **anémie de maladie chronique** | L'anémie inflammatoire/de maladie chronique peut être micro- **ou** normocytaire | 🟢 DÉDUIT — validé (gardé) |
| T2  | « Hémoglobinopathie » (microcyt.) ↔ « Hémoglobinopathies » congénitales (hémolyse)         | La thalassémie est à la fois microcytaire **et** hémolytique congénitale         | 🟢 DÉDUIT — validé (gardé) |

## 5. Écarts détectés (le pipeline fait son travail)

| #   | Écart                   | Détail                                                                                     | Décision                                                                 |
| --- | ----------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| W1  | **Seuil macrocytaire**  | Manuscrit semble écrire « MCV > 120 fL » ; flowchart imprimé + standard = **« > 100 fL »** | ✅ Validé Damien : **> 100 fL** retenu (manuscrit = erreur de relecture) |
| W2  | Double usage de « 120 » | Hb < 120 g/L (définition) **vs** réticulocytes 120 G/L (×10⁹/L) — ne pas confondre         | ✅ Clarifié dans le diagramme                                            |

---

## Rubriques de complétude (anti-omission — à cocher avec la source)

- [ ] Drapeaux rouges / urgences (ex. hémorragie aiguë : déjà présent ; anémie sévère mal tolérée ?)
- [ ] Frottis sanguin / examen morphologique (mentionné ? place dans l'arbre ?)
- [ ] Bilan martial complet (fer sérique, CTF, coef. saturation — partiellement dans le manuscrit)
- [ ] Place de l'EPO / contexte rénal
- [ ] Anémie mixte (carences combinées, MCV « faussement normal »)

> Cocher = présent dans la source et reporté ; laisser vide = **omission à décider** (ajouter ou non).
