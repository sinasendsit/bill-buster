import { groundLineItem } from "../src/lib/codeDatabase";

type Case = { code?: string; description?: string; want: string };
// Codes as they actually came out of the engine on the three real bills.
const cases: Case[] = [
  // exact — drugs the $98K bill billed by J-code
  { code: "J7120", want: "exact:Drug" },
  { code: "J0690", want: "exact:Drug" },
  { code: "J0131", want: "exact:Drug" },
  { code: "J3010", want: "exact:Drug" },
  { code: "J1100", want: "exact:Drug" },
  { code: "J2704", want: "exact:Drug" },
  { code: "J2250", want: "exact:Drug" },
  { code: "C1713", want: "exact:Implant" },
  { code: "J2405", want: "exact:Drug" },
  // chargemaster — embeds a real code
  { code: "278C1713S1", want: "chargemaster:Implant" },
  { code: "320730800",  want: "chargemaster:Imaging" },
  // chargemaster — department only, no embedded code
  { code: "2500000005", want: "department:Pharmacy" },
  { code: "27200000S1", want: "department:Supplies" },
  { code: "27000000S1", want: "department:Supplies" },
  { code: "27100000S1", want: "department:Supplies" },
  { code: "2710000047", want: "department:Supplies" },
  { code: "3600000003", want: "department:Operating room" },
  { code: "3700000020", want: "department:Anesthesia" },
  { code: "7100000001", want: "department:Recovery room" },
  { code: "2780000099", want: "department:Implant" },
  // description fallback — the scorpion-pepper summary bill
  { code: "-", description: "Laboratory - General Classification (grouped lab charges)", want: "department:Lab" },
  { code: "-", description: "CT Scan - General Classification (imaging charge)", want: "department:Imaging" },
  { code: "-", description: "Emergency Room - General Classification (ER facility fee)", want: "department:ER" },
  { code: "-", description: "Pharmacy - Extension of 025x - Single Source Drug (medication)", want: "department:Pharmacy" },
  // guards — must NOT match
  { code: "27200000S1", description: "Anesthesia kit, adult (Dynjaa)", want: "department:Supplies" },
  { code: "-", description: "Anesthesia services during the surgery", want: "none" },
  { code: "00000", description: "Drugs and medications (no procedure code assigned)", want: "none" },
  { code: "9999999999", want: "none" },
  { code: "36415", want: "exact:Lab" },
];

// Per-unit drug pricing: the benchmark must cover the whole line, not one unit.
// Getting this wrong turns an ~11x markup into a reported 1,150x.
type RateCase = { code: string; quantity?: number | null; wantRate: number | undefined; why: string };
// Rates now come from the real CMS ASP drug pricing file (2026 Q3), scaled by quantity.
const rateCases: RateCase[] = [
  { code: "J0131", quantity: 100, wantRate: 5, why: "acetaminophen CMS $0.05/10mg x 100 units" },
  { code: "J1100", quantity: 8, wantRate: 0.68, why: "dexamethasone CMS $0.085/mg x 8" },
  { code: "J2405", quantity: 4, wantRate: 0.35, why: "ondansetron CMS $0.088/mg x 4" },
  { code: "J2250", quantity: 2, wantRate: 0.29, why: "midazolam CMS $0.143/mg x 2" },
  { code: "J7120", quantity: 1, wantRate: 2.31, why: "IV fluid CMS $2.313/1000cc x 1" },
  { code: "J0131", quantity: null, wantRate: undefined, why: "unknown units -> quote NO benchmark" },
  { code: "J0131", wantRate: undefined, why: "missing quantity -> quote NO benchmark" },
  // 73080 is now priced by the real CMS PFS file (added below); this per-procedure
  // rate must not scale with quantity regardless of which source supplies it.
  { code: "73080", quantity: 1, wantRate: 33.07, why: "imaging: CMS PFS rate, unaffected by quantity" },
  { code: "73080", quantity: 3, wantRate: 33.07, why: "per-procedure rate must NOT be multiplied" },
];

let pass = 0;
for (const c of cases) {
  const item: Record<string, unknown> = { code: c.code, description: c.description };
  groundLineItem(item as never);
  const got = item.codeVerified ? `${item.matchType}:${item.codeCategory}` : "none";
  const ok = got === c.want;
  if (ok) pass++;
  console.log(`${ok ? "  ok" : "FAIL"}  ${(c.code ?? "").padEnd(12)} ${got.padEnd(26)} want ${c.want}`);
}
console.log(`\n${pass}/${cases.length} lookup cases passing`);

console.log("\n--- per-unit drug pricing ---");
let ratePass = 0;
for (const c of rateCases) {
  const item: Record<string, unknown> = { code: c.code, quantity: c.quantity };
  groundLineItem(item as never);
  const got = item.medicareRate as number | undefined;
  const ok = got === c.wantRate;
  if (ok) ratePass++;
  console.log(
    `${ok ? "  ok" : "FAIL"}  ${c.code} qty=${String(c.quantity)}`.padEnd(28) +
      `rate=${String(got)}`.padEnd(14) + `want=${String(c.wantRate)}   ${c.why}`
  );
}
console.log(`\n${ratePass}/${rateCases.length} per-unit pricing cases passing`);

// Codes newly covered by the CMS Physician Fee Schedule (PFS) and OPPS Addendum B
// additions (imaging, ER/office visits, hospital outpatient facility fees). These
// real government rates move with every quarterly CMS refresh, so we assert a
// plausible range rather than hardcoding exact cents.
type RangeCase = { code: string; min: number; max: number; why: string };
const rangeCases: RangeCase[] = [
  { code: "99283", min: 40, max: 300, why: "ER visit level 3 — CMS PFS national non-facility payment" },
  { code: "99284", min: 60, max: 450, why: "ER visit level 4 — CMS PFS national non-facility payment" },
  { code: "99285", min: 90, max: 650, why: "ER visit level 5 — CMS PFS national non-facility payment" },
  { code: "71045", min: 10, max: 60, why: "chest X-ray, 1 view — CMS PFS" },
  { code: "71046", min: 15, max: 90, why: "chest X-ray, 2 views — CMS PFS" },
  { code: "70450", min: 60, max: 200, why: "CT head, no contrast — CMS PFS" },
  { code: "73080", min: 15, max: 70, why: "elbow X-ray, 3+ views — CMS PFS" },
  { code: "72148", min: 100, max: 350, why: "MRI lumbar spine, no contrast — CMS PFS" },
  { code: "36415", min: 1, max: 20, why: "venipuncture — CLFS lab code (unchanged by this refresh)" },
  { code: "G0463", min: 50, max: 300, why: "OPPS-only: hospital outpatient clinic visit facility fee" },
];

let rangePass = 0;
for (const c of rangeCases) {
  const item: Record<string, unknown> = { code: c.code };
  groundLineItem(item as never);
  const got = item.medicareRate as number | undefined;
  const ok = typeof got === "number" && got >= c.min && got <= c.max;
  if (ok) rangePass++;
  console.log(
    `${ok ? "  ok" : "FAIL"}  ${c.code.padEnd(8)} rate=${String(got)}`.padEnd(34) +
      `want [${c.min}, ${c.max}]   ${c.why}`
  );
}
console.log(`\n${rangePass}/${rangeCases.length} plausible-range CMS rate cases passing`);

if (pass !== cases.length || ratePass !== rateCases.length || rangePass !== rangeCases.length) process.exit(1);
