import {
  MongoClient,
  ObjectId,
  type Collection,
  type Document,
  type MongoServerError,
} from "mongodb";

import type { ResumeData, ResumeInsights, ResumeTemplate } from "@/lib/resume";

console.log("FINAL URI USED:", process.env.MONGODB_URI);


export class MongoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MongoConfigError";
  }
}

export type MongoUser = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MongoAnalyzerHistory = {
  _id: ObjectId;
  userId: ObjectId;
  fileName: string;
  targetRole?: string;
  extractedCharacters: number;
  extractionMethod: string;
  insights: ResumeInsights & Record<string, unknown>;
  createdAt: Date;
};

export type MongoResume = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  template: ResumeTemplate;
  data: ResumeData;
  pdfExportId?: ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MongoResumeVersion = {
  _id: ObjectId;
  userId: ObjectId;
  resumeId?: ObjectId;
  version: number;
  data: unknown;
  createdAt: Date;
};

export type MongoPhoto = {
  _id: ObjectId;
  userId: ObjectId;
  fileName: string;
  contentType: string;
  imageDataUrl: string;
  generatedImageDataUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type MongoPhotoStudioHistory = {
  _id: ObjectId;
  userId: ObjectId;
  photoId?: ObjectId;
  originalName: string;
  finalUrl: string;
  style: "formal_passport";
  createdAt: Date;
};

export type MongoPdfExport = {
  _id: ObjectId;
  userId: ObjectId;
  resumeId?: ObjectId;
  fileName: string;
  contentType: string;
  pdfDataUrl: string;
  template: ResumeTemplate | string;
  resumeData: unknown;
  createdAt: Date;
};

declare global {
  var realPathMongoClientPromise: Promise<MongoClient> | undefined;
  var realPathMongoIndexPromise: Promise<void> | undefined;
}

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.REAL_PATH_MONGODB_URI;

  if (!uri) {
    throw new MongoConfigError(
      "MONGODB_URI must be configured to use Real Path Cloud accounts.",
    );
  }

  return uri;
};

const getMongoDbName = () =>
  process.env.MONGODB_DB || process.env.REAL_PATH_MONGODB_DB || "real_path";

const getMongoClient = () => {
  if (!global.realPathMongoClientPromise) {
    global.realPathMongoClientPromise = new MongoClient(getMongoUri()).connect();
  }

  return global.realPathMongoClientPromise;
};

export const getMongoDb = async () => {
  const client = await getMongoClient();
  return client.db(getMongoDbName());
};

export const ensureMongoIndexes = async () => {
  if (global.realPathMongoIndexPromise) {
    return global.realPathMongoIndexPromise;
  }

  global.realPathMongoIndexPromise = (async () => {
    const db = await getMongoDb();

    await Promise.all([
      db.collection<MongoUser>("users").createIndex({ email: 1 }, { unique: true }),
      db
        .collection<MongoResume>("resumes")
        .createIndex({ userId: 1, updatedAt: -1 }),
      db
        .collection<MongoResumeVersion>("resume_versions")
        .createIndex({ userId: 1, resumeId: 1, version: 1 }),
      db
        .collection<MongoAnalyzerHistory>("analyzer_history")
        .createIndex({ userId: 1, createdAt: -1 }),
      db
        .collection<MongoPhoto>("photos")
        .createIndex({ userId: 1, createdAt: -1 }),
      db
        .collection<MongoPhotoStudioHistory>("photo_studio_history")
        .createIndex({ userId: 1, createdAt: -1 }),
      db
        .collection<MongoPdfExport>("pdf_exports")
        .createIndex({ userId: 1, createdAt: -1 }),
    ]);
  })();

  return global.realPathMongoIndexPromise;
};

export const getMongoCollection = async <T extends Document>(name: string) => {
  await ensureMongoIndexes();
  const db = await getMongoDb();
  return db.collection<T>(name) as Collection<T>;
};

export const toObjectId = (value: string) => {
  if (!ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
};

export const findMongoUserByEmail = async (email: string) => {
  const users = await getMongoCollection<MongoUser>("users");
  return users.findOne({ email: email.toLowerCase() });
};

export const findMongoUserById = async (id: string) => {
  const objectId = toObjectId(id);

  if (!objectId) {
    return null;
  }

  const users = await getMongoCollection<MongoUser>("users");
  return users.findOne({ _id: objectId });
};

export const createMongoUser = async ({
  name,
  email,
  passwordHash,
}: {
  name: string;
  email: string;
  passwordHash: string;
}) => {
  const users = await getMongoCollection<MongoUser>("users");
  const now = new Date();
  const document = {
    _id: new ObjectId(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(document);

  return document;
};

export const touchMongoUserLogin = async (id: ObjectId) => {
  const users = await getMongoCollection<MongoUser>("users");
  const now = new Date();

  await users.updateOne(
    { _id: id },
    {
      $set: {
        lastLoginAt: now,
        updatedAt: now,
      },
    },
  );
};

export const isMongoDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as MongoServerError).code === 11000;

export const objectIdFromString = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return toObjectId(value);
};
