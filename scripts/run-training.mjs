#!/usr/bin/env node
// Batch training harness — runs every real bill through the analyzer and scores the
// result against expectations.json, so reviewing the engine means reading a scorecard
// instead of reading PDFs.
//
//   1. start the app:   npm run dev -- -p 3111  (the port the harness expects)
//   2. run the harness: npm run test:bills
//      flags: --dry (list only, no API calls) · --only=<substring> · --port=3000
//             --scored (skip bills with no entry in expectations.json — saves API spend)
//
// Outputs: training material/results/<bill>.json  and  training material/SCORECARD.md

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");          // Bill Buster MAIN/
const BILLS_DIR = path.join(ROOT, "training material", "real bills (KFF)");
const TRAINING_DIR = path.join(ROOT, "training material");
const OUT_DIR = path.join(TRAINING_DIR, "results");

const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
};
const DRY = args.includes("--dry");
const SCORED_ONLY = args.includes("--scored");
const ONLY = flag("only", "");
const PORT = flag("port", "3111");
const API = `http://localhost:${PORT}/api/analyze`;

const money = (n) => (typeof n === "number" ? "$" + n.toLocaleString("en-US") : "—");

async function loadExpectations() {
  try {
    const raw = await readFile(path.join(TRAINING_DIR, "expectations.json"), "utf8");
    return JSON.parse(raw).cases ?? {};
  } catch {
    console.warn("! no expectations.json — results will be recorded but unscored");
    return {};
  }
}

async function analyze(file) {
  const buf = await readFile(path.join(BILLS_DIR, file));
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "application/pdf" }), file);
  const res = await fetch(API, {
    method: "POST",
    body: fd,
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

/** Score one result against its expectations. Returns {checks:[{name,pass,detail}], stats}. */
function score(result, expect = {}) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass, detail });
  const items = Array.isArray(result.lineItems) ? result.lineItems : [];

  if (expect.documentType !== undefined)
    add("docType", result.documentType === expect.documentType,
        `${result.documentType ?? "—"} (want ${expect.documentType})`);

  if (expect.totalCharged !== undefined) {
    const got = result.totalCharged;
    const ok = typeof got === "number" &&
      Math.abs(got - expect.totalCharged) <= Math.max(1, expect.totalCharged * 0.01);
    add("total", ok, `${money(got)} (want ${money(expect.totalCharged)})`);
  }

  if (expect.selfPay !== undefined)
    add("selfPay", result.selfPay === expect.selfPay,
        `${result.selfPay} (want ${expect.selfPay})`);

  if (expect.noSurprisesStatus !== undefined) {
    const got = result.noSurprises?.status ?? null;
    add("rights", got === expect.noSurprisesStatus,
        `${got ?? "none"} (want ${expect.noSurprisesStatus})`);
  }

  if (expect.minLineItems !== undefined)
    add("lineItems", items.length >= expect.minLineItems,
        `${items.length} (want ≥${expect.minLineItems})`);

  if (Array.isArray(expect.mustMention)) {
    const hay = JSON.stringify(result).toLowerCase();
    const missing = expect.mustMention.filter((t) => !hay.includes(t.toLowerCase()));
    add("mentions", missing.length === 0,
        missing.length ? `missing: ${missing.join(", ")}` : "all present");
  }

  // Split by match strength. A "department" match only tells the patient which
  // hospital department billed them — counting it alongside a real CPT match would
  // make the verified number look better than the engine actually got.
  const verified = items.filter((i) => i.codeVerified).length;
  const exact = items.filter((i) => i.matchType === "exact").length;
  const chargemaster = items.filter((i) => i.matchType === "chargemaster").length;
  const department = items.filter((i) => i.matchType === "department").length;
  const benchmarked = items.filter((i) => i.rateSource === "benchmark").length;
  const stats = {
    lineItems: items.length,
    verified,
    verifiedPct: items.length ? Math.round((verified / items.length) * 100) : 0,
    exact,
    chargemaster,
    department,
    benchmarked,
    flags: items.reduce((n, i) => n + (i.flags?.length ?? 0), 0),
  };
  return { checks, stats };
}

