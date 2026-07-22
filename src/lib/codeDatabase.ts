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

/**
 * How confidently we recognized a line:
 *   exact       — the printed code is a real CPT/HCPCS/revenue code we hold
 *   chargemaster— the code is a hospital-internal number that embeds a real code
 *   department  — we only recognized the revenue department, not the procedure
 * "department" is a genuinely weaker match. It is tracked separately so the
 * verified-code metric can't be inflated by department-only recognitions.
 */
export type MatchType = "exact" | "chargemaster" | "department";

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
  { code: "73080", system: "CPT", name: "Elbow X-ray, 3 or more views", category: "Imaging", medicareRate: 30 },
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
  { code: "99215", system: "CPT", name: "Office visit, established patient, level 5 (most complex)", category: "ER / office visit", medicareRate: 185 },

  // ---- Eye exams & eye surgery ----
  { code: "92002", system: "CPT", name: "Eye exam, new patient, intermediate", category: "Eye care", medicareRate: 75 },
  { code: "92004", system: "CPT", name: "Eye exam, new patient, comprehensive", category: "Eye care", medicareRate: 130 },
  { code: "92012", system: "CPT", name: "Eye exam, established patient, intermediate", category: "Eye care", medicareRate: 80 },
  { code: "67904", system: "CPT", name: "Surgical repair of droopy eyelid (levator resection)", category: "Eye care", medicareRate: 600, note: "Surgeon's fee. The facility bills its own separate charge for the same operation." },

  // ---- Common HCPCS drugs (per-unit, ASP-based — approximate & volatile) ----
  { code: "J1885", system: "HCPCS", name: "Ketorolac (Toradol) injection", category: "Drug", medicareRate: 1.5, unit: "per 15 mg", note: "Per-unit ASP price; verify units billed." },
  { code: "J2405", system: "HCPCS", name: "Ondansetron (Zofran) injection", category: "Drug", medicareRate: 0.3, unit: "per 1 mg", note: "Per-unit ASP price." },
  { code: "J7613", system: "HCPCS", name: "Albuterol, inhalation solution", category: "Drug", medicareRate: 0.05, unit: "per 1 mg", note: "Per-unit ASP price." },
  { code: "J1200", system: "HCPCS", name: "Diphenhydramine (Benadryl) injection", category: "Drug", medicareRate: 0.2, unit: "per 50 mg", note: "Per-unit ASP price." },
  { code: "J2550", system: "HCPCS", name: "Promethazine (Phenergan) injection", category: "Drug", medicareRate: 0.3, unit: "per 50 mg", note: "Per-unit ASP price." },
  { code: "J7120", system: "HCPCS", name: "Lactated Ringer's IV fluid", category: "Drug", medicareRate: 1.5, unit: "per 1,000 mL", note: "A bag of basic IV fluid. Per-unit ASP price." },
  { code: "J0690", system: "HCPCS", name: "Cefazolin (Ancef) antibiotic injection", category: "Drug", medicareRate: 0.7, unit: "per 500 mg", note: "Per-unit ASP price." },
  { code: "J0131", system: "HCPCS", name: "Acetaminophen (IV Tylenol) injection", category: "Drug", medicareRate: 0.08, unit: "per 10 mg", note: "Per-unit ASP price." },
  { code: "J3010", system: "HCPCS", name: "Fentanyl injection (pain relief)", category: "Drug", medicareRate: 0.3, unit: "per 0.1 mg", note: "Per-unit ASP price." },
  { code: "J1100", system: "HCPCS", name: "Dexamethasone injection (steroid)", category: "Drug", medicareRate: 0.1, unit: "per 1 mg", note: "Per-unit ASP price." },
  { code: "J2704", system: "HCPCS", name: "Propofol injection (anesthetic)", category: "Drug", medicareRate: 0.15, unit: "per 10 mg", note: "Per-unit ASP price." },
  { code: "J2250", system: "HCPCS", name: "Midazolam (Versed) injection (sedative)", category: "Drug", medicareRate: 0.2, unit: "per 1 mg", note: "Per-unit ASP price." },

  // ---- Implantable device categories (HCPCS C-codes, hospital outpatient) ----
  // C-codes have NO separate Medicare payment: under the outpatient payment system
  // the device is packaged into the payment for the procedure itself. That is the
  // single most useful fact for a patient staring at $1,205 per screw, so it is
  // recorded as a note rather than a rate.
  { code: "C1713", system: "HCPCS", name: "Surgical screw / anchor (bone fixation implant)", category: "Implant", note: "Medicare pays nothing separately for this device — its cost is bundled into the payment for the surgery. A per-screw line charge has no Medicare equivalent to compare against, which is why hospital prices for implants vary enormously." },
  { code: "C1776", system: "HCPCS", name: "Joint implant device", category: "Implant", note: "Device cost is bundled into the surgery payment under Medicare, not paid separately." },

  // ---- Revenue codes (department/category only — no price) ----
  { code: "0110", system: "Revenue", name: "Room & board, private", category: "Room & board" },
  { code: "0120", system: "Revenue", name: "Room & board, semi-private", category: "Room & board" },
  { code: "0250", system: "Revenue", name: "Pharmacy", category: "Pharmacy" },
  { code: "0258", system: "Revenue", name: "IV solutions", category: "Pharmacy" },
  { code: "0251", system: "Revenue", name: "Pharmacy — generic drugs", category: "Pharmacy" },
  { code: "0252", system: "Revenue", name: "Pharmacy — brand-name (single source) drugs", category: "Pharmacy" },
  { code: "0260", system: "Revenue", name: "IV therapy", category: "Pharmacy" },
  { code: "0270", system: "Revenue", name: "Medical/surgical supplies", category: "Supplies" },
  { code: "0271", system: "Revenue", name: "Non-sterile supplies", category: "Supplies" },
  { code: "0272", system: "Revenue", name: "Sterile supplies", category: "Supplies", note: "Reusable surgical instruments (drill bits, saw blades, tourniquets) are often billed here as if they were single-use supplies. Worth asking whether the item was disposable." },
  { code: "0278", system: "Revenue", name: "Implants", category: "Implant", note: "Implant charges are a common source of very large markups and have no Medicare per-item benchmark." },
  { code: "0300", system: "Revenue", name: "Laboratory", category: "Lab" },
  { code: "0301", system: "Revenue", name: "Laboratory — chemistry", category: "Lab" },
  { code: "0305", system: "Revenue", name: "Laboratory — hematology", category: "Lab" },
  { code: "0320", system: "Revenue", name: "Radiology — diagnostic", category: "Imaging" },
  { code: "0324", system: "Revenue", name: "Radiology — chest X-ray", category: "Imaging" },
  { code: "0350", system: "Revenue", name: "CT scan", category: "Imaging" },
  { code: "0351", system: "Revenue", name: "CT scan — head", category: "Imaging" },
  { code: "0360", system: "Revenue", name: "Operating room services", category: "Operating room", note: "Medicare does not pay for operating-room time by the minute — it is bundled into a single payment for the procedure. Per-minute OR billing has no Medicare rate to compare against." },
  { code: "0370", system: "Revenue", name: "Anesthesia", category: "Anesthesia", note: "Medicare pays anesthesia using base units plus time units, not a hospital per-minute rate. Ask for the anesthesia time record and the base unit calculation." },
  { code: "0410", system: "Revenue", name: "Respiratory services", category: "Respiratory" },
  { code: "0450", system: "Revenue", name: "Emergency room", category: "ER" },
  { code: "0460", system: "Revenue", name: "Pulmonary function", category: "Respiratory" },
  { code: "0480", system: "Revenue", name: "Cardiology", category: "Cardiac" },
  { code: "0730", system: "Revenue", name: "EKG / ECG", category: "Cardiac" },
  { code: "0636", system: "Revenue", name: "Drugs requiring detailed coding", category: "Pharmacy" },
  { code: "0637", system: "Revenue", name: "Self-administered drugs", category: "Pharmacy", note: "Self-administered drugs are frequently disputable." },
  { code: "0710", system: "Revenue", name: "Recovery room", category: "Recovery room", note: "Recovery-room time is normally bundled into the payment for the surgery. Separate hourly recovery charges are worth questioning." },
  { code: "0762", system: "Revenue", name: "Observation hours", category: "Observation", note: "Observation status is billed as outpatient even when you stayed overnight, which can cost far more. Ask whether you were admitted or observed." },
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
 * Hospital chargemaster numbers are internal item IDs, but they are built from a
 * 3-digit revenue code followed by filler and, sometimes, a real billing code:
 *
 *   278C1713S1  ->  rev 0278 (implants)      + HCPCS C1713 (surgical screw)
 *   3207308001  ->  rev 0320 (radiology)     + CPT 73080 (elbow X-ray)
 *   27200000S1  ->  rev 0272 (sterile supply), no embedded code
 *
 * We only ever accept an embedded code that already exists in this table, so an
 * unrecognized item degrades to "we know the department" rather than inventing a
 * procedure. Returns the most specific record found, plus how it was matched.
 */
