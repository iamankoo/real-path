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
  type MongoPhoto,
} from "@/lib/server/mongo";

export const runtime = "nodejs";

const safeName = (value: string) => value.replace(/[^a-z0-9_.-]+/gi, "-").slice(0, 80);
const maxPhotoBytes = 8 * 1024 * 1024;
const supportedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const bufferToDataUrl = (buffer: Buffer, contentType: string) =>
  `data:${contentType};base64,${buffer.toString("base64")}`;

const toApiPhoto = (photo: MongoPhoto) => ({
  id: photo._id.toString(),
  user_id: photo.userId.toString(),
  storage_path: `mongo://photos/${photo._id.toString()}`,
  generated_storage_path: photo.generatedImageDataUrl
    ? `mongo://photos/${photo._id.toString()}/generated`
    : null,
  url: photo.generatedImageDataUrl || photo.imageDataUrl,
  metadata: photo.metadata,
  created_at: photo.createdAt.toISOString(),
});

export async function GET() {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return applySessionCleanup(
        NextResponse.json({ success: true, mode: "guest", photos: [] }),
        auth,
      );
    }

    const userId = auth.userId;

    const photos = await (await getMongoCollection<MongoPhoto>("photos"))
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      mode: "user",
      photos: photos.map(toApiPhoto),
    });
  } catch (error) {
    return jsonError(error, "Saved photos could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCloudUserId();

    if ("guest" in auth) {
      return guestNoop("Guest mode active. Log in to save photos.", auth);
    }

    const userId = auth.userId;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Photo file is required." },
        { status: 400 },
      );
    }

    if (!supportedPhotoTypes.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Please upload a JPG, PNG, or WEBP image." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > maxPhotoBytes) {
      return NextResponse.json(
        { success: false, error: "Please upload an image between 1 byte and 8 MB." },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const photo: MongoPhoto = {
      _id: new ObjectId(),
      userId,
      fileName: safeName(file.name || "photo.png"),
      contentType: file.type,
      imageDataUrl: bufferToDataUrl(buffer, file.type),
      metadata: { source: "upload" },
      createdAt: new Date(),
    };

    await (await getMongoCollection<MongoPhoto>("photos")).insertOne(photo);

    return NextResponse.json({
      success: true,
      mode: "user",
      saved: true,
      photo: toApiPhoto(photo),
    });
  } catch (error) {
    return jsonError(error, "Photo could not be stored.");
  }
}
