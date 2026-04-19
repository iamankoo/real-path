import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    authenticated: false,
    mode: "guest",
    message: "Logged out successfully.",
    user: null,
  });
  clearSessionCookie(response);
  return response;
}
