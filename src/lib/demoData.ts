import type { BillAnalysis } from "./types";

// Real bill: Jackson Purchase Med Ctr — inpatient stay 10/11–10/12/2022
// Patient initials anonymized to T.M.
export const DEMO_BILL: BillAnalysis = {
  patientName: "T.M.",
  facilityName: "Jackson Purchase Med Ctr",
  serviceDate: "10/11/2022 – 10/12/2022",
  totalCharged: 10150.87,
  summary:
    "This is an itemized statement for a one-night inpatient stay at Jackson Purchase Medical Center totaling $10,150.87, of which the patient still owes $8,311.46 after insurance paid $1,839.41. The care centered on a respiratory issue, with multiple breathing treatments, lab tests, a chest X-ray, and an EKG. The biggest concerns are that nearly every lab and diagnostic charge is 10–30× the typical Medicare rate, several tests repeat multiple times, and two expensive inhaler medications ($779 and $119) are major cost drivers.",
  topIssues: [
    "Most lab and diagnostic charges are 10–30× Medicare rates (e.g., $434 for a metabolic panel, $287 for an EKG, $256 for a chest X-ray) — ask about a self-pay or financial-assistance discount.",
    "The $779.93 Fluticasone/Vilanterol inhaler and $119.86 albuterol inhaler are extremely high — request the exact quantity and unit pricing for both.",
    "Both a comprehensive metabolic panel AND a basic metabolic panel were billed — the comprehensive already includes the basic tests. One of these may be a redundant charge.",
    "Respiratory treatments (chest physiotherapy billed 5 times, multiple nebulizer treatments totaling $900+) should be verified against your medical record to confirm each was delivered.",
    "You may qualify for financial assistance or a payment plan on the $8,311.46 balance — request an itemized bill review and ask about charity care programs.",
  ],
  lineItems: [
    {
      code: "0110",
      codeType: "Revenue",
      description: "Room and board — semi-private hospital room for one day of inpatient stay",
      chargedAmount: 1545.34,
      medicareRate: undefined,
      flags: [
        {
          type: "info",
          severity: "green",
          message: "This is the daily hospital room rate for your inpatient stay. It is the largest single charge on the bill.",
        },
      ],
    },
    {
      code: "036600",
      codeType: "CPT",
      description: "Arterial puncture — drawing blood from an artery to check oxygen and gas levels in the blood",
      chargedAmount: 372.28,
      medicareRate: 30,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "An arterial blood draw typically costs Medicare around $25–35. You were charged $372 — roughly 10× that rate. Worth questioning.",
        },
      ],
    },
    {
      code: "036415",
      codeType: "CPT",
      description: "Venipuncture — routine blood draw from a vein (first draw, 10/11)",
      chargedAmount: 69.03,
      medicareRate: 5,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "A simple blood draw is usually about $3–5 under Medicare. $69 is more than 10× that amount.",
        },
      ],
    },
    {
      code: "036415",
      codeType: "CPT",
      description: "Venipuncture — routine blood draw from a vein (second draw, 10/12)",
      chargedAmount: 69.03,
      medicareRate: 5,
      flags: [
        {
          type: "duplicate",
          severity: "yellow",
          message: "This is a second blood draw charge on a different day. Two draws over two days may be legitimate — confirm both actually occurred.",
        },
        {
          type: "price_outlier",
          severity: "red",
          message: "$69 for a routine blood draw is well above the typical Medicare rate of $3–5.",
        },
      ],
    },
    {
      code: "082805",
      codeType: "CPT",
      description: "Arterial blood gas test with oxygen saturation — checks oxygen, carbon dioxide, and acid levels in the blood",
      chargedAmount: 270.31,
      medicareRate: 30,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "This lab test typically costs Medicare around $25–40. You were charged $270 — significantly higher.",
        },
      ],
    },
    {
      code: "080053",
      codeType: "CPT",
      description: "Comprehensive metabolic panel — blood test measuring kidney function, liver function, blood sugar, and electrolytes",
      chargedAmount: 434.60,
      medicareRate: 14.50,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "A comprehensive metabolic panel costs Medicare about $14. You were charged $434 — roughly 30× the Medicare rate. This is a major outlier.",
        },
      ],
    },
    {
      code: "080048",
      codeType: "CPT",
      description: "Basic metabolic panel — blood test measuring blood sugar, calcium, and electrolytes (a smaller version of the comprehensive panel)",
      chargedAmount: 286.15,
      medicareRate: 11,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "This basic panel costs Medicare about $11. You were charged $286 — more than 25× the Medicare rate.",
        },
        {
          type: "info",
          severity: "yellow",
          message: "Both a comprehensive metabolic panel and a basic metabolic panel are billed. The comprehensive already includes everything in the basic. Ask why both were ordered.",
        },
      ],
    },
    {
      code: "085025",
      codeType: "CPT",
      description: "Complete blood count (CBC) with differential — blood test counting red cells, white cells, and platelets (first, 10/11)",
      chargedAmount: 220.95,
      medicareRate: 10.50,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "A CBC typically costs Medicare around $10. You were charged $220 — over 20× the Medicare rate.",
        },
      ],
    },
    {
      code: "085025",
      codeType: "CPT",
      description: "Complete blood count (CBC) with differential — repeat test on second day (10/12)",
      chargedAmount: 220.95,
      medicareRate: 10.50,
      flags: [
        {
          type: "duplicate",
          severity: "yellow",
          message: "Second CBC charge on a different day. Repeat blood counts during a hospital stay can be normal — confirm this second test was actually ordered and performed.",
        },
        {
          type: "price_outlier",
          severity: "red",
          message: "$220 for a CBC is far above the typical Medicare rate of about $10.",
        },
      ],
    },
    {
      code: "071045",
      codeType: "CPT",
      description: "Chest X-ray, single view — one image of the chest",
      chargedAmount: 256.78,
      medicareRate: 25,
      flags: [
        {
          type: "price_outlier",
          severity: "red",
          message: "A single-view chest X-ray usually costs Medicare around $25. You were charged $256 — roughly 10× that amount.",
        },
      ],
    },
    {
      code: "094640",
      codeType: "CPT",
      description: "Inhalation/nebulizer breathing treatment — opens the airways by delivering medication as a mist",
      chargedAmount: 132.78,
      medicareRate: 15,
      flags: [
        {
          type: "price_outlier",
          severity: "yellow",
          message: "A nebulizer treatment typically runs $15–20 under Medicare. You were charged $132.",
        },
      ],
    },
    {
      code: "094640",
      codeType: "CPT",
      description: "Hand-held nebulizer breathing treatment (second session)",
      chargedAmount: 116.55,
      medicareRate: 15,
      flags: [
        {
          type: "duplicate",
          severity: "yellow",
          message: "Multiple nebulizer treatments (094640) are billed at $116–132 each. Verify each session against your medical record.",
        },
        {
          type: "price_outlier",
          severity: "yellow",
          message: "$116 per breathing treatment is well above the typical Medicare rate.",
        },
      ],
    },
    {
      code: "094640",
      codeType: "CPT",
      description: "Hand-held nebulizer breathing treatment (third session)",
      chargedAmount: 116.55,
      medicareRate: 15,
      flags: [
        { type: "duplicate", severity: "yellow", message: "Third nebulizer treatment charge. Confirm each was administered." },
      ],
    },
    {
      code: "094640",
      codeType: "CPT",
      description: "Metered-dose inhaler (MDI) treatment — medication delivered through an inhaler device",
      chargedAmount: 116.55,
      medicareRate: 15,
      flags: [
        { type: "duplicate", severity: "yellow", message: "Fourth respiratory treatment charge. The total for all inhalation treatments exceeds $900 — ask for documentation of each." },
      ],
    },
    {
      code: "094640",
      codeType: "CPT",
      description: "Hand-held nebulizer breathing treatment (fifth session)",
      chargedAmount: 116.55,
      medicareRate: 15,
      flags: [
        { type: "duplicate", severity: "yellow", message: "Fifth nebulizer/inhalation charge. Verify against your treatment record." },
      ],
    },
    {
      code: "094668",
      codeType: "CPT",
      description: "Chest physiotherapy — manual technique to loosen and clear mucus from the lungs (session 1)",
      chargedAmount: 49.68,
      medicareRate: 20,
      flags: [],
    },
    {
      code: "094668",
      codeType: "CPT",
      description: "Chest physiotherapy (session 2)",
      chargedAmount: 49.68,
      medicareRate: 20,
      flags: [{ type: "duplicate", severity: "yellow", message: "Multiple chest physiotherapy sessions billed. Five sessions in two days is high — confirm each was performed." }],
    },
    {
      code: "094668",
      codeType: "CPT",
      description: "Chest physiotherapy (session 3)",
      chargedAmount: 49.68,
      medicareRate: 20,
      flags: [{ type: "duplicate", severity: "yellow", message: "Third chest physiotherapy session." }],
    },
    {
      code: "094668",
      codeType: "CPT",
      description: "Chest physiotherapy (session 4)",
      chargedAmount: 49.68,
      medicareRate: 20,
      flags: [{ type: "duplicate", severity: "yellow", message: "Fourth chest physiotherapy session." }],
    },
    {
      code: "094668",
      codeType: "CPT",
      description: "Chest physiotherapy (session 5)",
      chargedAmount: 49.68,
      medicareRate: 20,
      flags: [{ type: "duplicate", severity: "yellow", message: "Fifth and final chest physiotherapy charge. Ask the hospital to confirm all 5 sessions were medically necessary and actually delivered." }],
    },
    {
      code: "0637",
      codeType: "Revenue",
      description: "Albuterol 8.5 gm inhaler — a rescue medication that opens the airways",
      chargedAmount: 119.86,
      medicareRate: undefined,
      flags: [
        { type: "price_outlier", severity: "yellow", message: "$119 for an albuterol inhaler is high. Retail cost is often $30–60. Request the itemized drug pricing and quantity." },
      ],
    },
    {
      code: "0637",
      codeType: "Revenue",
      description: "Potassium chloride 20 mEq — electrolyte supplement given to maintain normal potassium levels (2 doses)",
      chargedAmount: 6.73,
      medicareRate: undefined,
      flags: [
        { type: "info", severity: "green", message: "Low-cost standard electrolyte medication. This charge appears reasonable." },
      ],
    },
    {
      code: "0637",
      codeType: "Revenue",
      description: "Fluticasone/Vilanterol 200/25 (brand: Breo Ellipta) — combination inhaler for asthma/COPD maintenance",
      chargedAmount: 779.93,
      medicareRate: undefined,
      flags: [
        { type: "price_outlier", severity: "red", message: "$779 for a single inhaler is very high. Ask the hospital to itemize the exact quantity dispensed and price per unit. Request a copy of the pharmacy charge breakdown." },
      ],
    },
    {
      code: "093005",
      codeType: "CPT",
      description: "Electrocardiogram (EKG/ECG) — records the heart's electrical activity to check for heart problems",
      chargedAmount: 287.68,
      medicareRate: 18,
      flags: [
        { type: "price_outlier", severity: "red", message: "An EKG typically costs Medicare around $18. You were charged $287 — roughly 15× that amount." },
      ],
    },
    {
      code: "0999",
      codeType: "Revenue",
      description: "Other patient convenience item — no charge",
      chargedAmount: 0,
      medicareRate: undefined,
      flags: [{ type: "info", severity: "green", message: "This line is $0.00 — no cost to you." }],
    },
  ],
};
