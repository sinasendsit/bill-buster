"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_BILL } from "@/lib/demoData";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
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

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Analysis failed");

      const analysis = await res.json();
      sessionStorage.setItem("billAnalysis", JSON.stringify(analysis));
      router.push("/results");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleDemo = () => {
    sessionStorage.setItem("billAnalysis", JSON.stringify(DEMO_BILL));
    router.push("/results");
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            💊 BillBuster
          </h1>
          <p className="text-lg text-gray-600">
            Upload your medical bill. We&apos;ll decode every code, flag every
            suspicious charge, and show you exactly where to push back.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drop Zone */}
            <label className="block cursor-pointer">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                  file
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 bg-gray-50"
                }`}
              >
                {file ? (
                  <div>
                    <div className="text-3xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-sm text-blue-600 mt-2">Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">📂</div>
                    <p className="font-medium text-gray-700">
                      Drop your bill here or click to upload
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      JPG, PNG, or PDF — photo of a paper bill works too
                    </p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Analyzing your bill…" : "Analyze My Bill"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Demo Button */}
          <button
            onClick={handleDemo}
            className="w-full py-3 px-6 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>👀</span> See a Demo Bill
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            No upload needed — explore with a realistic sample ER bill
          </p>
        </div>

        {/* Trust Note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your bill is sent securely for analysis and never stored.
          This tool explains bills — it does not provide legal advice.
        </p>
      </div>
    </main>
  );
}
