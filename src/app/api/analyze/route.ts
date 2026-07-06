import { NextRequest, NextResponse } from "next/server";
import { anthropic, BILL_ANALYSIS_PROMPT } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType === "application/pdf" ? "image/jpeg" : mimeType,
                data: base64,
              },
            },
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

    const analysis = JSON.parse(content.text);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze bill. Please try again." },
      { status: 500 }
    );
  }
}
