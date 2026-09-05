import type { BillAnalysis } from "./types";
import generated from "./demoData.generated.json";

// The "See a demo" bill is no longer hand-written static JSON. It is the output of a
// REAL analysis run through the live BillBuster engine (gap #16) — so the demo shows
// the same verified/grounded code badges and No Surprises rights card a real user
// would see. Regenerate with `npm run demo:refresh` (see scripts/refresh-demo.mjs).
//
// Source bill: a real, public $97,998 uninsured surgical bill from Bozeman Health,
// published by KFF Health News (Bill of the Month, Dec 2024). See
// demoData.generated.json's `sourceFile` / `note` fields for provenance.
export const DEMO_BILL: BillAnalysis = generated as unknown as BillAnalysis;
