import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, BILL_ANALYSIS_PROMPT } from "@/lib/claude";
import { groundLineItem } from "@/lib/codeDatabase";
import { assessNoSurprises } from "@/lib/noSurprises";
import { decodeAll } from "@/lib/denialCodes";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

// Anthropic's request cap is ~32 MB total; base64 inflates raw bytes by ~4/3, so we
// gate on the ENCODED size. 30 MB encoded ≈ 22 MB raw — comfortably under the API's
// hard limit (gap #26: a 26 MB PDF was blowing past it and coming back as a bare 500).
const MAX_ENCODED_BYTES = 30 * 1024 * 1024; // 30 MB, base64-encoded
const MAX_RAW_MB = Math.floor((MAX_ENCODED_BYTES * 3) / 4 / (1024 * 1024)); // ~22 MB raw

function fileTooLargeResponse() {
  return NextResponse.json(
    {
      error: "file_too_large",
      message:
        `This file is too large to analyze (over ${MAX_RAW_MB} MB). Please split it into fewer pages ` +
        "or re-export/scan it at a lower resolution, then upload it again.",
      maxMB: MAX_RAW_MB,
    },
    { status: 413 }
  );
}

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

    // Guard against the request exceeding Anthropic's size cap (gap #26) before we
    // ever make the call — check the total ENCODED size of every document/image block.
    const encodedBytes = promptContent.reduce((sum, block) => {
      if ((block.type === "document" || block.type === "image") && block.source?.type === "base64") {
        return sum + block.source.data.length;
      }
      return sum;
    }, 0);
    if (encodedBytes > MAX_ENCODED_BYTES) {
      return fileTooLargeResponse();
    }

    // Long itemized bills (79+ lines) overran a 16K output cap once the prompt started
    // asking for adjustment codes too, truncating the JSON mid-string (gap #17).
    // Stream with a larger cap; the SDK requires streaming for big max_tokens values.
    let response;
    try {
      response = await anthropic.messages
        .stream({
          model: "claude-opus-4-8",
          max_tokens: 32000,
          messages: [{ role: "user", content: promptContent }],
        })
        .finalMessage();
    } catch (apiErr) {
      const status =
        apiErr instanceof Anthropic.APIError ? apiErr.status : undefined;
      if (status === 413) {
        return fileTooLargeResponse();
      }
      throw apiErr;
    }

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }
    if (response.stop_reason === "max_tokens") {
      // Honest failure beats a half-parsed bill: tell the user rather than 500.
      return NextResponse.json(
        {
          error: "bill_too_long",
          message:
            "This bill has more line items than we can read in one pass. Try uploading fewer pages at a time (for example, split it in half).",
        },
        { status: 422 }
      );
    }

    // Claude sometimes wraps JSON in markdown code fences — strip them
    const raw = content.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const analysis = JSON.parse(raw);

    // Multi-document packets (gap #3): a single PDF often bundles a hospital bill + an
    // EOB + a denial letter. Classifying the whole thing by its first page (usually an
    // EOB) drove the headline total to $0 and suppressed the patient's rights. Derive
    // the governing figures from the bill documents in code, as a deterministic safety
    // net that holds even when the model mis-summarizes the packet.
    const BILL_DOC_TYPES = ["itemized_statement", "ub04_claim", "cms1500_claim", "summary_bill"];
    if (Array.isArray(analysis.documents) && analysis.documents.length > 0) {
      const billDocs = analysis.documents.filter(
        (d: { type?: string }) => d && BILL_DOC_TYPES.includes(d.type ?? "")
      );
      const governing = billDocs.reduce(
        (max: number, d: { totalCharged?: number }) =>
          typeof d.totalCharged === "number" && d.totalCharged > max ? d.totalCharged : max,
        0
      );
      // If the model left the headline at 0/missing but a bill document shows charges, use it.
      if ((typeof analysis.totalCharged !== "number" || analysis.totalCharged <= 0) && governing > 0) {
        analysis.totalCharged = governing;
      }
      // A real bill is present → don't let an EOB classification suppress reconciliation
      // or the No Surprises rights layer downstream.
      if (billDocs.length > 0 && (analysis.documentType === "eob" || analysis.documentType === "msn")) {
        analysis.documentType = billDocs[0].type;
      }
    }

    // Deterministic grounding: Claude decodes each code into plain English, but the
    // authoritative facts (does the code exist, its category, and the real Medicare
    // benchmark) come from our reference DB — so dollar comparisons aren't guesses.
    if (Array.isArray(analysis.lineItems)) {
      for (const item of analysis.lineItems) groundLineItem(item);
    }

    // Denial/remark codes (gap #7): Claude reports the raw codes printed on an EOB/MSN
    // ("adjustmentCodes"); a deterministic dictionary decides what each one means and
    // whether it's a dispute opportunity — never the model. Omit when there's nothing.
    if (Array.isArray(analysis.adjustmentCodes) && analysis.adjustmentCodes.length > 0) {
      const denials = decodeAll(analysis.adjustmentCodes);
      if (denials.length > 0) analysis.denials = denials;
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