async function main() {
  const all = (await readdir(BILLS_DIR)).filter((f) => f.toLowerCase().endsWith(".pdf"));
  const expectations = await loadExpectations();
  let files = ONLY ? all.filter((f) => f.includes(ONLY)) : all;
  if (SCORED_ONLY) files = files.filter((f) => expectations[f]);

  const skipped = all.length - files.length;
  console.log(
    `${files.length} bill(s) in ${path.relative(ROOT, BILLS_DIR)}` +
      (skipped ? ` (${skipped} skipped by filter)` : "")
  );
  if (DRY) {
    files.forEach((f) => {
      const e = expectations[f];
      console.log(`  · ${f}${e ? `  [${e.label}]` : "  [unscored]"}`);
    });
    console.log(`\ndry run — no API calls made. Endpoint would be ${API}`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const rows = [];

  for (const file of files) {
    const label = expectations[file]?.label ?? file;
    process.stdout.write(`→ ${label} … `);
    try {
      const result = await analyze(file);
      await writeFile(
        path.join(OUT_DIR, file.replace(/\.pdf$/i, ".json")),
        JSON.stringify(result, null, 2)
      );
      const { checks, stats } = score(result, expectations[file]?.expect);
      const passed = checks.filter((c) => c.pass).length;
      rows.push({ file, label, checks, stats, passed, total: checks.length });
      console.log(
        checks.length ? `${passed}/${checks.length} checks` : "recorded (unscored)"
      );
    } catch (err) {
      rows.push({ file, label, error: err.message });
      console.log(`FAILED — ${err.message}`);
    }
  }

  await writeScorecard(rows);
  const scored = rows.filter((r) => r.total);
  const totalPass = scored.reduce((n, r) => n + r.passed, 0);
  const totalChecks = scored.reduce((n, r) => n + r.total, 0);
  console.log(`\nSCORECARD → ${path.relative(ROOT, path.join(TRAINING_DIR, "SCORECARD.md"))}`);
  console.log(`Overall: ${totalPass}/${totalChecks} checks passing`);
}

async function writeScorecard(rows) {
  const stamp = new Date().toISOString().slice(0, 10);
  const L = [];
  L.push("# BillBuster — Training Scorecard");
  L.push("");
  L.push(`_Generated ${stamp} by \`npm run test:bills\`. Expectations: \`expectations.json\` · narrative: \`CASES.md\` · open gaps: \`../GAPS.md\`_`);
  L.push("");
  L.push("| Case | Checks | Line items | Recognized | of which exact code | Priced vs benchmark | Flags |");
  L.push("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    if (r.error) {
      L.push(`| ${r.label} | ⚠️ ERROR | — | — | — | — | — |`);
      continue;
    }
    const c = r.total ? `${r.passed}/${r.total}${r.passed === r.total ? " ✅" : " ⚠️"}` : "unscored";
    const s = r.stats;
    L.push(
      `| ${r.label} | ${c} | ${s.lineItems} | ${s.verified} (${s.verifiedPct}%) | ${s.exact + s.chargemaster} | ${s.benchmarked} | ${s.flags} |`
    );
  }
  L.push("");
  L.push("## Detail");
  for (const r of rows) {
    L.push("");
    L.push(`### ${r.label}`);
    if (r.error) {
      L.push(`- ⚠️ **Run failed:** ${r.error}`);
      continue;
    }
    if (!r.checks.length) L.push("- _No expectations defined — output recorded only._");
    for (const c of r.checks) L.push(`- ${c.pass ? "🟢" : "🔴"} **${c.name}** — ${c.detail}`);
    const s = r.stats;
    L.push(
      `- ℹ️ ${s.lineItems} line items · ${s.verified} recognized (${s.verifiedPct}%)` +
        ` — ${s.exact} exact code, ${s.chargemaster} via chargemaster, ${s.department} department only`
    );
    L.push(`- ℹ️ ${s.benchmarked} line(s) priced against a real Medicare benchmark · ${s.flags} flags`);
  }
  L.push("");
  await writeFile(path.join(TRAINING_DIR, "SCORECARD.md"), L.join("\n"));
}

main().catch((e) => {
  console.error("harness failed:", e);
  process.exit(1);
});
