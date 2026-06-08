# Refonte CK en base de données + maillage cross-références — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner Clinical Knowledge sur le modèle SSP/Skills/Pocketcards (chaque discipline = une ligne-page d'une base), convertir Flashcards en base, et tisser le maillage de relations entre les 5 bases.

**Architecture:** Opérations Notion via le MCP `notion`. Réaffectation de la base de gouvernance `25480105…` (déplacement des pages de contenu comme lignes + retrait des stubs hors base) ; création d'une base Flashcards ; relations DUAL (écrire un seul côté) ; peuplement par correspondance de spécialité (Phase 3 parallélisable en Workflow).

**Tech Stack:** Notion MCP — `notion-fetch`, `notion-query-database-view`, `notion-move-pages`, `notion-update-page`, `notion-update-data-source`, `notion-create-database`, `notion-create-view`.

**Réf. spec :** `docs/superpowers/specs/2026-06-08-refonte-ck-base-centrale-cross-refs-design.md`

---

## Conventions de vérification (remplacent le cycle TDD)

- **Garde-fou cache** : avant toute écriture sur une page, `notion-fetch` la page et confirmer le **titre** attendu. Si mismatch → re-fetch.
- **Confirmation d'écriture** : après une écriture, re-`fetch` (ou re-`query-database-view`) et vérifier la valeur. Pour `update_content`, ré-émettre le même remplacement → « No matches found » prouve l'application.
- **DUAL** : n'écrire qu'un seul côté d'une relation ; vérifier le réciproque par échantillon.
- **Idempotence** : les relations sont des ensembles d'URLs ; ré-exécuter ne crée pas de doublon.
- Pas de commit git par tâche (état dans Notion) ; les points de contrôle sont des **relectures**. Mettre à jour la mémoire `ck-hub-audit.md` en fin de plan.

## IDs canoniques (rappel)

| Entité                           | database_id                        | data source (collection)               | view (énumération)                     |
| -------------------------------- | ---------------------------------- | -------------------------------------- | -------------------------------------- |
| SSP                              | `3678563148fa80738601e99d48f2f3eb` | `36785631-48fa-8039-a3b2-000bb69f7a44` | `36785631-48fa-80c1-9efc-000c6dde0e68` |
| Skills                           | `36e8563148fa8075abb6e1e6076722c9` | `36e85631-48fa-8090-a6d3-000b721715d5` | `36e85631-48fa-801b-af97-000c9a216c61` |
| Pocketcards                      | `796b238f2ed142938d3ac80deeb2d329` | `75ef2716-395d-4246-86ff-5e063db0f9b4` | `ea6ec20f-79c4-40e3-998e-00a82359a3c1` |
| CK (gouvernance → Base Centrale) | `db8a8279113a4917a35d085048282528` | `25480105-8551-489a-9dec-24d6bbdfcc76` | `9cbf68ed-b615-42d4-962e-f50f478eed1f` |
| Hub CK (page)                    | `3608563148fa817ba078cc08621f943f` | —                                      | —                                      |
| Page « Flashcards » (wrapper)    | `3228563148fa817daba0fa3e03bf4814` | —                                      | —                                      |

URL de vue pour `query-database-view` : `https://www.notion.so/<database_id>?v=<view_id>`.

---

## Phase 0 — Inventaire (lecture seule)

### Task 0.1 : Énumérer SSP, Skills, Pocketcards

**Files:** aucun (lecture) → sortie `/tmp/ck-refonte-inventaire.json`

- [ ] **Step 1 : Query les 3 bases**

Appeler `notion-query-database-view` (paginer tant que `has_more`) sur :

- `https://www.notion.so/3678563148fa80738601e99d48f2f3eb?v=36785631-48fa-80c1-9efc-000c6dde0e68` (SSP)
- `https://www.notion.so/36e8563148fa8075abb6e1e6076722c9?v=36e85631-48fa-801b-af97-000c9a216c61` (Skills)
- `https://www.notion.so/796b238f2ed142938d3ac80deeb2d329?v=ea6ec20f-79c4-40e3-998e-00a82359a3c1` (Pocketcards)

- [ ] **Step 2 : Construire l'index Spécialité → [URL]**

Pour chaque base, regrouper les lignes par valeur `Spécialité`. Écrire `/tmp/ck-refonte-inventaire.json` :

```json
{ "ssp": {"Cardiologie & Vasculaire": ["https://www.notion.so/..."], ...},
  "skills": {...}, "pocketcards": {...} }
```

