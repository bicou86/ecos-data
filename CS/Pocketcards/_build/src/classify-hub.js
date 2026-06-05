// Deterministic re-classification of the 52 hub cards from their REAL titles
// (the content audit scrambled some RMS cards, so titles are the reliable source).

import { writeFileSync } from "node:fs";

// [id, title] — authoritative hub titles
const CARDS = [
  ["3158563148fa81b8972ee2976e488df3", "Anamnèse Systématique"],
  ["3158563148fa8181b4f2f712396cb1dc", "Communication"],
  ["3158563148fa8193808af6641a3742bc", "Red Flags par Système"],
  ["3158563148fa81ec8b2ad629b391b706", "Scores & Critères Essentiels"],
  ["3158563148fa81379e3fcd44560c636f", "Réflexes Médicamenteux"],
  ["3158563148fa81a2b3c0de6c4a04afdf", "Dermatomes, ROT & Testing Moteur"],
  ["3158563148fa8164a9e7cdc44c6feab2", "ECG & Auscultation Express"],
  ["31b8563148fa8188978ddf7c7eda3584", "Gazométrie — Interprétation"],
  ["3158563148fa8199a93cf15589c2088c", "Valeurs Normales & Repères"],
  ["3158563148fa81cdb62af69a0f2cbe30", "Syndromes Sémiologiques"],
  ["3158563148fa8198af42e9a787b5487a", "Gestes & Procédures"],
  [
    "3158563148fa81858a14cc90ac2e1d32",
    "Urgences — Réflexes Vitaux (ABCDE / SAMPLE)",
  ],
  ["3158563148fa81f18b7bef27ced0c9c5", "Mnémoniques ECOS"],
  ["35f8563148fa81298eebe1195d844383", "Glasgow (GCS) & FOUR Score"],
  ["35f8563148fa81ee8c78ec167346dc66", "MMSE & MoCA (Dépistage Cognitif)"],
  ["35f8563148fa8130ade6f3970d378f6c", "Évaluation Nutritionnelle"],
  [
    "35f8563148fa81a09045cb64a6ad60e1",
    "Évaluation Risque de Chute (Gériatrie)",
  ],
  ["35f8563148fa813ca1a2f9f4235f7afc", "Anamnèse Sexuelle 6 Points"],
  ["36b8563148fa81f2adbbd2571d3270a4", "HEEADSSS — Anamnèse Adolescent"],
  ["36b8563148fa81b087e4cf689bcbd51e", "ACOD — Anticoagulants Oraux Directs"],
  ["36b8563148fa8168ac06da987bddc04f", "STEMI — Réflexes Urgence Vitale"],
  [
    "36b8563148fa817f90dbc20509a4d53a",
    "Néonatologie — Apgar, Réflexes, Repères",
  ],
  [
    "36b8563148fa81d9b64cff2e0a651704",
    "MTEV — Maladie ThromboEmbolique Veineuse",
  ],
  ["36b8563148fa81ebaa6bc452888ef4dc", "Antidotes — Toxicologie d'urgence"],
  ["36b8563148fa810e9ebff2629eb9d53f", "Cibles Tensionnelles — Urgences"],
  [
    "36b8563148fa812b944bd403e17f978d",
    "Échelles Neurologiques (NIHSS, ABCD², mRS, Glasgow)",
  ],
  [
    "36b8563148fa812d989cca79452dc5e9",
    "Sonde Vésicale — Indications & Technique",
  ],
  [
    "36b8563148fa81bbbd2dc60cf6987393",
    "Traumatologie de la Main — Réflexes Urgence",
  ],
  [
    "36b8563148fa811d8afbf50cc6cbc9a6",
    "Syndrome Radiculaire — Cervical & Lombaire",
  ],
  [
    "36b8563148fa8187b135fe4da34f1a52",
    "EGS — Évaluation Gériatrique Standardisée",
  ],
  [
    "36d8563148fa81f6b12ecfb65a947c2e",
    "Sevrage Nicotine — Réflexes & Thérapeutiques",
  ],
  ["36d8563148fa81558c07d422dc9cbb88", "Neuroimagerie d'Urgence — CT vs IRM"],
  ["36d8563148fa81dfb35ff5104c410a26", "Examen Postural & Équilibre"],
  [
    "36d8563148fa818498e6e21cdd2d551f",
    "Pocketcard — Insuffisance Cardiaque (SSC 2022)",
  ],
  [
    "36d8563148fa817d8839e9a981c2df60",
    "Pocketcard — Gestion de la Glycémie Hospitalière",
  ],
  [
    "36d8563148fa81d7a5b0f0a1e377b90c",
    "Pocketcard — AVC : Reconnaissance & Filière",
  ],
  [
    "36d8563148fa811d9a9dcfc104d5ca11",
    "Pocketcard — Thrombolyse IV & Thrombectomie EV",
  ],
  [
    "36d8563148fa81c38c7fc0b5228ccd6b",
    "Pocketcard — Vertiges : HINTS+ & DD Central/Périphérique",
  ],
  ["36d8563148fa8167b742d0ebc4a2ba90", "Pocketcard — Diurétiques"],
  [
    "36d8563148fa81ad9346c6c9a06706de",
    "Pocketcard — Opioïdes : Conversion & Rotation",
  ],
  ["36d8563148fa81fcb59ac878a9b698ec", "RMS — Examen Abdominal"],
  ["36d8563148fa812b8639efbaa750b025", "RMS — Examen Cardiovasculaire"],
  ["36d8563148fa81309a87f272b0288b03", "RMS — Examen Cheville & Pied"],
  ["36d8563148fa81be87bdc17859c3aa89", "RMS — Examen du Coude"],
  ["36d8563148fa813e87bad69fbcd76879", "RMS — Examen de l'Épaule"],
  ["36d8563148fa81e9b817f8848e87b46f", "RMS — GALS"],
  ["36d8563148fa812ab443e5b6caefb454", "RMS — Examen du Genou"],
  ["36d8563148fa816193dce8a37c6300e6", "RMS — Examen de la Hanche"],
  ["36d8563148fa81e493a9e4341f5028cf", "RMS — Examen Main & Poignet"],
  ["36d8563148fa81d79271d42b350e4e2d", "RMS — Examen Neurologique"],
  ["36d8563148fa810095e6de52c2d2f691", "RMS — Examen Pulmonaire"],
  ["36d8563148fa819cb906fe75861ff5e1", "RMS — Examen du Rachis"],
];

