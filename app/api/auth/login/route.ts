import { NextResponse } from "next/server";

import {
  readJsonObjectBody,
  type LoginInput,
  validateLoginInput,
} from "@/lib/server/auth-validation";
import { verifyPassword } from "@/lib/server/crypto";
import { jsonError } from "@/lib/server/api-response";
import {
  findMongoUserByEmail,
  touchMongoUserLogin,
} from "@/lib/server/mongo";
import { createUserSession, setSessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsedBody = await readJsonObjectBody<LoginInput>(request);

    if ("error" in parsedBody) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.error,
          error: parsedBody.error,
        },
        { status: 400 },
      );
    }

    const parsed = validateLoginInput(parsedBody.value);

    if ("error" in parsed) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error,
          error: parsed.error,
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.value;
    const user = await findMongoUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      console.warn("Login failed: invalid credentials.");
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials.",
          error: "Invalid credentials.",
        },
        { status: 401 },
      );
    }

    await touchMongoUserLogin(user._id);

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      mode: "user",
      message: "Login successful.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

    setSessionCookie(response, createUserSession(user._id.toString()));

    return response;
  } catch (error) {
    return jsonError(error, "Login failed.");
  }
}
