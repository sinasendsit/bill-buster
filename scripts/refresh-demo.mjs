#!/usr/bin/env node
// Refreshes the "See a demo" data by running the ONE real bill BillBuster demos
// through the live analysis engine, instead of hand-writing static demo JSON
// (gap #16 — the old static demo never showed verified/grounded badges or the
// No Surprises rights card, because it wasn't produced by the engine).
//
//   1. start the app:     npm run dev -- -p 3111  (the port this script expects)
//   2. run this script:   npm run demo:refresh -- --port=3111
//
// Writes: src/lib/demoData.generated.json
//
// Source bill: a REAL public bill published by KFF Health News (Bill of the
// Month, Dec 2024) — an uninsured $97,998 surgical bill for a broken arm at
// Bozeman Health. Public document, fine to use as the product demo.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, ".."); // bill-buster/
const APP_ROOT = path.resolve(ROOT, "..");             // Bill Buster MAIN/
const BILL_PATH = path.join(
  APP_ROOT,
  "training material",
  "real bills (KFF)",
  "2024-12_bozeman-health_broken-arm-uninsured_surgery-bill.pdf"
);
const OUT_PATH = path.join(ROOT, "src", "lib", "demoData.generated.json");

const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
};
const PORT = flag("port", "3111");
const API = `http://localhost:${PORT}/api/analyze`;

async function analyze(filePath) {
  const buf = await readFile(filePath);
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "application/pdf" }), path.basename(filePath));
  const res = await fetch(API, {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(300_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${json?.message ?? json?.error ?? "no body"}`);
  }
  if (json?.error) throw new Error(json.error);
  return json;
}

async function main() {
  console.log(`→ analyzing ${path.relative(APP_ROOT, BILL_PATH)} via ${API} …`);
  const analysis = await analyze(BILL_PATH);

  const generated = {
    ...analysis,
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(APP_ROOT, BILL_PATH),
    note:
      "Real bill, published by KFF Health News (Bill of the Month, Dec 2024). Pre-analyzed by the live BillBuster engine.",
  };

  await writeFile(OUT_PATH, JSON.stringify(generated, null, 2) + "\n");
  console.log(`✓ wrote ${path.relative(ROOT, OUT_PATH)}`);
  console.log(
    `  totalCharged=${analysis.totalCharged} selfPay=${analysis.selfPay} ` +
      `noSurprises.status=${analysis.noSurprises?.status} lineItems=${analysis.lineItems?.length}`
  );
}

main().catch((e) => {
  console.error("demo:refresh failed:", e);
  process.exit(1);
});
