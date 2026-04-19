import { NextResponse } from "next/server";

import {
  applySessionCleanup,
  getCloudUserId,
} from "@/lib/server/cloud-auth";
import { jsonError } from "@/lib/server/api-response";
import {
  PhotoStudioError,
  processFormalPassportPhoto,
} from "@/lib/server/photo-studio";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await getCloudUserId();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Upload a photo first." },
        { status: 400 },
      );
    }

    const result = await processFormalPassportPhoto({
      file,
      userId: "userId" in auth ? auth.userId.toString() : undefined,
    });

    return applySessionCleanup(
      NextResponse.json({
        success: true,
        mode: "userId" in auth ? "user" : "guest",
        ...result,
      }),
      auth,
    );
  } catch (error) {
    if (error instanceof PhotoStudioError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }

    return jsonError(error, "AI Photo Studio failed.");
  }
}
