import { NextResponse } from "next/server";

import {
  readJsonObjectBody,
  type SignupInput,
  validateSignupInput,
} from "@/lib/server/auth-validation";
import { hashPassword } from "@/lib/server/crypto";
import { jsonError } from "@/lib/server/api-response";
import {
  createMongoUser,
  findMongoUserByEmail,
  isMongoDuplicateKeyError,
} from "@/lib/server/mongo";
import { createUserSession, setSessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function handleSignup(request: Request) {
  try {
    const parsedBody = await readJsonObjectBody<SignupInput>(request);

    if ("error" in parsedBody) {
      return NextResponse.json(
        { success: false, message: parsedBody.error, error: parsedBody.error },
        { status: 400 },
      );
    }

    const parsed = validateSignupInput(parsedBody.value);

    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, message: parsed.error, error: parsed.error },
        { status: 400 },
      );
    }

    const input = parsed.value;
    const existingUser = await findMongoUserByEmail(input.email);

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists.",
          error: "User already exists.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await createMongoUser({
      name: input.name,
      email: input.email,
      passwordHash,
    }).catch((error: unknown) => {
      if (isMongoDuplicateKeyError(error)) {
        return null;
      }

      throw error;
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists.",
          error: "User already exists.",
        },
        { status: 409 },
      );
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      mode: "user",
      message: "Signup successful.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

    setSessionCookie(response, createUserSession(user._id.toString()));

    return response;
  } catch (error) {
    return jsonError(error, "Signup failed.");
  }
}

export async function POST(request: Request) {
  return handleSignup(request);
}
