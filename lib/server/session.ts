import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { signValue } from "@/lib/server/crypto";
import { findMongoUserById, type MongoUser } from "@/lib/server/mongo";

export type AuthSession =
  | {
      role: "user";
      sub: string;
      exp: number;
    }
  | {
      role: "guest";
      sub: "guest";
      exp: number;
    };

export type SessionValidationReason =
  | "missing"
  | "invalid-token"
  | "expired"
  | "guest-session"
  | "user-not-found"
  | "valid";

export type SessionValidationResult = {
  session: AuthSession | null;
  reason: SessionValidationReason;
  shouldClearCookie: boolean;
};

export type CurrentUserSessionResult = {
  session: Extract<AuthSession, { role: "user" }> | null;
  user: MongoUser | null;
  reason: SessionValidationReason;
  shouldClearCookie: boolean;
};

const encode = (value: AuthSession) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const decode = (value: string) =>
  JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as AuthSession;

const signaturesMatch = (expected: string, received: string) => {
  const expectedBuffer = Buffer.from(expected, "base64url");
  const receivedBuffer = Buffer.from(received, "base64url");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

export const createSessionToken = (session: AuthSession) => {
  const payload = encode(session);
  return `${payload}.${signValue(payload)}`;
};

export const getSessionValidationResult = (
  token?: string | null,
): SessionValidationResult => {
  if (!token) {
    return {
      session: null,
      reason: "missing",
      shouldClearCookie: false,
    };
  }

  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature || !signaturesMatch(signValue(payload), signature)) {
      console.warn("Session validation failed: invalid token signature.");
      return {
        session: null,
        reason: "invalid-token",
        shouldClearCookie: true,
      };
    }

    const session = decode(payload);

    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
      console.warn("Session validation failed: session expired.");
      return {
        session: null,
        reason: "expired",
        shouldClearCookie: true,
      };
    }

    return {
      session,
      reason: "valid",
      shouldClearCookie: false,
    };
  } catch (error) {
    console.error("Session validation failed: token parsing error.", error);
    return {
      session: null,
      reason: "invalid-token",
      shouldClearCookie: true,
    };
  }
};

export const verifySessionToken = (token?: string | null) =>
  getSessionValidationResult(token).session;

export const getCurrentSessionValidation = async () => {
  const cookieStore = await cookies();
  return getSessionValidationResult(cookieStore.get(SESSION_COOKIE_NAME)?.value);
};

export const getCurrentSession = async () => {
  return (await getCurrentSessionValidation()).session;
};

export const getCurrentUserSession = async (): Promise<CurrentUserSessionResult> => {
  const validation = await getCurrentSessionValidation();

  if (!validation.session) {
    return {
      session: null,
      user: null,
      reason: validation.reason,
      shouldClearCookie: validation.shouldClearCookie,
    };
  }

  if (validation.session.role !== "user") {
    console.warn("Session validation failed: guest session cannot access user state.");
    return {
      session: null,
      user: null,
      reason: "guest-session",
      shouldClearCookie: true,
    };
  }

  const user = await findMongoUserById(validation.session.sub);

  if (!user) {
    console.warn("Session validation failed: session user was not found.");
    return {
      session: null,
      user: null,
      reason: "user-not-found",
      shouldClearCookie: true,
    };
  }

  return {
    session: validation.session,
    user,
    reason: "valid",
    shouldClearCookie: false,
  };
};

export const setSessionCookie = (response: NextResponse, session: AuthSession) => {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(0, session.exp - Math.floor(Date.now() / 1000)),
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
};

export const createUserSession = (userId: string): AuthSession => ({
  role: "user",
  sub: userId,
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
});

export const createGuestSession = (): AuthSession => ({
  role: "guest",
  sub: "guest",
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
});
