import OpenAI, { toFile } from "openai";
import { ObjectId } from "mongodb";

import {
  getMongoCollection,
  type MongoPhoto,
  type MongoPhotoStudioHistory,
} from "@/lib/server/mongo";

export const PHOTO_STUDIO_MAX_BYTES = 10 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PhotoStudioErrorCode =
  | "INVALID_IMAGE"
  | "IMAGE_TOO_LARGE"
  | "OPENAI_NOT_CONFIGURED"
  | "PHOTO_GENERATION_FAILED";

export class PhotoStudioError extends Error {
  readonly code: PhotoStudioErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    status,
    retryable = false,
  }: {
    code: PhotoStudioErrorCode;
    message: string;
    status: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "PhotoStudioError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

type WorkingImage = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  backgroundRemoved: boolean;
};

export type PhotoStudioResult = {
  imageDataUrl: string;
  finalUrl: string;
  saved: boolean;
  photo: ReturnType<typeof toApiPhoto> | null;
  history: ReturnType<typeof toApiHistory> | null;
  warning?: string;
  stages: string[];
};

const safeName = (value: string) => {
  const cleaned = value.replace(/[^a-z0-9_.-]+/gi, "-").slice(0, 80);
  return cleaned || "profile-photo.png";
};

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

const toApiHistory = (history: MongoPhotoStudioHistory) => ({
  id: history._id.toString(),
  user_id: history.userId.toString(),
  photo_id: history.photoId?.toString() || null,
  original_url: `upload://${history.originalName}`,
  final_url: history.finalUrl,
  style: history.style,
  created_at: history.createdAt.toISOString(),
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const logPhotoStudioEvent = (
  event: string,
  metadata: Record<string, string | number | boolean | null | undefined>,
) => {
  const cleanMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
  console.info(`[real-path:photo-studio] ${event}`, cleanMetadata);
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs = 25_000,
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PhotoStudioError({
        code: "PHOTO_GENERATION_FAILED",
        message: "Photo service timed out. Please try again.",
        status: 504,
        retryable: true,
      });
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const withRetry = async <T>({
  label,
  operation,
}: {
  label: string;
  operation: (attempt: number) => Promise<T>;
}) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      logPhotoStudioEvent("provider.request", { label, attempt });
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof PhotoStudioError ? error.retryable : true;

      console.warn("[real-path:photo-studio] provider.failure", {
        label,
        attempt,
        retryable,
        reason: error instanceof Error ? error.message : "Unknown photo provider error",
      });

      if (!retryable || attempt === 2) {
        break;
      }

      await wait(800 * attempt);
    }
  }

  if (lastError instanceof PhotoStudioError) {
    throw lastError;
  }

  throw new PhotoStudioError({
    code: "PHOTO_GENERATION_FAILED",
    message: "Photo generation failed. Please try again.",
    status: 502,
    retryable: true,
  });
};

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new PhotoStudioError({
      code: "OPENAI_NOT_CONFIGURED",
      message:
        "AI Photo Studio is not connected on this deployment. A local resume-photo crop can still be prepared.",
      status: 503,
    });
  }

  return new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: 45_000,
  });
};

export const validatePhotoUpload = (file: File) => {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new PhotoStudioError({
      code: "INVALID_IMAGE",
      message: "Please upload a JPG, PNG, or WEBP image.",
      status: 400,
    });
  }

  if (file.size <= 0) {
    throw new PhotoStudioError({
      code: "INVALID_IMAGE",
      message: "The uploaded image is empty. Please choose another photo.",
      status: 400,
    });
  }

  if (file.size > PHOTO_STUDIO_MAX_BYTES) {
    throw new PhotoStudioError({
      code: "IMAGE_TOO_LARGE",
      message: "Please upload an image smaller than 10 MB.",
      status: 413,
    });
  }
};

const removeBackgroundIfConfigured = async (
  image: WorkingImage,
): Promise<{ image: WorkingImage; warning?: string }> => {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    logPhotoStudioEvent("background_removal.skipped", {
      reason: "REMOVE_BG_API_KEY_missing",
    });
    return { image };
  }

  try {
    return {
      image: await withRetry({
        label: "remove-bg",
        operation: async () => {
          const body = new FormData();
          body.append("image_file_b64", image.buffer.toString("base64"));
          body.append("size", "auto");
          body.append("format", "png");

          const response = await fetchWithTimeout("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
              "X-Api-Key": apiKey,
            },
            body,
          });

          logPhotoStudioEvent("background_removal.response", {
            status: response.status,
            ok: response.ok,
          });

          if (!response.ok) {
            const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
            throw new PhotoStudioError({
              code: "PHOTO_GENERATION_FAILED",
              message: `Background removal failed: ${detail}`,
              status: response.status >= 500 ? 502 : 400,
              retryable: response.status === 429 || response.status >= 500,
            });
          }

          const buffer = Buffer.from(await response.arrayBuffer());

          logPhotoStudioEvent("background_removal.success", {
            sizeBytes: buffer.byteLength,
          });

          return {
            buffer,
            contentType: "image/png",
            fileName: `${image.fileName.replace(/\.[^.]+$/, "")}-background-removed.png`,
            backgroundRemoved: true,
          };
        },
      }),
    };
  } catch (error) {
    console.warn("[real-path:photo-studio] background_removal.fallback", {
      reason: error instanceof Error ? error.message : "Unknown background removal failure",
    });
    return {
      image,
      warning:
        "Background removal service was unavailable, so OpenAI handled the cleanup directly.",
    };
  }
};