- [ ] **Step 3 : Vérifier les totaux**

Comparer le nombre de lignes par base au nombre de groupes attendus (16-17 spécialités). Logguer les spécialités vides.

### Task 0.2 : Lire les 26 stubs de la base de gouvernance

- [ ] **Step 1 : Query la base de gouvernance**

`notion-query-database-view` sur `https://www.notion.so/db8a8279113a4917a35d085048282528?v=9cbf68ed-b615-42d4-962e-f50f478eed1f`.

- [ ] **Step 2 : Capturer le mapping stub → page de contenu**

Pour chaque stub, enregistrer `{ stub_url, Page (url contenu), Discipline, Famille, "Statut révision", "Priorité B3", "Dernière relecture", "Erreurs corrigées", "Lacunes principales (B3)" }`. Ajouter à l'inventaire sous clé `"stubs"`. Vérifier : 26 stubs, chacun avec une URL `Page` non vide.

### Task 0.3 : Confirmer les 26 pages de contenu cibles

- [ ] **Step 1 : Vérifier l'appariement**

Croiser les URLs `Page` des stubs avec la table de correspondance de la spec (23 disciplines + 3 transversales). Signaler tout stub dont `Page` ne correspond à aucune page connue, ou toute page connue sans stub. Logguer dans l'inventaire `"appariement_ok": true/false` + écarts.

### Task 0.4 : Lire les 22 pages Flashcards

- [ ] **Step 1 : Re-fetch la page Flashcards**

`notion-fetch` `3228563148fa817daba0fa3e03bf4814`. Confirmer 22 sous-pages + sections « Ancrage » / « Pathologies ». Enregistrer dans l'inventaire `"flashcards"` : `{ page_id, titre, type (Ancrage|Pathologies), Spécialité (selon spec) }` pour les 22.

---

## Phase 1 — Réaffectation de la base CK

### Task 1.1 : Créer la page-corbeille temporaire pour les stubs

**Files:** aucun (Notion)

- [ ] **Step 1 : Créer la page tampon**

`notion-create-pages` parent `page_id` = `3608563148fa817ba078cc08621f943f` (Hub), une page `title: "🗑️ TEMP — anciens stubs Disciplines (à supprimer)"`. Noter son `page_id` → `TEMP_TRASH_ID`.

- [ ] **Step 2 : Vérifier**

`notion-fetch` `TEMP_TRASH_ID` → titre conforme.

### Task 1.2 : Déplacer les 26 pages de contenu dans la collection CK

- [ ] **Step 1 : Garde-fou identité**

Pour les 26 page_ids cibles (table spec), `notion-fetch` un échantillon (3-4) et confirmer les titres (« Cardiologie — Clinical Knowledge », etc.).

- [ ] **Step 2 : Déplacer (lots ≤ 100)**

`notion-move-pages` : `page_or_database_ids` = les 26 page_ids ; `new_parent` = `{ type: "data_source_id", data_source_id: "25480105-8551-489a-9dec-24d6bbdfcc76" }`.

- [ ] **Step 3 : Vérifier**

`notion-query-database-view` sur la vue CK → confirmer 52 lignes (26 stubs + 26 contenu). Confirmer que les titres de contenu apparaissent.

### Task 1.3 : Migrer les métadonnées stub → ligne de contenu

- [ ] **Step 1 : Pour chaque page de contenu, appliquer les métadonnées**

Pour les 26 pages de contenu, `notion-update-page` command `update_properties`, `page_id` = page de contenu, `properties` depuis le stub apparié (Task 0.2) :

```json
{ "Famille": "<...>", "Statut révision": "<...>", "Priorité B3": "<...>",
  "date:Dernière relecture:start": "2026-06-08", "Erreurs corrigées": <n>,
  "Lacunes principales (B3)": "<...>" }
```

(omettre les valeurs vides). Procéder **séquentiellement** (garde-fou cache).

- [ ] **Step 2 : Vérifier (échantillon)**

Re-`fetch` 3 pages de contenu → propriétés conformes au stub.

### Task 1.4 : Retirer les 26 stubs hors de la base

- [ ] **Step 1 : (Spike) tester l'archivage direct sur 1 stub**

Tenter `notion-update-page` pour mettre un stub à la corbeille si une voie existe ; sinon passer au Step 2 (méthode confirmée).

- [ ] **Step 2 : Déplacer les stubs vers la page tampon**

