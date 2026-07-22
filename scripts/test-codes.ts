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
const rateCases: RateCase[] = [
  { code: "J0131", quantity: 100, wantRate: 8, why: "acetaminophen $0.08/10mg x 100 units" },
  { code: "J1100", quantity: 8, wantRate: 0.8, why: "dexamethasone $0.10/mg x 8" },
  { code: "J2405", quantity: 4, wantRate: 1.2, why: "ondansetron $0.30/mg x 4" },
  { code: "J2250", quantity: 2, wantRate: 0.4, why: "midazolam $0.20/mg x 2" },
  { code: "J7120", quantity: 1, wantRate: 1.5, why: "one bag of IV fluid" },
  { code: "J0131", quantity: null, wantRate: undefined, why: "unknown units -> quote NO benchmark" },
  { code: "J0131", wantRate: undefined, why: "missing quantity -> quote NO benchmark" },
  { code: "73080", quantity: 1, wantRate: 30, why: "non per-unit code is unaffected by quantity" },
  { code: "73080", quantity: 3, wantRate: 30, why: "per-procedure rate must NOT be multiplied" },
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

if (pass !== cases.length || ratePass !== rateCases.length) process.exit(1);
