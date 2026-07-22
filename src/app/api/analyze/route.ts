import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, BILL_ANALYSIS_PROMPT } from "@/lib/claude";
import { groundLineItem } from "@/lib/codeDatabase";
import { assessNoSurprises } from "@/lib/noSurprises";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

/** Turn an uploaded PDF/image into a Claude content block, or null if unsupported. */
async function toContentBlock(f: File): Promise<Anthropic.ContentBlockParam | null> {
  const mimeType = f.type;
  const isPdf = mimeType === "application/pdf";
  const isImage = (IMAGE_TYPES as readonly string[]).includes(mimeType);
  if (!isPdf && !isImage) return null;

  const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
  return isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mimeType as ImageType, data: base64 } };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileBlock = await toContentBlock(file);
    if (!fileBlock) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or an image (JPEG, PNG, WebP, GIF)." },
        { status: 400 }
      );
    }

    // Optional second upload: the patient's good faith estimate. Comparing the bill
    // against it is what unlocks the federal dispute right, so it goes to Claude as a
    // clearly-labeled second document.
    const estimateFile = formData.get("estimate") as File | null;
    const estimateBlock =
      estimateFile && estimateFile.size > 0 ? await toContentBlock(estimateFile) : null;

    const promptContent: Anthropic.ContentBlockParam[] = [fileBlock];
    if (estimateBlock) {
      promptContent.push({
        type: "text",
        text: "The NEXT document is the patient's GOOD FAITH ESTIMATE — the written cost estimate they were given before treatment. It is not a bill. Extract its total as estimateTotal.",
      });
      promptContent.push(estimateBlock);
    }
    promptContent.push({ type: "text", text: BILL_ANALYSIS_PROMPT });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      messages: [{ role: "user", content: promptContent }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Claude sometimes wraps JSON in markdown code fences — strip them
    const raw = content.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const analysis = JSON.parse(raw);

    // Deterministic grounding: Claude decodes each code into plain English, but the
    // authoritative facts (does the code exist, its category, and the real Medicare
    // benchmark) come from our reference DB — so dollar comparisons aren't guesses.
    if (Array.isArray(analysis.lineItems)) {
      for (const item of analysis.lineItems) groundLineItem(item);
    }

    // Cross-check the printed grand total against the sum of the line items —
    // but never silently overwrite the headline with a sum we can't trust. On a
    // claim form a single misread decimal (amounts print without a decimal point)
    // can inflate the line-item sum by orders of magnitude, so when the two
    // disagree we keep the document's stated total and surface the gap honestly.
    // Skip EOBs/MSNs: there the line items are provider CHARGES while the total is
    // the patient-responsibility amount, so they legitimately never reconcile.
    const skipReconcile =
      analysis.documentType === "eob" || analysis.documentType === "msn";
    if (
      !skipReconcile &&
      Array.isArray(analysis.lineItems) &&
      analysis.lineItems.length > 0
    ) {
      const money = (n: number) =>
        n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const lineSum =
        Math.round(
          analysis.lineItems.reduce(
            (sum: number, item: { chargedAmount?: number }) =>
              sum + (typeof item.chargedAmount === "number" ? item.chargedAmount : 0),
            0
          ) * 100
        ) / 100;
      const stated = analysis.totalCharged;

      if (typeof stated !== "number" || stated <= 0) {
        // No usable stated total — the line-item sum is the only signal we have.
        if (lineSum > 0) analysis.totalCharged = lineSum;
      } else {
        // Tolerance: $1, or 1% of the stated total to absorb rounding on big bills.
        const tolerance = Math.max(1, Math.abs(stated) * 0.01);
        if (Math.abs(stated - lineSum) > tolerance) {
          const note =
            lineSum > stated
              ? `Heads up: the line items listed below add up to $${money(lineSum)}, but the document's stated total is $${money(stated)}. Claim forms print amounts without a decimal point, so a single misread line can inflate the breakdown — treat the line-by-line figures as approximate and verify them against your paper bill. The $${money(stated)} total is what the document itself states.`
              : `The line items listed below add up to $${money(lineSum)}, but the document's stated total is $${money(stated)}. Some charges may be on pages that weren't part of this upload, so the breakdown below may be incomplete. The $${money(stated)} total reflects the full bill.`;
          analysis.coverageWarning = analysis.coverageWarning
            ? `${analysis.coverageWarning} ${note}`
            : note;
          // Keep the document's stated total as the headline — do not overwrite.
        }
      }
    }

    // No Surprises Act: Claude reports the raw facts, but eligibility for the federal
    // dispute process is decided here in code — never by the model. Runs last so it
    // uses the final reconciled total.
    analysis.noSurprises = assessNoSurprises({
      selfPay: analysis.selfPay,
      billedTotal: analysis.totalCharged,
      estimateTotal: analysis.estimateTotal,
      documentType: analysis.documentType,
    });

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze bill. Please try again." },
      { status: 500 }
    );
  }
}
