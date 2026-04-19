import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getCloudUserId, guestNoop } from "@/lib/server/cloud-auth";
import { jsonError } from "@/lib/server/api-response";
import {
  getMongoCollection,
  type MongoPdfExport,
  type MongoResume,
  type MongoResumeVersion,
} from "@/lib/server/mongo";

export const runtime = "nodejs";

const safeName = (value: string) => value.replace(/[^a-z0-9_.-]+/gi, "-").slice(0, 80);
const maxPdfBytes = 8 * 1024 * 1024;

const bufferToDataUrl = (buffer: Buffer, contentType: string) =>
  `data:${contentType};base64,${buffer.toString("base64")}`;

export async function POST(request: Request) {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return guestNoop("Guest mode active. Log in to save exported PDFs.", auth);
    }

    const userId = auth.userId;

    const formData = await request.formData();
    const file = formData.get("file");
    const template = String(formData.get("template") || "modern");
    const resumeData = String(formData.get("resumeData") || "{}");
    const resumeIdRaw = String(formData.get("resumeId") || "");
    const resumeId = ObjectId.isValid(resumeIdRaw) ? new ObjectId(resumeIdRaw) : null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "PDF file is required." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > maxPdfBytes) {
      return NextResponse.json(
        { success: false, error: "Please export a PDF smaller than 8 MB." },
        { status: 413 },
      );
    }

    const parsedResumeData = JSON.parse(resumeData) as unknown;
    const buffer = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const pdfExport: MongoPdfExport = {
      _id: new ObjectId(),
      userId,
      resumeId: resumeId || undefined,
      fileName: safeName(file.name || "resume.pdf"),
      contentType: file.type || "application/pdf",
      pdfDataUrl: bufferToDataUrl(buffer, file.type || "application/pdf"),
      template,
      resumeData: parsedResumeData,
      createdAt: now,
    };

    await (await getMongoCollection<MongoPdfExport>("pdf_exports")).insertOne(pdfExport);

    if (resumeId) {
      await (await getMongoCollection<MongoResume>("resumes")).updateOne(
        { _id: resumeId, userId },
        { $set: { pdfExportId: pdfExport._id, updatedAt: now } },
      );
    }

    await (await getMongoCollection<MongoResumeVersion>("resume_versions")).insertOne({
      _id: new ObjectId(),
      resumeId: resumeId || undefined,
      userId,
      version: 0,
      data: {
        template,
        resumeData: parsedResumeData,
        pdf_export_id: pdfExport._id.toString(),
      },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      mode: "user",
      saved: true,
      exportId: pdfExport._id.toString(),
      storagePath: `mongo://pdf-exports/${pdfExport._id.toString()}`,
    });
  } catch (error) {
    return jsonError(error, "PDF export could not be stored.");
  }
}
