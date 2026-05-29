# Phase 4 — Notion Sync Planning

**Status**: Draft for review · **Date**: 2026-05-29

## Current state (Phase 2.1 / 2.13)

- `src/notion.js` produces `dist/notion/push-plan.json` manifest
- 194 LOC, builds Notion API block objects (heading_2, paragraph, callout, bullet)
- Strips semantic markup (`{p:...}` → plain text) — color coding lost in Notion
- Skips non-`ready` cards (currently 3 out of 149)
- Designed to be executed by Claude via the Notion MCP, not autonomously

## Phase 4 architecture decisions

### Decision 1 — Workspace structure

Three options for organizing 149 cards in Notion:

**A. Single master database** (recommended for MVP)

- One database "ECOS Pocketcards" with all 149 cards
- Properties: `Type` (SSP/SYS/TOOL), `Discipline` (19-option select), `Urgency`, `Status`, `Version`
- Filter views by discipline (19 views) + by urgency + by status
- **Pro**: simple, single source of truth, easy bulk operations, search across all
- **Con**: hits Notion database limits at 50k+ pages (we're far from this)

**B. Database per discipline** (19 databases)

- Each discipline has own database
- Cross-discipline references handled via relations
- **Pro**: clean separation, discipline-owners can curate independently
- **Con**: complex setup, harder to do global ops, relations require maintenance

**C. Hierarchical pages** (no database)

- Index page → discipline page → card page tree
- **Pro**: most natural reading order, no DB constraints
- **Con**: loses filtering, search, sorting; not what Notion is good at

### Decision 2 — Sync direction

**A. One-way YAML → Notion** (recommended)

- YAML is canonical truth; Notion is a published view
- Notion pages locked or include warning "Source of truth = YAML, edits will be overwritten"
- **Pro**: no merge conflicts, version control via git, reproducible
- **Con**: SMEs can't fix typos directly in Notion (must edit YAML)

**B. Two-way sync** (complex)

- Notion edits sync back to YAML via webhook + parser
- **Pro**: SMEs can edit in their familiar tool
- **Con**: requires Notion webhook infra, conflict resolution, lossy parsing (Notion blocks → YAML)

**C. Snapshot-only**

- One-time push, never update
- **Pro**: simplest
- **Con**: drift; if YAML changes, Notion is stale

### Decision 3 — Status filter

Currently `notion.js` only pushes `status: "ready"` (3/149 cards). Options:

**A. Strict ready-only** (current)

- Notion = curated, reviewed, validated content
- Drafts stay in YAML/local until promoted
- **Pro**: Notion users see only quality content
- **Con**: until Phase 3 review completes, Notion stays nearly empty

**B. Push all + filter view**

- Push 149 cards with status property
- Default view filters to `ready`; "Review queue" view shows drafts
- **Pro**: SMEs can review drafts in Notion (easier than YAML)
- **Con**: published view risks exposing un-reviewed content

**C. Two databases** (Production + Review)

- "ECOS Pocketcards" = ready cards only
- "ECOS Review Queue" = drafts pending review
- **Pro**: clean separation, review workflow in Notion
- **Con**: duplication, sync complexity

### Decision 4 — Update strategy

Once a card exists in Notion, how to re-sync after YAML changes?

**A. Idempotent upsert** (recommended)

- Track Notion page ID in YAML's `notion_last_synced` field (already in schema)
- First push: create page, write page ID + timestamp to YAML
- Subsequent: update existing page, refresh timestamp
- **Pro**: history preserved in Notion, no duplicates
- **Con**: need to handle the write-back of page IDs into YAML

**B. Delete + recreate**

- Every sync: delete all pages, create fresh from YAML
- **Pro**: simple, always fresh
- **Con**: loses Notion comments/page-history; user shares break (page URLs change)

**C. Diff-based block update**

- Compare current vs new blocks, only update changes
- **Pro**: minimal API calls, preserves comments
- **Con**: complex diff logic, fragile

### Decision 5 — Semantic markup preservation

Notion's `text` block has limited color (background colors only at block level, not span level).

**A. Strip markup** (current `notion.js` behavior)

- Text rendered without colors
- **Con**: loses the visual scanning that's the point of the system

**B. Use Notion block-level color**

- Convert `{r:treatment}` items into yellow-background callouts
- **Con**: only works for whole-block coloring, not inline spans

**C. Emoji prefixes**

- Prefix items with `🟡 treatment`, `🔴 pathology`
- **Pro**: works inline
- **Con**: visual clutter

**D. Push HTML to Notion's embed block**

- Embed rendered HTML cards in Notion
- **Pro**: preserves all formatting
- **Con**: embeds are not searchable in Notion

## Locked Phase 4 architecture (user decisions 2026-05-29)

**Workspace**: ✅ **A** — Single master database "ECOS Pocketcards"
**Direction**: ✅ **A** — One-way YAML → Notion (YAML is canonical)
**Status**: ✅ **B** — Push all 149 + status filter views (enables Notion review)
**Updates**: 🔧 **A** (default) — Idempotent upsert via `notion_page_id` field
**Markup**: 🔧 **A** (default) — Strip on first push, evaluate emoji prefixes after user feedback

Decisions 4-5 marked 🔧 are implementation defaults that can be revisited post-MVP without re-architecting.

## Implementation steps

1. **Schema migration**: add `notion_page_id` field to schema (optional, populated on first push)
2. **Notion database setup** (one-time): create database with properties Type, Discipline, Urgency, Status, Version, Source, LastSynced; define ~10 useful views
3. **notion.js enhancements**:
   - Expand `runNotion()` to handle drafts (currently filtered out)
   - Build idempotent upsert logic via Notion MCP (`update_page` if `notion_page_id` exists else `create_page`)
   - Write back `notion_page_id` and `notion_last_synced` to YAML after success
4. **Sync orchestration**: a CLI command `npm run sync:notion` that the user runs (or Claude runs via the MCP)
5. **Tests**: dry-run mode that prints the API calls without executing

## Estimate

- Setup + schema migration: 1 hour
- notion.js enhancements: 3 hours
- Notion database design (in Notion): 1 hour
- Initial push of 149 cards: 30 min (rate-limited by Notion API)
- Documentation + smoke test: 1 hour
- **Total: ~6 hours**

## Open decisions for user

The 5 decisions above. Recommended path = A/A/B/A/A. If user agrees, proceed
directly to implementation. If user prefers a different mix, adjust the
implementation plan accordingly.
