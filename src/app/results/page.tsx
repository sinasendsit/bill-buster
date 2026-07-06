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
  severity_mismatch: "⚠️",
  unrelated: "❓",
  price_outlier: "💸",
  info: "ℹ️",
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

        {/* Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {analysis.facilityName && <span>🏥 {analysis.facilityName}</span>}
            {analysis.serviceDate && <span>📅 {analysis.serviceDate}</span>}
            {analysis.patientName && <span>👤 {analysis.patientName}</span>}
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Charged</p>
              <p className="text-3xl font-bold text-gray-900">
                ${analysis.totalCharged.toLocaleString()}
              </p>
            </div>
            {totalSuspect > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Flagged Amount</p>
                <p className="text-3xl font-bold text-red-600">
                  ${totalSuspect.toLocaleString()}
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
                  <p className="font-medium text-gray-900 mt-1">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">
                    ${item.chargedAmount.toLocaleString()}
                  </p>
                  {item.medicareRate && (
                    <p className="text-xs text-gray-400">
                      Medicare: ~${item.medicareRate.toLocaleString()}
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