`notion-move-pages` : `page_or_database_ids` = les 26 stub_urls (IDs) ; `new_parent` = `{ type: "page_id", page_id: TEMP_TRASH_ID }`.

- [ ] **Step 3 : Vérifier**

`notion-query-database-view` sur la vue CK → **26 lignes** restantes (uniquement les pages de contenu), 0 stub.

### Task 1.5 : Nettoyer le schéma et renommer la base

- [ ] **Step 1 : Drop colonne Page + rename**

`notion-update-data-source` `data_source_id` = `25480105-8551-489a-9dec-24d6bbdfcc76` :

- `statements`: `DROP COLUMN "Page"`
- `title`: `🧠 Clinical Knowledge — Base Centrale`

- [ ] **Step 2 : (Optionnel) Renommer la colonne titre**

Si souhaité, garder `Discipline` (title). Pas de changement requis.

- [ ] **Step 3 : Vérifier**

`notion-fetch` `collection://25480105-8551-489a-9dec-24d6bbdfcc76` → titre « Clinical Knowledge — Base Centrale », plus de colonne `Page`.

### Task 1.6 : Ajouter la relation CK ↔ Skills

- [ ] **Step 1 : ADD COLUMN relation DUAL**

`notion-update-data-source` `data_source_id` = `25480105-8551-489a-9dec-24d6bbdfcc76` :
`statements`: `ADD COLUMN "Skills liés" RELATION('36e85631-48fa-8090-a6d3-000b721715d5', DUAL 'Disciplines CK')`

- [ ] **Step 2 : Vérifier (deux côtés)**

`fetch` la collection CK → `Skills liés` présent. `fetch` la collection Skills → `Disciplines CK` présent.

### Task 1.7 : Nettoyer les titres de lignes (optionnel)

- [ ] **Step 1 : Retirer le suffixe « — Clinical Knowledge »**

Pour chaque ligne, `update_properties` `Discipline` = titre sans le suffixe (ex. « Cardiologie »). Séquentiel. _(Cosmétique — peut être sauté.)_

- [ ] **Step 2 : Vérifier (échantillon)** via re-`fetch`.

### Task 1.8 : Point de contrôle Phase 1

