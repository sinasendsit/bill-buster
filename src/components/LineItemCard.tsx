"use client";

import { useState } from "react";
import type { LineItem } from "@/lib/types";
import { Badge, PillButton } from "./Pill";
import { ChevronIcon } from "./Icons";

export type Outcome = "won" | "lost" | null;

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Conservative, transparent estimate of what a flagged line could realistically be
 * knocked down by — used only to drive the "saved so far" tally, never shown as a
 * guarantee. */
export function potentialSavings(item: LineItem): number {
  if (item.flags.length === 0) return 0;
  if (item.flags.some((f) => f.type === "duplicate")) return item.chargedAmount;
  if (item.medicareRate != null && item.chargedAmount > item.medicareRate) {
    return Math.round((item.chargedAmount - item.medicareRate) * 100) / 100;
  }
  return Math.round(item.chargedAmount * 0.4 * 100) / 100;
}

function phoneScript(item: LineItem): string {
  const codeRef =
    item.resolvedCode && item.resolvedCode !== item.code
      ? `${item.code} (resolved to ${item.resolvedCode})`
      : item.code;
  const flagText = item.flags.map((f) => f.message).join(" ");
  const rateLine =
    item.medicareRate != null
      ? ` Medicare's rate for this is about $${money(item.medicareRate)}.`
      : "";
  return (
    `Hi, I'm calling about my itemized bill. I'm looking at ${item.codeType} ${codeRef} — ` +
    `${item.description} — charged at $${money(item.chargedAmount)}. ${flagText}${rateLine} ` +
    `Can you review this charge and send me a corrected statement, or explain exactly how it was priced?`
  );
}

export function LineItemCard({
  item,
  index,
  outcome,
  onOutcomeChange,
}: {
  item: LineItem;
  index: number;
  outcome: Outcome;
  onOutcomeChange: (index: number, outcome: Outcome) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const flagged = item.flags.length > 0;
  const hasRedFlag = item.flags.some((f) => f.severity === "red");

  const handleCopy = async () => {
    const script = phoneScript(item);
    try {
      await navigator.clipboard.writeText(script);
    } catch {
      // clipboard API unavailable — silently no-op, the text is still visible to select
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={`rounded-cards border p-4 transition-colors ${
        outcome === "won"
          ? "border-mint-pulse bg-mint-pulse/10"
          : outcome === "lost"
          ? "border-fog-gray opacity-60"
          : hasRedFlag
          ? "border-fog-gray border-l-2 border-l-signal-violet"
          : "border-fog-gray"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate-gray">
              {item.codeType} {item.code}
            </span>
            {outcome === "won" && <Badge tone="mint">Saved</Badge>}
          </div>
          <p className="mt-1 text-[15px] text-ink-black">{item.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] text-ink-black">${money(item.chargedAmount)}</p>
          {item.medicareRate != null ? (
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="text-[12px] text-slate-gray">Medicare ~${money(item.medicareRate)}</span>
              {item.rateSource === "benchmark" ? (
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

      {flagged && (
        <div className="mt-2 space-y-2">
          {item.flags.map((flag, fi) => (
            <div
              key={fi}
              className="rounded-inputs border-l-2 border-signal-violet bg-fog-gray px-4 py-2.5 text-[13.5px] leading-relaxed text-ink-black"
            >
              {flag.message}
            </div>
          ))}
        </div>
      )}

      {flagged && item.medicareRate == null && item.codeNote && (
        <p className="mt-2 text-[12px] leading-relaxed text-slate-gray">{item.codeNote}</p>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border border-mist-gray px-3.5 py-1.5 text-[13px] text-ink-black hover:border-ink-black"
        >
          {open ? "Show less" : "Explain more"}
          <ChevronIcon className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-dashed border-fog-gray pt-4">
          {flagged ? (
            <>
              <p className="text-[14px] leading-relaxed text-ash-gray">
                {item.flags.map((f) => f.message).join(" ")}
                {item.codeNote ? ` ${item.codeNote}` : ""}
              </p>

              <div className="rounded-inputs bg-fog-gray p-4">
                <p className="text-[11px] uppercase tracking-[0.04em] text-signal-violet">
                  What to say when you call
                </p>
                <p className="mt-2 text-[13.5px] italic leading-relaxed text-ink-black">
                  &ldquo;{phoneScript(item)}&rdquo;
                </p>
                <PillButton
                  type="button"
                  onClick={handleCopy}
                  className="mt-3 w-full text-[13px]"
                >
                  {copied ? "Copied" : "Copy script"}
                </PillButton>
              </div>

              <div className="flex items-center gap-2">
                <span className="mr-auto text-[12px] text-slate-gray">Did the call work?</span>
                <button
                  type="button"
                  onClick={() => onOutcomeChange(index, outcome === "won" ? null : "won")}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] ${
                    outcome === "won"
                      ? "border-mint-pulse bg-mint-pulse text-ink-black"
                      : "border-mist-gray text-ash-gray hover:border-ink-black"
                  }`}
                >
                  Won
                </button>
                <button
                  type="button"
                  onClick={() => onOutcomeChange(index, outcome === "lost" ? null : "lost")}
                  className={`rounded-pill border px-3 py-1.5 text-[12.5px] ${
                    outcome === "lost"
                      ? "border-ink-black bg-ink-black text-pure-white"
                      : "border-mist-gray text-ash-gray hover:border-ink-black"
                  }`}
                >
                  No luck
                </button>
              </div>
            </>
          ) : (
            <p className="text-[14px] leading-relaxed text-ash-gray">
              {item.codeCategory ? `Category: ${item.codeCategory}. ` : ""}
              {item.codeNote ?? "No issues flagged on this line — the code checks out against the reference database."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
