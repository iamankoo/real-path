import OpenAI from "openai";
import { NextResponse } from "next/server";

import { createFallbackImprovement } from "@/lib/resume-analysis";
import type { ResumeData, ResumeSkills } from "@/lib/resume";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
};

const stripCodeFences = (value: string) =>
  value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resumeData?: ResumeData };
    const resumeData = body.resumeData;

    if (!resumeData) {
      return NextResponse.json({ error: "resumeData is required" }, { status: 400 });
    }

    const fallback = createFallbackImprovement(resumeData);
    const client = getOpenAIClient();

    if (!client) {
      return NextResponse.json({
        mode: "fallback",
        resume: {
          professionalSummary: fallback.professionalSummary,
          topSkills: fallback.topSkills,
          valueProposition: fallback.valueProposition,
          experience: fallback.experience,
          projects: fallback.projects,
        },
      });
    }

    try {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_RESUME_MODEL || "gpt-4o-mini",
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content:
              "You are a senior resume strategist. Return only valid JSON with concise, recruiter-friendly improvements. Do not invent experience.",
          },
          {
            role: "user",
            content: `
Improve this resume for ATS performance and recruiter clarity.
Return JSON with this shape:
{
  "professionalSummary": "string",
  "topSkills": "comma separated string",
  "valueProposition": "string",
  "experience": [{ "responsibilities": "string", "measurableImpact": "string" }],
  "projects": [{ "contribution": "string", "outcome": "string" }],
  "skills": {
    "languages": "string",
    "frameworks": "string",
    "tools": "string",
    "databases": "string",
    "cloud": "string",
    "softSkills": "string",
    "spokenLanguages": "string"
  },
  "improvementNotes": ["string"]
}

Resume JSON:
${JSON.stringify(resumeData, null, 2)}
            `.trim(),
          },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content;

      if (!rawContent) {
        throw new Error("OpenAI returned empty content");
      }

      const parsed = JSON.parse(stripCodeFences(rawContent)) as {
        professionalSummary?: string;
        topSkills?: string;
        valueProposition?: string;
        experience?: Array<{
          responsibilities?: string;
          measurableImpact?: string;
        }>;
        projects?: Array<{
          contribution?: string;
          outcome?: string;
        }>;
        skills?: Partial<ResumeSkills>;
        improvementNotes?: string[];
      };

      return NextResponse.json({
        mode: "openai",
        resume: {
          professionalSummary:
            parsed.professionalSummary || fallback.professionalSummary,
          topSkills: parsed.topSkills || resumeData.topSkills,
          valueProposition: parsed.valueProposition || resumeData.valueProposition,
          experience: resumeData.experience.map((entry, index) => ({
            ...entry,
            responsibilities:
              parsed.experience?.[index]?.responsibilities || entry.responsibilities,
            measurableImpact:
              parsed.experience?.[index]?.measurableImpact || entry.measurableImpact,
          })),
          projects: resumeData.projects.map((project, index) => ({
            ...project,
            contribution:
              parsed.projects?.[index]?.contribution || project.contribution,
            outcome: parsed.projects?.[index]?.outcome || project.outcome,
          })),
          skills: {
            ...resumeData.skills,
            ...(parsed.skills || {}),
          },
        },
        notes: parsed.improvementNotes || [],
      });
    } catch (openAiError) {
      console.warn("Improve API OpenAI fallback:", openAiError);

      return NextResponse.json({
        mode: "fallback",
        resume: {
          professionalSummary: fallback.professionalSummary,
          topSkills: fallback.topSkills,
          valueProposition: fallback.valueProposition,
          experience: fallback.experience,
          projects: fallback.projects,
        },
      });
    }
  } catch (error) {
    console.error("Improve API error:", error);

    return NextResponse.json({ error: "AI resume improvement failed" }, { status: 500 });
  }
}