- [ ] **Step 1 :** `query-database-view` CK → 26 lignes-pages, métadonnées présentes, relations `SSP liées`/`Pocketcards liées`/`Skills liés` existantes (vides pour l'instant), colonne `Page` absente. Logguer.

---

## Phase 2 — Flashcards en base

### Task 2.1 : Créer la base « 🎴 Flashcards — Base Centrale »

- [ ] **Step 1 : create_database**

`notion-create-database` :

- `parent`: `{ page_id: "3228563148fa817daba0fa3e03bf4814" }`
- `title`: `🎴 Flashcards — Base Centrale`
- `schema` (CREATE TABLE) :

```sql
CREATE TABLE (
  "Nom" TITLE,
  "Spécialité" SELECT('Fondamentaux & Communication':blue,'Médecine Interne':brown,'Cardiologie & Vasculaire':red,'Pneumologie':blue,'Gastro-Hépatologie':yellow,'Musculo-Squelettique':brown,'Neurologie':purple,'Pédiatrie':yellow,'Néphro-Urologie':gray,'Endocrinologie':orange,'Gynéco-Obstétrique':pink,'ORL':purple,'Ophtalmologie':default,'Dermatologie':brown,'Psychiatrie':green,'Urgences Vitales':red,'Transversal':gray),
  "Type" SELECT('🧠 Ancrage':blue,'🩹 Pathologies':orange),
  "Nb Q&A" NUMBER,
  "Source" RICH_TEXT,
  "SSP liées" RELATION('36785631-48fa-8039-a3b2-000bb69f7a44', DUAL 'Flashcards liées'),
  "Skills liés" RELATION('36e85631-48fa-8090-a6d3-000b721715d5', DUAL 'Flashcards liées'),
  "Pocketcards liées" RELATION('75ef2716-395d-4246-86ff-5e063db0f9b4', DUAL 'Flashcards liées'),
  "Disciplines CK" RELATION('25480105-8551-489a-9dec-24d6bbdfcc76', DUAL 'Flashcards liées')
)
```

Noter la nouvelle `data_source_id` → `FC_DS_ID` et `database_id` → `FC_DB_ID`.

- [ ] **Step 2 : Vérifier les réciproques**

`fetch` SSP/Skills/Pocketcards/CK collections → chacune a une nouvelle propriété `Flashcards liées` → `FC_DS_ID`.

### Task 2.2 : Déplacer les 22 sous-pages dans la base Flashcards

- [ ] **Step 1 : Garde-fou identité** — `fetch` 3-4 des 22 page_ids, confirmer titres.

- [ ] **Step 2 : move-pages** — les 22 page_ids → `new_parent` `{ type: "data_source_id", data_source_id: FC_DS_ID }`.

- [ ] **Step 3 : Vérifier** — `query-database-view` (vue par défaut de `FC_DB_ID`) → 22 lignes.

### Task 2.3 : Renseigner Spécialité + Type

- [ ] **Step 1 : update_properties (22 lignes)**

Pour chaque page (table spec Phase 0.4) : `{ "Spécialité": "<...>", "Type": "🧠 Ancrage" | "🩹 Pathologies" }`. Séquentiel.

- [ ] **Step 2 : Vérifier** — `query-database-view` → 22 lignes avec Spécialité+Type renseignés.

### Task 2.4 : Présentation de la page Flashcards

- [ ] **Step 1 : insert_content** sur `3228563148fa817daba0fa3e03bf4814`

En tête : un callout « Base centrale des jeux de flashcards (Ancrage + Pathologies) ». La base créée en Task 2.1 est déjà enfant de la page → elle s'affiche. Conserver les 2 intitulés de section existants comme légende.

- [ ] **Step 2 : Vérifier** — `fetch` la page → base visible + callout.

---

## Phase 3 — Peuplement des cross-références

> **Orchestration recommandée (Ultracode)** : 1 agent Workflow par discipline CK (26) — écritures idempotentes, vérif post-hoc. Entrée : `/tmp/ck-refonte-inventaire.json`. Voir template d'agent en fin de phase.

### Task 3.1 : Peupler CK → SSP / Skills / Pocketcards / Flashcards

- [ ] **Step 1 : Pour chaque ligne CK**

Déterminer la/les Spécialité(s) cible(s) (table spec). Depuis l'inventaire, rassembler les URLs SSP, Skills, Pocketcards, Flashcards de ces spécialités. `notion-update-page` `update_properties` sur la ligne CK :

```json
{
  "SSP liées": "[\"url\",...]",
  "Skills liés": "[\"url\",...]",
  "Pocketcards liées": "[\"url\",...]",
  "Flashcards liées": "[\"url\",...]"
}
```

(DUAL → réciproques auto-remplis sur SSP/Skills/Pocketcards/Flashcards). Séquentiel ou parallélisé par discipline (1 discipline = 1 agent ; pas de collision car écritures sur lignes distinctes).

- [ ] **Step 2 : Vérifier (par discipline)**

Re-`fetch` la ligne CK → 4 relations peuplées. Échantillon : `fetch` une ligne SSP liée → `Disciplines CK` contient bien cette discipline.

### Task 3.2 : Compléter Flashcards ↔ SSP / Skills / Pocketcards

- [ ] **Step 1 :** Les réciproques `Flashcards liées` sur SSP/Skills/Pocketcards sont déjà remplis si Task 3.1 a écrit `Flashcards liées` côté CK ? **Non** — Task 3.1 relie CK↔Flashcards, pas Flashcards↔SSP. Donc : pour chaque ligne Flashcards, `update_properties` `SSP liées`/`Skills liés`/`Pocketcards liées` = URLs de même Spécialité (inventaire). Séquentiel.

- [ ] **Step 2 : Vérifier** — re-`fetch` une ligne Flashcards → 3 relations peuplées + `Disciplines CK` (déjà fait en 3.1).

### Task 3.3 : Vérifier/compléter SSP ↔ Skills ↔ Pocketcards

- [ ] **Step 1 : Détecter les gaps**

Depuis l'inventaire, pour chaque Spécialité, vérifier que les lignes SSP/Skills/Pocketcards de cette spécialité sont mutuellement liées. Logguer les manques.

- [ ] **Step 2 : Combler**

`update_properties` côté SSP (un seul côté) pour les paires manquantes SSP↔Skills et SSP↔Pocketcards ; côté Skills pour Skills↔Pocketcards. Idempotent.

- [ ] **Step 3 : Vérifier (échantillon)** par re-`fetch`.

**Template d'agent Workflow (Phase 3.1, 1 par discipline) :**

> Entrée : nom discipline, page_id ligne CK, spécialité(s), inventaire JSON. Tâche : lire l'inventaire, composer les 4 listes d'URLs, `update_properties` sur la ligne CK, re-fetch pour confirmer les 4 relations, retourner `{discipline, counts:{ssp,skills,pocket,flash}, ok:bool}`.

---

## Phase 4 — Hub CK

### Task 4.1 : Re-fetch et garde-fou

- [ ] **Step 1 :** `notion-fetch` `3608563148fa817ba078cc08621f943f`. Confirmer titre « CLINICAL KNOWLEDGE — Hub Principal ». Observer l'état des blocs child-page disciplines (vidés par les déplacements Phase 1).

### Task 4.2 : Remplacer la liste inline par une vue de base liée

- [ ] **Step 1 : Créer une vue liée groupée par Famille**

`notion-create-view` : `parent_page_id` = Hub, `data_source_id` = `25480105-8551-489a-9dec-24d6bbdfcc76`, `name` = « 📚 Disciplines (par famille) », `type` = `table`, `configure` = `GROUP BY "Famille"; SHOW "Discipline","Statut révision","Priorité B3","SSP liées","Skills liés","Pocketcards liées","Flashcards liées"`.

- [ ] **Step 2 : Nettoyer les rubriques inline orphelines**

`notion-update-page` `update_content` : retirer les en-têtes désormais vides (« 🩺 Médecine interne & systèmes », « 🧠 Neurologie & Psychiatrie », etc.) et les `<page>` résiduels. Garder le callout transversales si pertinent (les transversales sont dans la base).

- [ ] **Step 3 : Vérifier** — `fetch` Hub → vue liée présente, rubriques orphelines retirées, éditorial (Top 21/50, Pièges, Mnémoniques, Spé CH) intact.

### Task 4.3 : Mettre à jour le callout de tête

- [ ] **Step 1 : update_content**

Remplacer le texte du callout 📊 (qui référence « 📊 Disciplines — Clinical Knowledge ») par un renvoi vers « 🧠 Clinical Knowledge — Base Centrale » (même base, nouveau nom/rôle). Vérifier via re-émission (« No matches found »).

---

## Phase 5 — Vérification indépendante

### Task 5.1 : Base CK

- [ ] **Step 1 :** `query-database-view` CK → exactement 26 lignes-pages, 0 stub, métadonnées présentes, colonne `Page` absente, titre base = « 🧠 Clinical Knowledge — Base Centrale ». Échantillon : ouvrir 2 lignes → contenu de discipline intact (toggles/callouts/images).

### Task 5.2 : Maillage

- [ ] **Step 1 :** Pour 4 disciplines témoins (Cardiologie, Pédiatrie, Neurologie, Gynéco) : `fetch` la ligne CK → 4 relations peuplées ; `fetch` une cible de chaque type → réciproque présent. Vérifier Flashcards : 22 lignes, relations peuplées.

### Task 5.3 : Hub + nettoyage final

- [ ] **Step 1 :** `fetch` Hub → vue liée OK, callout à jour, éditorial intact, 0 lien mort.
- [ ] **Step 2 :** Signaler à l'utilisateur la page tampon `TEMP_TRASH_ID` (26 stubs vides) à **supprimer en 1 geste dans l'UI** (corbeille Notion — non exposé par le MCP).
- [ ] **Step 3 :** Mettre à jour la mémoire `ck-hub-audit.md` (Vague D : réaffectation base + Flashcards base + maillage) et l'index `MEMORY.md`.

---

## Self-review (couverture spec)

- Réaffectation base (déplacer pages, migrer métadonnées, retirer stubs, drop Page, rename) → Phase 1 ✓
- Suppression visible de « Disciplines — Clinical Knowledge » → renommage + stubs hors base + page tampon à vider ✓
- Flashcards en base (22 lignes) → Phase 2 ✓
- Relations CK↔SSP/Pocketcards (peupler), CK↔Skills (créer+peupler), CK↔Flashcards + Flashcards↔SSP/Skills/Pocketcards (créer+peupler), SSP↔Skills↔Pocketcards (vérifier) → Phases 1.6, 2.1, 3 ✓
- Hub (vue liée + callout + éditorial préservé) → Phase 4 ✓
- Garde-fous cache / DUAL / idempotence / filet destructif → Conventions + tâches ✓
- Vérification indépendante → Phase 5 ✓
- Limite MCP (pas de suppression de ligne) → contournée par move-to-tampon (Task 1.4) + nettoyage UI final (Task 5.3) ✓
