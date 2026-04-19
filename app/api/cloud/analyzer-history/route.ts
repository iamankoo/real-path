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
  type MongoAnalyzerHistory,
} from "@/lib/server/mongo";

export const runtime = "nodejs";

const toApiHistory = (history: MongoAnalyzerHistory) => ({
  id: history._id.toString(),
  user_id: history.userId.toString(),
  file_name: history.fileName,
  target_role: history.targetRole || null,
  extracted_characters: history.extractedCharacters,
  extraction_method: history.extractionMethod,
  insights: history.insights,
  created_at: history.createdAt.toISOString(),
});

export async function GET() {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return applySessionCleanup(
        NextResponse.json({ success: true, mode: "guest", history: [] }),
        auth,
      );
    }

    const userId = auth.userId;

    const history = await (
      await getMongoCollection<MongoAnalyzerHistory>("analyzer_history")
    )
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ mode: "user", history: history.map(toApiHistory) });
  } catch (error) {
    return jsonError(error, "Analyzer history could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return guestNoop("Guest mode active. Log in to save analyzer history.", auth);
    }

    const userId = auth.userId;

    const body = (await request.json()) as {
      fileName?: string;
      targetRole?: string;
      extractedCharacters?: number;
      extractionMethod?: string;
      insights?: Record<string, unknown>;
    };

    if (!body.fileName || !body.insights) {
      return NextResponse.json(
        { success: false, error: "Analyzer result is required." },
        { status: 400 },
      );
    }

    const history: MongoAnalyzerHistory = {
      _id: new ObjectId(),
      userId,
      fileName: body.fileName,
      targetRole: body.targetRole || undefined,
      extractedCharacters: body.extractedCharacters || 0,
      extractionMethod: body.extractionMethod || "embedded-text",
      insights: body.insights,
      createdAt: new Date(),
    } as MongoAnalyzerHistory;

    await (await getMongoCollection<MongoAnalyzerHistory>("analyzer_history")).insertOne(
      history,
    );

    return NextResponse.json({
      success: true,
      mode: "user",
      saved: true,
      history: toApiHistory(history),
    });
  } catch (error) {
    return jsonError(error, "Analyzer history could not be saved.");
  }
}
