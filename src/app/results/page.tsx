"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BillAnalysis, LineItem } from "@/lib/types";
import { DEMO_BILL } from "@/lib/demoData";
import { Badge, PillLink } from "@/components/Pill";
import { ChevronIcon } from "@/components/Icons";
import { LineItemCard, potentialSavings, type Outcome } from "@/components/LineItemCard";
import { NegotiatePlaybook } from "@/components/NegotiatePlaybook";

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DOC_TYPE_LABELS: Record<string, string> = {
  itemized_statement: "Itemized hospital statement",
  ub04_claim: "UB-04 facility claim",
  cms1500_claim: "CMS-1500 professional claim",
  eob: "Explanation of Benefits (not a bill)",
  msn: "Medicare Summary Notice (not a bill)",
  summary_bill: "Summary bill",
  other: "Billing document",
};

// `denials` is an in-progress addition from another agent working on src/lib — render it
// only when present, without depending on it existing in src/lib/types.ts yet.
interface DenialCode {
  code: string;
  system: string;
  meaning: string;
  whatToDo: string;
  lineItemIndex?: number;
}
type AnalysisWithDenials = BillAnalysis & { denials?: DenialCode[] };

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

type Tab = "items" | "flags" | "negotiate";

type ItemRow =
  | { type: "single"; item: LineItem; index: number }
  | { type: "group"; key: string; indices: number[] };

/** Same normalized code (or, failing that, the same benchmark note text) — used to fold
 * long runs of near-identical unflagged lines (23 implant screws, 7 pharmacy lines, ...)
 * into one group card instead of a wall of repeated cards. Flagged lines never group. */
function groupKeyFor(item: LineItem): string {
  return item.resolvedCode || item.code || item.codeNote || item.description;
}

/** Builds the "Line items" tab's render order: original bill order, with each run of
 * 2+ consecutive-or-not unflagged same-code lines collapsed to a single group entry
 * positioned at its first member's index. Groups of size 1 fall through as singles. */
function buildItemRows(lineItems: LineItem[]): ItemRow[] {
  const indicesByKey = new Map<string, number[]>();
  lineItems.forEach((item, index) => {
    if (item.flags.length > 0) return;
    const key = groupKeyFor(item);
    const list = indicesByKey.get(key) ?? [];
    list.push(index);
    indicesByKey.set(key, list);
  });

  const rendered = new Set<string>();
  const rows: ItemRow[] = [];
  lineItems.forEach((item, index) => {
    if (item.flags.length > 0) {
      rows.push({ type: "single", item, index });
      return;
    }
    const key = groupKeyFor(item);
    const indices = indicesByKey.get(key)!;
    if (indices.length <= 1) {
      rows.push({ type: "single", item, index });
      return;
    }
    if (rendered.has(key)) return;
    rendered.add(key);
    rows.push({ type: "group", key, indices });
  });
  return rows;
}