// explicit per-title classification {type, spec, images, src}
const T = {
  SCORE: "📊 Score / Échelle",
  MED: "💊 Réflexe médicament",
  RMS: "🩺 Examen RMS",
  REF: "📋 Aide-mémoire / Référence",
  GESTE: "✋ Geste / Procédure",
  COM: "🗣️ Anamnèse / Communication",
};
const MAP = {
  "Anamnèse Systématique": [T.COM, "Fondamentaux & Communication"],
  Communication: [T.COM, "Fondamentaux & Communication"],
  "Red Flags par Système": [T.REF, "Transversal"],
  "Scores & Critères Essentiels": [T.SCORE, "Transversal"],
  "Réflexes Médicamenteux": [T.MED, "Transversal"],
  "Dermatomes, ROT & Testing Moteur": [T.REF, "Neurologie"],
  "ECG & Auscultation Express": [T.REF, "Cardiologie & Vasculaire"],
  "Gazométrie — Interprétation": [T.REF, "Pneumologie"],
  "Valeurs Normales & Repères": [T.REF, "Transversal"],
  "Syndromes Sémiologiques": [T.REF, "Transversal"],
  "Gestes & Procédures": [T.GESTE, "Transversal"],
  "Urgences — Réflexes Vitaux (ABCDE / SAMPLE)": [T.REF, "Urgences Vitales"],
  "Mnémoniques ECOS": [T.REF, "Transversal"],
  "Glasgow (GCS) & FOUR Score": [T.SCORE, "Neurologie"],
  "MMSE & MoCA (Dépistage Cognitif)": [T.SCORE, "Neurologie"],
  "Évaluation Nutritionnelle": [T.SCORE, "Transversal"],
  "Évaluation Risque de Chute (Gériatrie)": [T.SCORE, "Médecine Interne"],
  "Anamnèse Sexuelle 6 Points": [T.COM, "Fondamentaux & Communication"],
  "HEEADSSS — Anamnèse Adolescent": [T.COM, "Pédiatrie"],
  "ACOD — Anticoagulants Oraux Directs": [T.MED, "Cardiologie & Vasculaire"],
  "STEMI — Réflexes Urgence Vitale": [T.MED, "Cardiologie & Vasculaire"],
  "Néonatologie — Apgar, Réflexes, Repères": [T.SCORE, "Pédiatrie"],
  "MTEV — Maladie ThromboEmbolique Veineuse": [
    T.SCORE,
    "Cardiologie & Vasculaire",
  ],
  "Antidotes — Toxicologie d'urgence": [T.MED, "Urgences Vitales"],
  "Cibles Tensionnelles — Urgences": [T.MED, "Urgences Vitales"],
  "Échelles Neurologiques (NIHSS, ABCD², mRS, Glasgow)": [
    T.SCORE,
    "Neurologie",
  ],
  "Sonde Vésicale — Indications & Technique": [T.GESTE, "Néphro-Urologie"],
  "Traumatologie de la Main — Réflexes Urgence": [
    T.REF,
    "Musculo-Squelettique",
  ],
  "Syndrome Radiculaire — Cervical & Lombaire": [T.REF, "Musculo-Squelettique"],
  "EGS — Évaluation Gériatrique Standardisée": [T.SCORE, "Médecine Interne"],
  "Sevrage Nicotine — Réflexes & Thérapeutiques": [
    T.MED,
    "Fondamentaux & Communication",
  ],
  "Neuroimagerie d'Urgence — CT vs IRM": [T.REF, "Neurologie"],
  "Examen Postural & Équilibre": [T.RMS, "Musculo-Squelettique"],
  "Pocketcard — Insuffisance Cardiaque (SSC 2022)": [
    T.REF,
    "Cardiologie & Vasculaire",
  ],
  "Pocketcard — Gestion de la Glycémie Hospitalière": [T.MED, "Endocrinologie"],
  "Pocketcard — AVC : Reconnaissance & Filière": [T.REF, "Neurologie"],
  "Pocketcard — Thrombolyse IV & Thrombectomie EV": [T.MED, "Neurologie"],
  "Pocketcard — Vertiges : HINTS+ & DD Central/Périphérique": [
    T.REF,
    "Neurologie",
  ],
  "Pocketcard — Diurétiques": [T.MED, "Néphro-Urologie"],
  "Pocketcard — Opioïdes : Conversion & Rotation": [T.MED, "Transversal"],
  "RMS — Examen Abdominal": [T.RMS, "Gastro-Hépatologie", true, true],
  "RMS — Examen Cardiovasculaire": [
    T.RMS,
    "Cardiologie & Vasculaire",
    true,
    true,
  ],
  "RMS — Examen Cheville & Pied": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — Examen du Coude": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — Examen de l'Épaule": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — GALS": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — Examen du Genou": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — Examen de la Hanche": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — Examen Main & Poignet": [T.RMS, "Musculo-Squelettique", true, true],
  "RMS — Examen Neurologique": [T.RMS, "Neurologie", true, true],
  "RMS — Examen Pulmonaire": [T.RMS, "Pneumologie", true, true],
  "RMS — Examen du Rachis": [T.RMS, "Musculo-Squelettique", true, true],
};

const plan = [];
const missing = [];
for (const [id, title] of CARDS) {
  const m = MAP[title];
  if (!m) {
    missing.push(title);
    continue;
  }
  const [type, spec, images, src] = m;
  const props = { Type: type, Spécialité: spec };
  if (src) props["Source"] = "RMS (Revue Médicale Suisse)";
  if (images) props["Images à intégrer"] = "__YES__";
  plan.push({ id, props });
}
writeFileSync(
  new URL("../../dist/notion/prop-plan.json", import.meta.url),
  JSON.stringify(plan),
);
console.log(
  "Plan déterministe:",
  plan.length,
  "| non classés:",
  missing.length ? missing.join(", ") : "aucun",
);
process.stdout.write("\n" + JSON.stringify(plan));
