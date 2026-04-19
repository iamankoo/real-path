import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";

import { analyzeResumeText } from "@/lib/resume-analysis";
import type { ResumeInsights } from "@/lib/resume";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExtractionMethod = "embedded-text" | "ocr-fallback";
type OCRFailureKind = "quota" | "payload" | "unknown";

const maxResumeBytes = 8 * 1024 * 1024;

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey, maxRetries: 0, timeout: 45_000 }) : null;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const stripCodeFences = (value: string) =>
  value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const hasMeaningfulResumeText = (text: string) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized ? normalized.split(" ").length : 0;
  return normalized.length >= 80 && words >= 12;
};

const extractResumeText = async (file: File) => {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return await file.text();
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
};

const extractResumeTextWithOCR = async (file: File, client: OpenAI) => {
  const upload = await client.files.create({
    file: await toFile(Buffer.from(await file.arrayBuffer()), file.name || "resume.pdf", {
      type: file.type || "application/pdf",
    }),
    purpose: "user_data",
    expires_after: {
      anchor: "created_at",
      seconds: 3600,
    },
  });

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_OCR_MODEL || process.env.OPENAI_RESUME_MODEL || "gpt-4o-mini",
      instructions:
        "You extract resume text from PDF files. Return plain text only. Preserve headings, bullet points, dates, links, emails, and quantified achievements. Do not summarize and do not add commentary.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract all readable text from this resume PDF. Return only the resume text in plain format.",
            },
            {
              type: "input_file",
              file_id: upload.id,
            },
          ],
        },
      ],
      max_output_tokens: 6000,
      store: false,
    });

    return response.output_text.trim();
  } finally {
    await client.files.delete(upload.id).catch(() => undefined);
  }
};

const getOCRFailureKind = (error: unknown): OCRFailureKind => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : undefined;
  const message = error instanceof Error ? error.message : "";

  if (status === 429 || /quota|rate limit|insufficient/i.test(message)) {
    return "quota";
  }

  if (status === 400 || /file|payload|unsupported|invalid/i.test(message)) {
    return "payload";
  }

  return "unknown";
};

const getFriendlyExtractionError = ({
  parseMessage,
  ocrAttempted,
  clientAvailable,
  ocrFailureKind,
}: {
  parseMessage?: string;
  ocrAttempted: boolean;
  clientAvailable: boolean;
  ocrFailureKind?: OCRFailureKind;
}) => {
  if (parseMessage && /password/i.test(parseMessage)) {
    return "This PDF looks password-protected. Please upload an unlocked resume PDF.";
  }

  if (parseMessage && /Invalid PDF|corrupt|format/i.test(parseMessage)) {
    return "This file does not look like a valid PDF resume. Please upload a clean PDF export.";
  }

  if (!clientAvailable) {
    return "We could not extract enough readable text from this PDF. Add OPENAI_API_KEY on Vercel to enable OCR fallback for scanned or image-based resumes.";
  }

  if (ocrFailureKind === "quota") {
    return "This looks like a scanned or image-based PDF. OCR fallback is configured, but the OpenAI quota or rate limit is unavailable right now. Please retry later or upload a text-based PDF export.";
  }

  if (ocrFailureKind === "payload") {
    return "This looks like a scanned or image-based PDF, but OCR fallback could not process the uploaded file format. Please export a fresh PDF and try again.";
  }

  if (ocrAttempted) {
    return "We tried both embedded text extraction and OCR fallback, but this PDF still could not be read clearly. Please upload a cleaner text-based PDF export.";
  }

  return "We could not extract enough readable text from this PDF. If it is image-based, OCR fallback should handle it once OPENAI_API_KEY is available on Vercel.";
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > maxResumeBytes + 200_000) {
      return NextResponse.json(
        { error: "Upload a resume PDF smaller than 8 MB." },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const targetRole = String(formData.get("targetRole") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A resume file is required" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > maxResumeBytes) {
      return NextResponse.json(
        { error: "Upload a resume PDF smaller than 8 MB." },
        { status: 413 },
      );
    }

    const client = getOpenAIClient();
    const canUseOCR = Boolean(client) && isPdfFile(file);
    let extractionMethod: ExtractionMethod = "embedded-text";
    let resumeText = "";
    let parseMessage = "";
    let ocrAttempted = false;
    let ocrFailureKind: OCRFailureKind | undefined;

    try {
      resumeText = (await withTimeout(extractResumeText(file), 20_000, "PDF extraction")).trim();
    } catch (parseError) {
      console.warn("Analyze API parse fallback:", parseError);
      parseMessage =
        parseError instanceof Error ? parseError.message : "Could not read the uploaded PDF";
    }

    const needsOCR =
      isPdfFile(file) &&
      (!hasMeaningfulResumeText(resumeText) || Boolean(parseMessage));

    if (needsOCR && canUseOCR && client) {
      ocrAttempted = true;

      try {
        const ocrText = await withTimeout(
          extractResumeTextWithOCR(file, client),
          45_000,
          "OCR extraction",
        );

        if (ocrText && hasMeaningfulResumeText(ocrText)) {
          resumeText = ocrText;
          extractionMethod = "ocr-fallback";
        }
      } catch (ocrError) {
        ocrFailureKind = getOCRFailureKind(ocrError);
        console.warn("Analyze API OCR fallback:", ocrError);
      }
    }

    if (!resumeText || !hasMeaningfulResumeText(resumeText)) {
      return NextResponse.json(
        {
          error: getFriendlyExtractionError({
            parseMessage,
            ocrAttempted,
            clientAvailable: canUseOCR,
            ocrFailureKind,
          }),
        },
        { status: 400 },
      );
    }

    const baseline = analyzeResumeText(resumeText, targetRole);

    if (!client) {
      return NextResponse.json({
        ...baseline,
        fileName: file.name,
        extractedCharacters: resumeText.length,
        extractionMethod,
      });
    }

    try {
      const completion = await withTimeout(
        client.chat.completions.create({
          model: process.env.OPENAI_RESUME_MODEL || "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are a resume analyst. Return only JSON and keep recommendations grounded in the provided resume text.",
            },
            {
              role: "user",
              content: `
You are augmenting an ATS analysis. Keep the numeric scores exactly as provided and refine only the narrative arrays.
Return JSON with this shape:
{
  "analysisSummary": "string",
  "recommendedRoles": ["string"],
  "strengths": ["string"],
  "weakSections": ["string"],
  "suggestions": ["string"],
  "missingSkills": ["string"],
  "missingKeywords": ["string"],
  "suggestedCertifications": ["string"],
  "salaryReadinessBand": "string"
}

Baseline:
${JSON.stringify(baseline, null, 2)}

Resume Text:
${resumeText.slice(0, 12000)}
            `.trim(),
            },
          ],
        }),
        45_000,
        "OpenAI analysis",
      );

      const rawContent = completion.choices[0]?.message?.content;

      if (!rawContent) {
        throw new Error("OpenAI returned empty content");
      }

      const parsed = JSON.parse(stripCodeFences(rawContent)) as Partial<ResumeInsights>;

      return NextResponse.json({
        ...baseline,
        ...parsed,
        analysisEngine: "openai+heuristics",
        fileName: file.name,
        extractedCharacters: resumeText.length,
        extractionMethod,
      });
    } catch (openAiError) {
      console.warn("Analyze API OpenAI fallback:", openAiError);

      return NextResponse.json({
        ...baseline,
        fileName: file.name,
        extractedCharacters: resumeText.length,
        extractionMethod,
      });
    }
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ error: "Resume analysis failed" }, { status: 500 });
  }
}