export function decomposeChargemaster(
  raw: string
): { record: CodeRecord; matchType: MatchType; department?: CodeRecord } | null {
  const n = normalizeCode(raw);
  // Real codes are <= 6 characters; anything longer is an internal item number.
  if (n.length < 7) return null;

  const dept = MAP.get("0" + n.slice(0, 3));
  if (!dept || dept.system !== "Revenue") return null;

  const rest = n.slice(3);
  // An embedded CPT is 5 digits; an embedded HCPCS is a letter plus 4 digits.
  const candidates = [rest.slice(0, 5), (rest.match(/[A-Z]\d{4}/) ?? [])[0]];
  for (const c of candidates) {
    if (!c) continue;
    const hit = MAP.get(c);
    if (hit && hit.system !== "Revenue") {
      return { record: hit, matchType: "chargemaster", department: dept };
    }
  }
  return { record: dept, matchType: "department" };
}

/**
 * Revenue-category name aliases (#5). Bills routinely print the standard UB-04
 * category name instead of the number — "Laboratory - General Classification"
 * rather than 0300.
 *
 * Deliberately conservative: we only fall back to a name match when the
 * description carries a UB-04 giveaway phrase ("General Classification" /
 * "Extension of"). Matching bare category words would misread supply lines like
 * "Anesthesia kit, adult" as the anesthesia department.
 */
