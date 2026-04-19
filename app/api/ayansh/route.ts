import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  AYANSH_FALLBACK_MESSAGE,
  AYANSH_QUICK_QUESTIONS,
  AYANSH_SUPPORT_EMAIL,
  findAyanshFaqAnswer,
  type AyanshReply,
  type AyanshRole,
} from "@/lib/ayansh";

export const runtime = "nodejs";
export const maxDuration = 30;

type AyanshRequestBody = {
  message?: string;
  history?: Array<{
    role?: AyanshRole;
    content?: string;
  }>;
};

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey, maxRetries: 1, timeout: 20_000 }) : null;
};

const sanitizeMessage = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

const sanitizeHistory = (history: AyanshRequestBody["history"]) =>
  (history || [])
    .filter(
      (item): item is { role: AyanshRole; content: string } =>
        (item.role === "assistant" || item.role === "user") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      content: sanitizeMessage(item.content),
    }));

const productKnowledge = () =>
  AYANSH_QUICK_QUESTIONS.map((item) => `- ${item.label}: ${item.answer}`).join("\n");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AyanshRequestBody;
    const message = sanitizeMessage(body.message);

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const faqReply = findAyanshFaqAnswer(message);

    if (faqReply) {
      return NextResponse.json<AyanshReply>(faqReply);
    }

    const client = getOpenAIClient();

    if (!client) {
      return NextResponse.json<AyanshReply>({
        answer: AYANSH_FALLBACK_MESSAGE,
        mode: "fallback",
      });
    }

    const history = sanitizeHistory(body.history);
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_HELP_MODEL || process.env.OPENAI_RESUME_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content: `
You are Ayansh, the AI Help Box inside Real Path.
Answer only about Real Path product help: resume builder, ATS analyzer, login/signup, cloud save, saved resumes, photo studio, PDF export, account help, and Vercel-style production issues.
Use a calm, simple, human support tone. Prefer short step-by-step guidance.
Do not invent account-specific facts, claim you performed actions, or ask for secrets.
If the question cannot be solved from product guidance, say: "${AYANSH_FALLBACK_MESSAGE}"
Support email: ${AYANSH_SUPPORT_EMAIL}

Real Path knowledge base:
${productKnowledge()}
          `.trim(),
        },
        ...history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        {
          role: "user" as const,
          content: message,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    return NextResponse.json<AyanshReply>({
      answer: answer || AYANSH_FALLBACK_MESSAGE,
      mode: answer ? "ai" : "fallback",
    });
  } catch {
    return NextResponse.json<AyanshReply>({
      answer: AYANSH_FALLBACK_MESSAGE,
      mode: "fallback",
    });
  }
}
