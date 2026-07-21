// Deterministic medical-code lookup — the "source of truth" layer.
//
// Claude reads the bill and decodes each code into plain English (the LLM's job).
// This module supplies the *authoritative* facts — does the code exist, what
// category is it, and what does Medicare actually pay — so dollar comparisons are
// grounded in real data instead of the model's memory.
//
// Rates below are approximate Medicare NATIONAL benchmark averages, curated for the
// codes that actually show up on common hospital/ER bills. They are intentionally
// structured so the full CMS fee schedules (Physician Fee Schedule, Clinical Lab
// Fee Schedule, OPPS) can be imported later to replace these seed values with exact
// figures. Descriptions are plain-language and authored here — not the AMA's
// copyrighted CPT descriptors.

export type CodeSystem = "CPT" | "HCPCS" | "Revenue";

export interface CodeRecord {
  code: string;
  system: CodeSystem;
  name: string;            // plain-language reference name (not AMA verbatim)
  category: string;
  medicareRate?: number;   // approx Medicare national benchmark, USD (per unit for drugs)
  unit?: string;           // present for per-unit drug codes
  note?: string;
}

const RECORDS: CodeRecord[] = [
  // ---- Labs (Clinical Lab Fee Schedule, approx) ----
  { code: "36415", system: "CPT", name: "Blood draw (venipuncture)", category: "Lab", medicareRate: 3 },
  { code: "36600", system: "CPT", name: "Arterial blood draw", category: "Lab", medicareRate: 25 },
  { code: "80048", system: "CPT", name: "Basic metabolic panel", category: "Lab", medicareRate: 8 },
  { code: "80053", system: "CPT", name: "Comprehensive metabolic panel", category: "Lab", medicareRate: 12 },
  { code: "80061", system: "CPT", name: "Lipid (cholesterol) panel", category: "Lab", medicareRate: 13 },
  { code: "80076", system: "CPT", name: "Liver function panel", category: "Lab", medicareRate: 9 },
  { code: "85025", system: "CPT", name: "Complete blood count with differential", category: "Lab", medicareRate: 9 },
  { code: "85027", system: "CPT", name: "Complete blood count", category: "Lab", medicareRate: 6 },
  { code: "84443", system: "CPT", name: "Thyroid (TSH) test", category: "Lab", medicareRate: 18 },
  { code: "83036", system: "CPT", name: "Hemoglobin A1c (diabetes) test", category: "Lab", medicareRate: 9 },
  { code: "82947", system: "CPT", name: "Blood glucose test", category: "Lab", medicareRate: 4 },
  { code: "84484", system: "CPT", name: "Troponin (heart) test", category: "Lab", medicareRate: 13 },
  { code: "81001", system: "CPT", name: "Urinalysis with microscope", category: "Lab", medicareRate: 4 },
  { code: "81003", system: "CPT", name: "Urinalysis, automated", category: "Lab", medicareRate: 3 },
  { code: "87086", system: "CPT", name: "Urine culture", category: "Lab", medicareRate: 11 },
  { code: "82805", system: "CPT", name: "Arterial blood gas", category: "Lab", medicareRate: 28 },

  // ---- Imaging ----
  { code: "71045", system: "CPT", name: "Chest X-ray, 1 view", category: "Imaging", medicareRate: 28 },
  { code: "71046", system: "CPT", name: "Chest X-ray, 2 views", category: "Imaging", medicareRate: 34 },
  { code: "74018", system: "CPT", name: "Abdomen X-ray, 1 view", category: "Imaging", medicareRate: 26 },
  { code: "70450", system: "CPT", name: "CT scan of head, no contrast", category: "Imaging", medicareRate: 130 },
  { code: "71260", system: "CPT", name: "CT scan of chest, with contrast", category: "Imaging", medicareRate: 180 },
  { code: "72148", system: "CPT", name: "MRI of lower back, no contrast", category: "Imaging", medicareRate: 220 },
  { code: "76700", system: "CPT", name: "Abdominal ultrasound, complete", category: "Imaging", medicareRate: 95 },

  // ---- Cardiac / EKG ----
  { code: "93000", system: "CPT", name: "EKG, complete (with reading)", category: "Cardiac", medicareRate: 16 },
  { code: "93005", system: "CPT", name: "EKG tracing only", category: "Cardiac", medicareRate: 8 },
  { code: "93010", system: "CPT", name: "EKG interpretation only", category: "Cardiac", medicareRate: 8 },

  // ---- Respiratory ----
  { code: "94640", system: "CPT", name: "Breathing treatment (nebulizer)", category: "Respiratory", medicareRate: 13 },
  { code: "94060", system: "CPT", name: "Breathing test (spirometry, pre/post)", category: "Respiratory", medicareRate: 40 },
  { code: "94760", system: "CPT", name: "Pulse oximetry (oxygen check), single", category: "Respiratory", medicareRate: 3 },
  { code: "94761", system: "CPT", name: "Pulse oximetry, multiple", category: "Respiratory", medicareRate: 5 },
  { code: "94668", system: "CPT", name: "Chest physical therapy", category: "Respiratory", medicareRate: 18 },

  // ---- ER & office visits (E&M) ----
  { code: "99281", system: "CPT", name: "ER visit, level 1 (minor)", category: "ER / office visit", medicareRate: 25 },
  { code: "99282", system: "CPT", name: "ER visit, level 2", category: "ER / office visit", medicareRate: 50 },
  { code: "99283", system: "CPT", name: "ER visit, level 3", category: "ER / office visit", medicareRate: 90 },
  { code: "99284", system: "CPT", name: "ER visit, level 4", category: "ER / office visit", medicareRate: 140 },
  { code: "99285", system: "CPT", name: "ER visit, level 5 (most severe)", category: "ER / office visit", medicareRate: 210 },
  { code: "99291", system: "CPT", name: "Critical care, first hour", category: "ER / office visit", medicareRate: 230 },
  { code: "99213", system: "CPT", name: "Office visit, established patient, level 3", category: "ER / office visit", medicareRate: 92 },
  { code: "99214", system: "CPT", name: "Office visit, established patient, level 4", category: "ER / office visit", medicareRate: 132 },

  // ---- Common HCPCS drugs (per-unit, ASP-based — approximate & volatile) ----
  { code: "J1885", system: "HCPCS", name: "Ketorolac (Toradol) injection", category: "Drug", medicareRate: 1.5, unit: "per 15 mg", note: "Per-unit ASP price; verify units billed." },
  { code: "J2405", system: "HCPCS", name: "Ondansetron (Zofran) injection", category: "Drug", medicareRate: 0.3, unit: "per 1 mg", note: "Per-unit ASP price." },
  { code: "J7613", system: "HCPCS", name: "Albuterol, inhalation solution", category: "Drug", medicareRate: 0.05, unit: "per 1 mg", note: "Per-unit ASP price." },
  { code: "J1200", system: "HCPCS", name: "Diphenhydramine (Benadryl) injection", category: "Drug", medicareRate: 0.2, unit: "per 50 mg", note: "Per-unit ASP price." },
  { code: "J2550", system: "HCPCS", name: "Promethazine (Phenergan) injection", category: "Drug", medicareRate: 0.3, unit: "per 50 mg", note: "Per-unit ASP price." },

  // ---- Revenue codes (department/category only — no price) ----
  { code: "0110", system: "Revenue", name: "Room & board, private", category: "Room & board" },
  { code: "0120", system: "Revenue", name: "Room & board, semi-private", category: "Room & board" },
  { code: "0250", system: "Revenue", name: "Pharmacy", category: "Pharmacy" },
  { code: "0258", system: "Revenue", name: "IV solutions", category: "Pharmacy" },
  { code: "0270", system: "Revenue", name: "Medical/surgical supplies", category: "Supplies" },
  { code: "0300", system: "Revenue", name: "Laboratory", category: "Lab" },
  { code: "0301", system: "Revenue", name: "Laboratory — chemistry", category: "Lab" },
  { code: "0305", system: "Revenue", name: "Laboratory — hematology", category: "Lab" },
  { code: "0320", system: "Revenue", name: "Radiology — diagnostic", category: "Imaging" },
  { code: "0410", system: "Revenue", name: "Respiratory services", category: "Respiratory" },
  { code: "0450", system: "Revenue", name: "Emergency room", category: "ER" },
  { code: "0460", system: "Revenue", name: "Pulmonary function", category: "Respiratory" },
  { code: "0480", system: "Revenue", name: "Cardiology", category: "Cardiac" },
  { code: "0730", system: "Revenue", name: "EKG / ECG", category: "Cardiac" },
  { code: "0636", system: "Revenue", name: "Drugs requiring detailed coding", category: "Pharmacy" },
  { code: "0637", system: "Revenue", name: "Self-administered drugs", category: "Pharmacy", note: "Self-administered drugs are frequently disputable." },
];

