"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_BILL } from "@/lib/demoData";
import { PillButton } from "@/components/Pill";
import { DocumentIcon, UploadIcon, CheckIcon } from "@/components/Icons";

const CHECKS = [
  {
    title: "Duplicates & unbundling",
    body: "Catches the same charge billed twice, and procedures billed as separate line items when they should be one bundled code.",
  },
  {
    title: "Price vs. real Medicare rates",
    body: "Every recognizable code is checked against the actual published Medicare benchmark rate — not a guess.",
  },
  {
    title: "Your dispute rights",
    body: "Flags when the No Surprises Act or the federal patient-provider dispute process gives you a legal lever to pull.",
  },
];

const STEPS = [
  { n: "01", title: "Upload your bill", body: "A PDF or a photo of a paper bill — a Good Faith Estimate is optional." },
  { n: "02", title: "We check every code", body: "Each line is matched against a reference database and priced against Medicare rates." },
  { n: "03", title: "You get a plan", body: "Plain-English flags, a phone script for each one, and your negotiation playbook." },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [estimate, setEstimate] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (estimate) formData.append("estimate", estimate);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 413) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.message ??
              `This file is too large to analyze${body?.maxMB ? ` (over ${body.maxMB} MB)` : ""}. Please split it into fewer pages or re-scan it at a lower resolution.`
          );
        }
        throw new Error("Something went wrong. Please try again.");
      }

      const analysis = await res.json();
      sessionStorage.setItem("billAnalysis", JSON.stringify(analysis));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleDemo = () => {
    sessionStorage.setItem("billAnalysis", JSON.stringify(DEMO_BILL));
    router.push("/results");
  };

  return (
    <main className="flex flex-col items-center">
      {/* Hero */}
      <section className="w-full max-w-[1200px] px-6 pt-24 pb-16 text-center">
        <h1 className="mx-auto max-w-[820px] font-display font-light text-heading-lg sm:text-display text-ink-black">
          Understand your medical bill.
          <br />
          Then know what to say.
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] font-ui text-[18px] leading-relaxed text-ash-gray">
          Upload a hospital bill and get a plain-English breakdown, a price check against real
          Medicare rates, and a copy-ready script for every charge worth disputing.
        </p>
      </section>

      {/* Upload card */}
      <section id="upload" className="w-full max-w-[560px] px-6 scroll-mt-28">
        <form
          onSubmit={handleSubmit}
          className="rounded-cards border border-fog-gray bg-pure-white p-6 sm:p-8 space-y-5"
        >
          <label className="block cursor-pointer">
            <div
              className={`rounded-inputs border p-8 text-center transition-colors ${
                file ? "border-signal-violet bg-tint-wash/30" : "border-mist-gray hover:border-ink-black"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2 text-ink-black">
                  <DocumentIcon className="text-signal-violet" />
                  <p className="text-[15px] font-normal">{file.name}</p>
                  <p className="text-[12px] text-slate-gray">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · click to change
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-ash-gray">
                  <UploadIcon className="text-signal-violet" />
                  <p className="text-[15px] text-ink-black">Drop your bill here or click to upload</p>
                  <p className="text-[12px] text-slate-gray">
                    JPG, PNG, or PDF — a photo of a paper bill works too
                  </p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {/* Optional: good faith estimate — unlocks the federal dispute check */}
          <label className="block cursor-pointer">
            <div
              className={`rounded-inputs border px-4 py-3 flex items-center gap-3 transition-colors ${
                estimate ? "border-signal-violet bg-tint-wash/30" : "border-mist-gray hover:border-ink-black"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                  estimate ? "border-signal-violet text-signal-violet" : "border-mist-gray text-mist-gray"
                }`}
              >
                {estimate ? <CheckIcon /> : <span className="text-[16px] leading-none">+</span>}
              </span>
              <div className="min-w-0 flex-1">
                {estimate ? (
                  <>
                    <p className="truncate text-[14px] text-ink-black">{estimate.name}</p>
                    <p className="text-[12px] text-ash-gray">
                      Estimate added — we&apos;ll check if you can dispute this bill
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] text-ink-black">
                      Got a cost estimate? Add it <span className="text-slate-gray">(optional)</span>
                    </p>
                    <p className="text-[12px] text-slate-gray">
                      $400+ over a written estimate may unlock a federal review
                    </p>
                  </>
                )}
              </div>
              {estimate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setEstimate(null);
                  }}
                  className="shrink-0 text-[12px] text-slate-gray hover:text-ink-black"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => setEstimate(e.target.files?.[0] ?? null)}
            />
          </label>

          {error && <p className="text-center text-[13px] text-ink-black">{error}</p>}

          <PillButton type="submit" disabled={!file || loading} className="w-full">
            {loading ? "Analyzing your bill…" : "Analyze my bill →"}
          </PillButton>

          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-fog-gray" />
            <span className="text-[12px] text-slate-gray">or</span>
            <div className="h-px flex-1 bg-fog-gray" />
          </div>

          <PillButton type="button" variant="outline" onClick={handleDemo} className="w-full">
            Try the demo — a real $97,998 surgical bill
          </PillButton>
        </form>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-slate-gray">
          Tested on real bills published by KFF Health News. Not legal or medical advice.
        </p>
      </section>

      {/* What it checks */}
      <section className="mt-24 w-full max-w-[1200px] px-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {CHECKS.map((c) => (
            <div key={c.title} className="rounded-cards border border-fog-gray p-6">
              <p className="text-[12px] font-normal uppercase tracking-[0.04em] text-signal-violet">
                What it checks
              </p>
              <h3 className="mt-3 text-[20px] leading-tight text-ink-black">{c.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ash-gray">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mt-24 w-full max-w-[1200px] px-6 pb-24 scroll-mt-28">
        <h2 className="text-center font-display font-light text-heading text-ink-black">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center sm:text-left">
              <span className="font-display font-light text-[40px] leading-none text-signal-violet">{s.n}</span>
              <h3 className="mt-3 text-[20px] text-ink-black">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ash-gray">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