const createFormalPassportPhoto = async (client: OpenAI, image: WorkingImage) => {
  const response = await withRetry({
    label: "openai-image-edit",
    operation: async () =>
      client.images.edit({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
        image: await toFile(image.buffer, image.fileName, {
          type: image.contentType,
        }),
        prompt:
          "Create a formal passport-size resume profile photo from this image. Keep the same person and facial identity. Use a clean white or light gray professional background. Improve face clarity naturally. Crop to a centered 1:1 passport-style head-and-shoulders resume photo with balanced margins. Replace casual clothing with realistic formal business attire such as a blazer and shirt with optional tie. Return a polished realistic photo, not an illustration.",
        size: "1024x1024",
        quality: "high",
        background: "opaque",
        output_format: "png",
        input_fidelity: "high",
        n: 1,
      }),
  });

  const b64 = response.data?.[0]?.b64_json;

  if (!b64) {
    throw new PhotoStudioError({
      code: "PHOTO_GENERATION_FAILED",
      message: "Photo Studio did not return an image. Please try another photo.",
      status: 502,
      retryable: true,
    });
  }

  logPhotoStudioEvent("openai_image_edit.success", {
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
    backgroundRemovedBeforeEdit: image.backgroundRemoved,
  });

  return Buffer.from(b64, "base64");
};

const savePhotoStudioResult = async ({
  userId,
  fileName,
  fileType,
  originalBuffer,
  generatedBuffer,
  backgroundRemoved,
}: {
  userId: string;
  fileName: string;
  fileType: string;
  originalBuffer: Buffer;
  generatedBuffer: Buffer;
  backgroundRemoved: boolean;
}) => {
  void originalBuffer;
  void fileType;

  const userObjectId = new ObjectId(userId);
  const finalUrl = bufferToDataUrl(generatedBuffer, "image/png");
  const now = new Date();
  const photo: MongoPhoto = {
    _id: new ObjectId(),
    userId: userObjectId,
    fileName: safeName(fileName).replace(/\.[^.]+$/, "") + "-formal.png",
    contentType: "image/png",
    imageDataUrl: finalUrl,
    metadata: {
      source: "ai-photo-studio",
      output_format: "png",
      style: "formal_passport",
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      background_removed_before_edit: backgroundRemoved,
    },
    createdAt: now,
  };
  const history: MongoPhotoStudioHistory = {
    _id: new ObjectId(),
    userId: userObjectId,
    photoId: photo._id,
    originalName: safeName(fileName),
    finalUrl: `mongo://photos/${photo._id.toString()}`,
    style: "formal_passport",
    createdAt: now,
  };

  await Promise.all([
    (await getMongoCollection<MongoPhoto>("photos")).insertOne(photo),
    (await getMongoCollection<MongoPhotoStudioHistory>("photo_studio_history")).insertOne(
      history,
    ),
  ]);

  logPhotoStudioEvent("cloud_save.success", {
    userId,
    photoId: photo._id.toString(),
    historyId: history._id.toString(),
  });

  return { photo: toApiPhoto(photo), history: toApiHistory(history), finalUrl };
};

export const processFormalPassportPhoto = async ({
  file,
  userId,
}: {
  file: File;
  userId?: string;
}): Promise<PhotoStudioResult> => {
  validatePhotoUpload(file);
  const client = getOpenAIClient();

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const originalImage: WorkingImage = {
    buffer: originalBuffer,
    contentType: file.type,
    fileName: safeName(file.name || "profile-photo.png"),
    backgroundRemoved: false,
  };
  const stages = ["uploaded_original"];
  const warnings: string[] = [];

  logPhotoStudioEvent("upload.received", {
    mode: userId ? "user" : "guest",
    sizeBytes: file.size,
    type: file.type,
  });

  const backgroundResult = await removeBackgroundIfConfigured(originalImage);

  if (backgroundResult.warning) {
    warnings.push(backgroundResult.warning);
  }

  if (backgroundResult.image.backgroundRemoved) {
    stages.push("background_removed");
  } else {
    stages.push("background_removal_delegated_to_openai");
  }

  const generatedBuffer = await createFormalPassportPhoto(client, backgroundResult.image);
  stages.push("formal_passport_generated");

  let photo: ReturnType<typeof toApiPhoto> | null = null;
  let history: ReturnType<typeof toApiHistory> | null = null;
  let finalUrl: string | null = null;

  if (userId) {
    try {
      const saved = await savePhotoStudioResult({
        userId,
        fileName: file.name || "profile-photo.png",
        fileType: file.type,
        originalBuffer,
        generatedBuffer,
        backgroundRemoved: backgroundResult.image.backgroundRemoved,
      });

      photo = saved.photo;
      history = saved.history;
      finalUrl = saved.finalUrl;
      stages.push("cloud_saved");
    } catch (error) {
      console.warn("[real-path:photo-studio] cloud_save.failure", {
        reason: error instanceof Error ? error.message : "Unknown storage failure",
      });
      warnings.push(
        "Formal photo was created, but cloud save failed. Please try again after checking Real Path Cloud settings.",
      );
    }
  }

  const imageDataUrl = `data:image/png;base64,${generatedBuffer.toString("base64")}`;

  return {
    imageDataUrl,
    finalUrl: finalUrl || imageDataUrl,
    saved: Boolean(photo && history),
    photo,
    history,
    warning: warnings[0],
    stages,
  };
};