const MAP = new Map<string, CodeRecord>();
for (const r of RECORDS) MAP.set(r.code, r);

/** Strip labels/quantities/spacing so a printed code matches the table. */
export function normalizeCode(raw: string): string {
  if (!raw) return "";
  let s = raw.toUpperCase().trim();
  s = s.replace(/^(CPT|HCPCS|ICD-?10-?(?:CM|PCS)?|ICD|REV(?:ENUE)?|CODE)\s*[:#-]?\s*/, "");
  s = s.replace(/\s*[×X]\s*\d+\s*$/, ""); // trailing quantity like "×6" / "X6"
  s = s.replace(/\s+/g, "");
  return s;
}

/** Look up a printed code, tolerating zero-padding quirks. Returns null if unknown. */
export function lookupCode(raw: string): CodeRecord | null {
  const n = normalizeCode(raw);
  if (!n) return null;
  const tries = [n];
  if (/^0\d{5}$/.test(n)) tries.push(n.slice(1)); // 036415 -> 36415 (zero-padded CPT)
  if (/^\d{3}$/.test(n)) tries.push("0" + n);      // 300 -> 0300 (revenue code)
  for (const t of tries) {
    const hit = MAP.get(t);
    if (hit) return hit;
  }
  return null;
}

/**
 * Ground a single line item against the reference DB (mutates in place):
 * confirm the code, attach its category, and replace the model's guessed
 * Medicare rate with the authoritative benchmark where we have one.
 */
export function groundLineItem(item: {
  code?: unknown;
  medicareRate?: number;
  codeVerified?: boolean;
  codeCategory?: string;
  rateSource?: "benchmark" | "estimated";
}): void {
  if (!item || typeof item.code !== "string") return;
  const rec = lookupCode(item.code);
  if (rec) {
    item.codeVerified = true;
    item.codeCategory = rec.category;
    if (typeof rec.medicareRate === "number") {
      item.medicareRate = rec.medicareRate; // authoritative benchmark wins over the guess
      item.rateSource = "benchmark";
    } else if (typeof item.medicareRate === "number") {
      item.rateSource = "estimated";
    }
  } else {
    item.codeVerified = false;
    if (typeof item.medicareRate === "number") item.rateSource = "estimated";
  }
}

export const CODE_DB_SIZE = RECORDS.length;
export const RATE_BASIS =
  "Approximate Medicare national benchmark rates, curated for common bill codes. " +
  "Full CMS fee schedules pending import for exact figures.";
