# Phase 3.2 Review Report — Top 5 Priority Cards

**Date**: 2026-05-29 · **Reviewer**: Senior specialist subagents · **Cards reviewed**: 5

## Summary

| Card                             | Discipline | Priority | Verdict      | Critical issues                                               |
| -------------------------------- | ---------- | -------- | ------------ | ------------------------------------------------------------- |
| SSP-NEU-08 Parésie               | Neuro      | 150      | NEEDS_FIX    | Dosing, DD, marker hygiene                                    |
| SSP-GYN-10 Saignement vaginal    | Gyneco     | 130      | NEEDS_FIX    | Wrong anti-D dose, DD missing prævia                          |
| SSP-PSY-07 Troubles psychotiques | Psy        | 130      | **APPROVED** | Only optional polish                                          |
| SSP-PED-02 Apnée du nourrisson   | Pediatric  | 128      | NEEDS_FIX    | **Caffeine dose toxic risk**, DD missing VRS                  |
| SSP-URG-01 Choc                  | Urgences   | 128      | NEEDS_FIX    | Wrong lactate threshold, wrong fill rate, noradrenaline range |

**Pass rate: 1/5 (20%)**

## Critical findings by card

### SSP-NEU-08 Parésie

1. **Wrong intubation threshold for Guillain-Barré**: card says CV < 15 mL/kg, correct is **CV < 20 mL/kg, PiMax < 30, PeMax < 40** (règle des 20/30/40)
2. **Missing myasthenia from DD top5**: replace polyneuropathie diabétique (last) with myasthénie
3. **Outdated Tensilon test reference**: edrophonium test withdrawn from Swiss market; replace with "test au glaçon + Ac anti-RACh/anti-MuSK"
4. **Missing dexamethasone dose**: compression médullaire tumorale → bolus 10 mg IV puis 4 mg × 4/j
5. **Missing dissection carotidienne red flag**: cervicalgie + Horner + déficit chez jeune adulte = ESO 2021 classic
6. **Duplicate [VÉRIFIER:] marker**: Ig IV posologie appears 2× — keep one
7. **Missing aspirine post-AVC**: 300 mg PO at 24-48h post-thrombolyse for prévention secondaire

### SSP-GYN-10 Saignement vaginal

1. **Wrong anti-D dose**: card says `anti-D 200 µg IM`, Swiss standard is **Rhophylac 300 µg IM** (200 = obsolete French dose for early pregnancy)
2. **Underdosed oxytocine**: card says `20 UI/500 mL`, correct CHUV = **20-40 UI dans 500-1000 mL NaCl à 250 mL/h**
3. **DD top5 missing prævia/HRP**: replace #5 (fonctionnels/fibrome) with combined "Placenta prævia / HRP (2e-3e trim)"
4. **Missing acide tranexamique 1 g IV** in acute PPH (only oral mentioned)
5. **Missing nicardipine** for HTA gravidique if pré-éclampsie/HRP context

### SSP-PED-02 Apnée du nourrisson ⚠️ TOXIC RISK

1. **Caffeine dose ERROR (potentially toxic)**: card says `20 mg/kg charge puis 5-10 mg/kg/j`, correct is **10 mg/kg IV/PO charge puis 2.5-5 mg/kg/j** (caféine citrate). The 20 mg/kg dose is ambiguous and could be dangerous if interpreted as caffeine base.
2. **Azithromycin pertussis dose missing precision**: should be **10 mg/kg/d × 5j si < 6 mois**
3. **DD top5 missing VRS bronchiolitis / sepsis**: major cause of apnea < 3 months; replace "convulsions occultes" or merge with neuro DD

### SSP-URG-01 Choc

1. **Wrong lactate threshold**: card says `lactates > 2`, SSC 2021 says **lactates > 4 mmol/L** = severe hyperlactatemia
2. **Wrong fill rate**: card says `500 mL/15 min`, SSC 2021 says **30 mL/kg cristalloïdes en 30 min** (~2000-2500 mL adulte)
3. **Noradrenaline range too high**: card says `0.1-3 µg/kg/min`, CHUV standard **0.05-0.5 µg/kg/min** (3 µg/kg/min = extreme, ischemic risk)
4. **Missing hydrocortisone 200 mg/j IV** for vasopressor-refractory septic shock (SSC 2021)
5. **Missing calcium gluconate 1g IV** for refractory anaphylaxis
6. **Sepsis bundle naming**: card mentions "3h", SSC 2021 = **bundle 1h** (lactates, hemocultures, ATB, fluid)

## Patterns observed across the 5 reviews

1. **Dose-level errors are the most common defect type** (4/5 cards) — the v3 generation prompt did not enforce verification of exact doses against authoritative sources
2. **DD top5 sometimes ranks "interesting" over "frequent"** (NEU, PED) — review prompts caught this consistently
3. **Some `[VÉRIFIER:]` markers flag settled science** (e.g., Tensilon test withdrawn) — needs cleanup
4. **Missing Swiss-specific content**: Rhophylac dose, CHUV protocols, OFROU/PAFA references
5. **One card APPROVED** (PSY-07) — high-quality cards exist, the v3 prompt CAN produce ready content; quality varies by clinical domain complexity

## Cost / scale extrapolation

- 5 reviews used ~320k tokens (avg 64k/review)
- 146 cards total → review all = ~9.4M tokens
- At current findings rate: ~80% would be NEEDS_FIX, ~20% APPROVED

## Recommended next steps

1. **Apply the 4 specific fixes from this smoke test** (~30 min via Edit) — low-risk, very specific changes
2. **Iterate review prompt** to include "dose verification table" requirement (forces explicit comparison against authoritative values)
3. **Scale review to next 10-20 cards** OR **scale fix-pass to current 4 NEEDS_FIX**
4. **Decision**: pause to validate fix workflow with user before scaling, or push through full review