function GroupedLineItems({ indices, lineItems }: { indices: number[]; lineItems: LineItem[] }) {
  const [open, setOpen] = useState(false);
  const items = indices.map((i) => lineItems[i]);
  const first = items[0];
  const total = items.reduce((sum, it) => sum + it.chargedAmount, 0);
  const allBenchmarked = items.every((it) => it.medicareRate != null);
  const medicareTotal = allBenchmarked
    ? items.reduce((sum, it) => sum + (it.medicareRate ?? 0), 0)
    : null;
  const label = first.codeName || first.description;

  return (
    <div className="rounded-cards border border-fog-gray p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[12px] text-slate-gray">
            {first.codeType} {first.resolvedCode ?? first.code}
          </span>
          <p className="mt-1 text-[15px] text-ink-black">
            {label} <span className="text-slate-gray">· {items.length} lines</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] text-ink-black">${money(total)} total</p>
          {medicareTotal != null ? (
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="text-[12px] text-slate-gray">Medicare ~${money(medicareTotal)}</span>
              {first.rateSource === "benchmark" ? (
                <Badge tone="mint">Verified</Badge>
              ) : (
                <Badge tone="mist">Estimated</Badge>
              )}
            </div>
          ) : (
            <div className="mt-1 flex justify-end">
              <Badge tone="mist">No benchmark</Badge>
            </div>
          )}
        </div>
      </div>

      {first.codeNote && (
        <p className="mt-2 text-[12px] leading-relaxed text-slate-gray">{first.codeNote}</p>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border border-mist-gray px-3.5 py-1.5 text-[13px] text-ink-black hover:border-ink-black"
        >
          {open ? "Hide lines" : `Show ${items.length} lines`}
          <ChevronIcon className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2 divide-y divide-fog-gray border-t border-fog-gray">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 text-[13.5px]">
              <span className="text-ink-black">{it.description}</span>
              <span className="shrink-0 whitespace-nowrap text-ash-gray">${money(it.chargedAmount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsInner() {
  const [analysis, setAnalysis] = useState<AnalysisWithDenials | null>(null);
  const [tab, setTab] = useState<Tab>("items");
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Convenience: /results?demo=1 loads the demo bill directly, without going through
    // the upload flow / sessionStorage — useful for screenshotting this page. Safe in any
    // environment: it only ever loads the same public DEMO_BILL the homepage's "Try the
    // demo" button already serves to every visitor.
    if (searchParams.get("demo") === "1") {
      setAnalysis(DEMO_BILL as AnalysisWithDenials);
      return;
    }
    const stored = sessionStorage.getItem("billAnalysis");
    if (!stored) {
      router.push("/");
      return;
    }
    setAnalysis(JSON.parse(stored));
  }, [router, searchParams]);

  const billId = useMemo(() => {
    if (!analysis) return null;
    return hashString(`${analysis.totalCharged}:${analysis.lineItems.length}:${analysis.facilityName ?? ""}`);
  }, [analysis]);

  useEffect(() => {
    if (!billId) return;
    try {
      const raw = localStorage.getItem(`billbuster:outcomes:${billId}`);
      setOutcomes(raw ? JSON.parse(raw) : {});
    } catch {
      setOutcomes({});
    }
  }, [billId]);

  const setOutcome = (index: number, outcome: Outcome) => {
    if (!billId) return;
    setOutcomes((prev) => {
      const next = { ...prev };
      if (outcome) next[index] = outcome;
      else delete next[index];
      try {
        localStorage.setItem(`billbuster:outcomes:${billId}`, JSON.stringify(next));
      } catch {
        // localStorage unavailable (private browsing etc.) — tally just won't persist
      }
      return next;
    });
  };

  // Hooks must run on every render regardless of whether `analysis` has loaded yet —
  // computing this after the early return below would change the hook count between
  // the "still loading" render and the "loaded" render (React error #310).
  const itemRows = useMemo(() => buildItemRows(analysis?.lineItems ?? []), [analysis]);

  if (!analysis) return null;

  const lineItems = analysis.lineItems;
  const flaggedItems = lineItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.flags.length > 0);

  const recognizedCount = lineItems.filter((i) => i.codeVerified).length;
  const benchmarkCount = lineItems.filter((i) => i.rateSource === "benchmark").length;
  const totalPotential = flaggedItems.reduce((sum, { item }) => sum + potentialSavings(item), 0);
  const savedSoFar = flaggedItems.reduce(
    (sum, { item, index }) => sum + (outcomes[index] === "won" ? potentialSavings(item) : 0),
    0
  );
  const progressPct = totalPotential > 0 ? Math.min(100, (savedSoFar / totalPotential) * 100) : 0;

  return (
    <main className="flex flex-col items-center px-4 pb-24 pt-10">
      <div className="w-full max-w-[880px] space-y-6">
        {/* Back link */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate-gray">Your results</p>
          <button
            onClick={() => router.push("/")}
            className="text-[13px] text-ash-gray hover:text-signal-violet"
          >
            ← Analyze another bill
          </button>
        </div>

        {/* Ribbon */}
        <div className="rounded-cards border border-fog-gray p-6">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-gray">
            {analysis.documentType && (
              <Badge tone="mist">{DOC_TYPE_LABELS[analysis.documentType] ?? DOC_TYPE_LABELS.other}</Badge>
            )}
            {analysis.facilityName && <span>{analysis.facilityName}</span>}
            {analysis.serviceDate && <span>· {analysis.serviceDate}</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[12px] uppercase tracking-[0.04em] text-slate-gray">
                {analysis.documentType === "eob" || analysis.documentType === "msn" ? "You may owe" : "Total charged"}
              </p>
              <p className="font-display font-light text-heading-lg text-ink-black">${money(analysis.totalCharged)}</p>
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.04em] text-slate-gray">Flagged</p>
              <p className="font-display font-light text-heading text-ink-black">{flaggedItems.length} charges</p>
            </div>
            <Badge tone="mint" className="text-[13px] px-4 py-1.5">
              {recognizedCount} of {lineItems.length} lines recognized · {benchmarkCount} priced against real Medicare rates
            </Badge>
          </div>

          {flaggedItems.length > 0 && (
            <div className="mt-4 border-t border-fog-gray pt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[12px] uppercase tracking-[0.04em] text-slate-gray">Saved so far</p>
                <p className="text-[12px] text-slate-gray">
                  of ~${money(totalPotential)} potential
                </p>
              </div>
              <p className="mt-1 font-display font-light text-heading text-ink-black">${money(savedSoFar)}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-mist-gray/25">
                <div
                  className="h-full rounded-pill bg-mint-pulse transition-all"
                  style={{ width: `${Math.max(progressPct, savedSoFar > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          )}

          <p className="mt-6 text-[15px] leading-relaxed text-ash-gray">{analysis.summary}</p>
        </div>

        {/* Coverage warning */}
        {analysis.coverageWarning && (
          <div className="rounded-cards border-l-2 border-signal-violet bg-fog-gray p-5 text-[14px] leading-relaxed text-ink-black">
            {analysis.coverageWarning}
          </div>
        )}

        {/* No Surprises Act rights */}
        {analysis.noSurprises && (
          <div className="rounded-cards border-l-2 border-signal-violet border border-fog-gray p-6 space-y-4">
            <div>
              <Badge tone={analysis.noSurprises.status === "eligible" ? "mint" : "mist"}>
                {analysis.noSurprises.status === "eligible"
                  ? "Eligible now"
                  : analysis.noSurprises.status === "need_estimate"
                  ? "Estimate needed"
                  : analysis.noSurprises.status === "below_threshold"
                  ? "Below threshold"
                  : "Insured protections"}
              </Badge>
              <h2 className="mt-3 text-[20px] leading-snug text-ink-black">{analysis.noSurprises.headline}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ash-gray">{analysis.noSurprises.detail}</p>
            </div>

            {analysis.noSurprises.status === "eligible" && analysis.noSurprises.estimateTotal !== undefined && (
              <div className="flex flex-wrap gap-6 rounded-inputs bg-fog-gray px-5 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.04em] text-slate-gray">Your estimate</p>
                  <p className="text-[15px] text-ink-black">${money(analysis.noSurprises.estimateTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.04em] text-slate-gray">Billed</p>
                  <p className="text-[15px] text-ink-black">${money(analysis.noSurprises.billedTotal ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.04em] text-slate-gray">Over estimate</p>
                  <p className="text-[15px] text-ink-black">${money(analysis.noSurprises.overage ?? 0)}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] uppercase tracking-[0.04em] text-slate-gray mb-2">What to do</p>
              <ol className="space-y-1.5">
                {analysis.noSurprises.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[14px] text-ink-black">
                    <span className="shrink-0 text-signal-violet">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-[14px] text-ash-gray hover:text-signal-violet">
                Your protections →
              </summary>
              <ul className="mt-2 space-y-1.5">
                {analysis.noSurprises.protections.map((p, i) => (
                  <li key={i} className="flex gap-2 text-[14px] text-ash-gray">
                    <span className="shrink-0 text-signal-violet">·</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </details>

            <PillLink href={analysis.noSurprises.actionUrl} variant="primary">
              {analysis.noSurprises.status === "eligible" ? "Start your dispute at CMS →" : "Learn your rights at CMS →"}
            </PillLink>
          </div>
        )}

        {/* Top issues */}
        {analysis.topIssues.length > 0 && (
          <div className="rounded-cards border-l-2 border-signal-violet bg-fog-gray p-6">
            <h2 className="text-[15px] text-ink-black">Top issues to raise</h2>
            <ul className="mt-3 space-y-2.5">
              {analysis.topIssues.map((issue, i) => (
                <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-ink-black">
                  <span className="shrink-0 text-signal-violet">{i + 1}.</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Insurance codes decoded — only when the analysis includes denials */}
        {analysis.denials && analysis.denials.length > 0 && (
          <div className="rounded-cards border border-fog-gray p-6">
            <h2 className="text-[15px] text-ink-black">Insurance codes decoded</h2>
            <div className="mt-3 space-y-3">
              {analysis.denials.map((d, i) => (
                <div key={i} className="rounded-inputs border-l-2 border-signal-violet bg-fog-gray p-4">
                  <p className="text-[13px] text-slate-gray">
                    {d.system} {d.code}
                  </p>
                  <p className="mt-1 text-[14px] text-ink-black">{d.meaning}</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ash-gray">{d.whatToDo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            ["items", `Line items (${lineItems.length})`],
            ["flags", `Flags (${flaggedItems.length})`],
            ["negotiate", "How to negotiate"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-pill px-4 py-2 text-[13.5px] transition-colors ${
                tab === key
                  ? "bg-signal-violet text-pure-white"
                  : "border border-mist-gray text-ash-gray hover:border-ink-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "negotiate" ? (
          <NegotiatePlaybook />
        ) : tab === "items" ? (
          <div className="space-y-2">
            {itemRows.map((row) =>
              row.type === "single" ? (
                <LineItemCard
                  key={row.index}
                  item={row.item}
                  index={row.index}
                  outcome={outcomes[row.index] ?? null}
                  onOutcomeChange={setOutcome}
                />
              ) : (
                <GroupedLineItems key={row.key} indices={row.indices} lineItems={lineItems} />
              )
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {flaggedItems.map(({ item, index }) => (
              <LineItemCard
                key={index}
                item={item}
                index={index}
                outcome={outcomes[index] ?? null}
                onOutcomeChange={setOutcome}
              />
            ))}
            {flaggedItems.length === 0 && (
              <p className="rounded-cards border border-dashed border-fog-gray p-6 text-center text-[14px] text-slate-gray">
                Nothing flagged — every line looked normal against the reference database.
              </p>
            )}
          </div>
        )}

        <p className="pb-6 text-center text-[12px] leading-relaxed text-slate-gray">
          BillBuster explains your bill and flags potential issues — it does not provide legal or
          medical advice. Verify every figure against your paper bill before you act on it.
        </p>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsInner />
    </Suspense>
  );
}
