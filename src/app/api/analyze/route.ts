import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, BILL_ANALYSIS_PROMPT } from "@/lib/claude";
import { groundLineItem } from "@/lib/codeDatabase";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mimeType = file.type;
    const isPdf = mimeType === "application/pdf";
    const isImage = (IMAGE_TYPES as readonly string[]).includes(mimeType);

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or an image (JPEG, PNG, WebP, GIF)." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // PDFs go to Claude as a document block; images as an image block.
    const fileBlock: Anthropic.ContentBlockParam = isPdf
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mimeType as ImageType, data: base64 },
        };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: BILL_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
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

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze bill. Please try again." },
      { status: 500 }
    );
  }
}