const REVENUE_NAME_ALIASES: Record<string, string> = {
  "room & board": "0110",
  "room and board": "0110",
  pharmacy: "0250",
  "iv therapy": "0260",
  "iv solutions": "0258",
  "medical/surgical supplies": "0270",
  "med-surg supplies": "0270",
  "sterile supply": "0272",
  "non-sterile supply": "0271",
  implants: "0278",
  laboratory: "0300",
  "laboratory - chemistry": "0301",
  radiology: "0320",
  "ct scan": "0350",
  "operating room services": "0360",
  "operating room": "0360",
  anesthesia: "0370",
  "respiratory services": "0410",
  "emergency room": "0450",
  "recovery room": "0710",
  observation: "0762",
};

const UB04_GIVEAWAY = /general classification|extension of/i;

/** Match a revenue department from a printed UB-04 category name. Null if not confident. */
export function lookupByDescription(description: string): CodeRecord | null {
  if (!description || !UB04_GIVEAWAY.test(description)) return null;
  // "Pharmacy - Extension of 025x - Single Source Drug" -> "pharmacy"
  const head = description.split(/\s+[-–—]\s+/)[0].trim().toLowerCase();
  const code = REVENUE_NAME_ALIASES[head];
  return code ? MAP.get(code) ?? null : null;
}

/**
 * Ground a single line item against the reference DB (mutates in place):
 * confirm the code, attach its category, and replace the model's guessed
 * Medicare rate with the authoritative benchmark where we have one.
 */
export function groundLineItem(item: {
  code?: unknown;
  description?: unknown;
  quantity?: number | null;
  medicareRate?: number;
  medicareUnitRate?: number;
  medicareRateUnit?: string;
  codeVerified?: boolean;
  codeCategory?: string;
  codeName?: string;
  codeNote?: string;
  matchType?: MatchType;
  resolvedCode?: string;
  rateSource?: "benchmark" | "estimated" | undefined;
}): void {
  if (!item) return;

  // Three resolution paths, most specific first:
  //   1. the printed code is a real code
  //   2. it is a chargemaster number that embeds one (or at least names a department)
  //   3. no usable code at all — fall back to the printed UB-04 category name
  let rec: CodeRecord | null = null;
  let matchType: MatchType | null = null;
  let department: CodeRecord | undefined;

  if (typeof item.code === "string") {
    rec = lookupCode(item.code);
    if (rec) matchType = "exact";
    if (!rec) {
      const decomposed = decomposeChargemaster(item.code);
      if (decomposed) {
        rec = decomposed.record;
        matchType = decomposed.matchType;
        department = decomposed.department;
      }
    }
  }
  if (!rec && typeof item.description === "string") {
    rec = lookupByDescription(item.description);
    if (rec) matchType = "department";
  }

  if (!rec || !matchType) {
    item.codeVerified = false;
    if (typeof item.medicareRate === "number") item.rateSource = "estimated";
    return;
  }

  item.codeVerified = true;
  item.matchType = matchType;
  item.resolvedCode = rec.code;
  item.codeCategory = rec.category;
  item.codeName = rec.name;
  // Surface the department's caveat too when a chargemaster number resolved to a
  // specific code inside a department that carries one (e.g. implants, OR time).
  item.codeNote = [rec.note, department?.note].filter(Boolean).join(" ") || undefined;

  if (typeof rec.medicareRate === "number") {
    if (rec.unit) {
      // Per-unit pricing (drugs). The charge covers `quantity` units, so comparing it
      // against ONE unit's rate overstates the markup by exactly the quantity —
      // $92 of IV acetaminophen reads as 1,150x instead of ~11x. Without a trustworthy
      // unit count we publish no benchmark at all rather than an alarming wrong one.
      const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : null;
      item.medicareUnitRate = rec.medicareRate;
      item.medicareRateUnit = rec.unit;
      if (qty === null) {
        delete item.medicareRate;
        item.rateSource = undefined;
        item.codeNote = [item.codeNote, `Priced ${rec.unit}. We could not read how many units were billed, so we are not quoting a Medicare comparison for this line — ask the hospital for the units billed.`]
          .filter(Boolean)
          .join(" ");
      } else {
        item.medicareRate = Math.round(rec.medicareRate * qty * 100) / 100;
        item.rateSource = "benchmark";
      }
    } else {
      item.medicareRate = rec.medicareRate; // authoritative benchmark wins over the guess
      item.rateSource = "benchmark";
    }
  } else if (typeof item.medicareRate === "number") {
    // A department match tells us what the charge is FOR, never what it should cost —
    // so any rate still standing here is the model's estimate, not a benchmark.
    item.rateSource = "estimated";
  }
}

export const CODE_DB_SIZE = RECORDS.length;
export const RATE_BASIS =
  "Approximate Medicare national benchmark rates, curated for common bill codes. " +
  "Full CMS fee schedules pending import for exact figures.";
