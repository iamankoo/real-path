import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import {
  applySessionCleanup,
  getCloudUserId,
  guestNoop,
} from "@/lib/server/cloud-auth";
import { jsonError } from "@/lib/server/api-response";
import {
  getMongoCollection,
  type MongoResume,
  type MongoResumeVersion,
} from "@/lib/server/mongo";
import type { ResumeData, ResumeTemplate } from "@/lib/resume";

export const runtime = "nodejs";

const isTemplate = (value: unknown): value is ResumeTemplate =>
  value === "modern" || value === "professional" || value === "minimal";

const toApiResume = (resume: MongoResume) => ({
  id: resume._id.toString(),
  user_id: resume.userId.toString(),
  title: resume.title,
  template: resume.template,
  data: resume.data,
  pdf_storage_path: null,
  version: resume.version,
  created_at: resume.createdAt.toISOString(),
  updated_at: resume.updatedAt.toISOString(),
});

export async function GET() {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return applySessionCleanup(
        NextResponse.json({ success: true, mode: "guest", resumes: [] }),
        auth,
      );
    }

    const userId = auth.userId;

    const resumes = await (
      await getMongoCollection<MongoResume>("resumes")
    )
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ mode: "user", resumes: resumes.map(toApiResume) });
  } catch (error) {
    return jsonError(error, "Saved resumes could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return guestNoop("Guest mode active. Log in to save resumes.", auth);
    }

    const userId = auth.userId;

    const body = (await request.json()) as {
      resumeId?: string | null;
      title?: string;
      template?: ResumeTemplate;
      data?: ResumeData;
    };

    if (!body.data || !isTemplate(body.template)) {
      return NextResponse.json(
        { success: false, error: "Resume data and template are required." },
        { status: 400 },
      );
    }

    const title = body.title?.trim() || body.data.fullName || "Untitled Resume";
    const now = new Date();
    const resumes = await getMongoCollection<MongoResume>("resumes");
    const versions = await getMongoCollection<MongoResumeVersion>("resume_versions");

    if (body.resumeId) {
      const resumeId = ObjectId.isValid(body.resumeId)
        ? new ObjectId(body.resumeId)
        : null;

      if (!resumeId) {
        return NextResponse.json(
          { success: false, error: "Resume was not found." },
          { status: 404 },
        );
      }

      const updated = await resumes.findOneAndUpdate(
        { _id: resumeId, userId },
        {
          $set: {
            title,
            template: body.template,
            data: body.data,
            updatedAt: now,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Resume was not found." },
          { status: 404 },
        );
      }

      await versions.insertOne({
        _id: new ObjectId(),
        resumeId: updated._id,
        userId,
        version: updated.version,
        data: body.data,
        createdAt: now,
      } as MongoResumeVersion);

      return NextResponse.json({
        success: true,
        mode: "user",
        saved: true,
        resume: toApiResume(updated),
      });
    }

    const resume: MongoResume = {
      _id: new ObjectId(),
      userId,
      title,
      template: body.template,
      data: body.data,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    await resumes.insertOne(resume);
    await versions.insertOne({
      _id: new ObjectId(),
      resumeId: resume._id,
      userId,
      version: 1,
      data: body.data,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      mode: "user",
      saved: true,
      resume: toApiResume(resume),
    });
  } catch (error) {
    return jsonError(error, "Resume could not be saved.");
  }
}
