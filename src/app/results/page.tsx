"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BillAnalysis, Flag } from "@/lib/types";

const FLAG_COLORS: Record<Flag["severity"], string> = {
  red: "bg-red-50 border-red-200 text-red-800",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  green: "bg-green-50 border-green-200 text-green-800",
};

const FLAG_ICONS: Record<Flag["type"], string> = {
  duplicate: "🔁",
  unbundling: "🧩",
  severity_mismatch: "⚠️",
  unrelated: "❓",
  price_outlier: "💸",
  info: "ℹ️",
};

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DOC_TYPE_LABELS: Record<string, string> = {
  itemized_statement: "Itemized Hospital Statement",
  ub04_claim: "UB-04 Facility Claim",
  cms1500_claim: "CMS-1500 Professional Claim",
  eob: "Explanation of Benefits (not a bill)",
  msn: "Medicare Summary Notice (not a bill)",
  summary_bill: "Summary Bill",
  other: "Billing Document",
};

export default function ResultsPage() {
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("billAnalysis");
    if (!stored) {
      router.push("/");
      return;
    }
    setAnalysis(JSON.parse(stored));
  }, [router]);

  if (!analysis) return null;

  const flaggedItems = analysis.lineItems.filter((item) => item.flags.length > 0);
  const totalSuspect = flaggedItems.reduce((sum, item) => sum + item.chargedAmount, 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">💊 BillBuster Results</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Analyze another bill
          </button>
        </div>

        {/* Coverage warning */}
        {analysis.coverageWarning && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex gap-3 text-amber-900 text-sm">
            <span className="shrink-0">📄</span>
            <span>{analysis.coverageWarning}</span>
          </div>
        )}

        {/* No Surprises Act — your legal rights */}
        {analysis.noSurprises && (
          <div
            className={`rounded-2xl border-2 p-6 space-y-4 ${
              analysis.noSurprises.status === "eligible"
                ? "bg-emerald-50 border-emerald-400"
                : analysis.noSurprises.status === "need_estimate"
                ? "bg-amber-50 border-amber-300"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">
                {analysis.noSurprises.status === "eligible" ? "⚖️" : "🛡️"}
              </span>
              <div>
                <h2 className="font-bold text-gray-900 text-lg leading-snug">
                  {analysis.noSurprises.headline}
                </h2>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {analysis.noSurprises.detail}
                </p>
              </div>
            </div>

            {analysis.noSurprises.status === "eligible" &&
              analysis.noSurprises.estimateTotal !== undefined && (
                <div className="flex flex-wrap gap-6 bg-white/70 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Your estimate</p>
                    <p className="font-bold text-gray-900">
                      ${money(analysis.noSurprises.estimateTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Billed</p>
                    <p className="font-bold text-gray-900">
                      ${money(analysis.noSurprises.billedTotal ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Over estimate</p>
                    <p className="font-bold text-emerald-700">
                      ${money(analysis.noSurprises.overage ?? 0)}
                    </p>
                  </div>
                </div>
              )}

            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                What to do
              </p>
              <ol className="space-y-1.5">
                {analysis.noSurprises.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-800">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Your protections →
              </summary>
              <ul className="mt-2 space-y-1.5">
                {analysis.noSurprises.protections.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="shrink-0">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </details>

            <a
              href={analysis.noSurprises.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block px-5 py-2.5 rounded-xl font-semibold text-white text-sm ${
                analysis.noSurprises.status === "eligible"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {analysis.noSurprises.status === "eligible"
                ? "Start your dispute at CMS →"
                : "Learn your rights at CMS →"}
            </a>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {analysis.documentType && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-0.5 text-xs font-medium">
                {DOC_TYPE_LABELS[analysis.documentType] ?? DOC_TYPE_LABELS.other}
              </span>
            )}
            {analysis.facilityName && <span>🏥 {analysis.facilityName}</span>}
            {analysis.serviceDate && <span>📅 {analysis.serviceDate}</span>}
            {analysis.patientName && <span>👤 {analysis.patientName}</span>}
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                {analysis.documentType === "eob" || analysis.documentType === "msn"
                  ? "You May Owe"
                  : "Total Charged"}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                ${money(analysis.totalCharged)}
              </p>
            </div>
            {totalSuspect > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Flagged Amount</p>
                <p className="text-3xl font-bold text-red-600">
                  ${money(totalSuspect)}
                </p>
              </div>
            )}
          </div>

          <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Top Issues */}
        {analysis.topIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="font-semibold text-red-900 mb-3">🚨 Top Issues to Raise</h2>
            <ul className="space-y-2">
              {analysis.topIssues.map((issue, i) => (
                <li key={i} className="flex gap-2 text-red-800">
                  <span className="font-bold shrink-0">{i + 1}.</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Line Items */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 text-lg">
            Line-by-Line Breakdown ({analysis.lineItems.length} items)
          </h2>

          {analysis.lineItems.map((item, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl border p-5 space-y-3 ${
                item.flags.some((f) => f.severity === "red")
                  ? "border-red-300"
                  : item.flags.some((f) => f.severity === "yellow")
                  ? "border-yellow-300"
                  : "border-gray-200"
              }`}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {item.codeType}: {item.code}
                  </span>
                  {item.codeVerified && (
                    <span
                      className="ml-1 text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full align-middle"
                      title={item.codeCategory ? `Recognized code · ${item.codeCategory}` : "Recognized code"}
                    >
                      ✓ recognized
                    </span>
                  )}
                  <p className="font-medium text-gray-900 mt-1">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">
                    ${money(item.chargedAmount)}
                  </p>
                  {item.medicareRate && (
                    <p className="text-xs text-gray-400">
                      Medicare: ~${money(item.medicareRate)}
                      {item.rateSource === "benchmark" ? (
                        <span className="text-green-600"> · verified</span>
                      ) : item.rateSource === "estimated" ? (
                        <span className="text-gray-400"> · est.</span>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>

              {/* Flags */}
              {item.flags.map((flag, fi) => (
                <div
                  key={fi}
                  className={`rounded-lg border px-4 py-2 text-sm flex gap-2 ${FLAG_COLORS[flag.severity]}`}
                >
                  <span>{FLAG_ICONS[flag.type]}</span>
                  <span>{flag.message}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer disclaimer */}
        <p className="text-center text-xs text-gray-400 pb-6">
          BillBuster explains your bill and flags potential issues — it does not provide legal or medical advice.
          Use these findings to ask questions and negotiate with your provider.
        </p>
      </div>
    </main>
  );
}
