import { NextResponse } from "next/server";

import { jsonError } from "@/lib/server/api-response";
import { clearSessionCookie, getCurrentUserSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await getCurrentUserSession();

    if (!auth.user) {
      const response = NextResponse.json({
        success: true,
        authenticated: false,
        mode: "guest",
        user: null,
      });

      if (auth.shouldClearCookie) {
        clearSessionCookie(response);
      }

      return response;
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      mode: "user",
      user: {
        id: auth.user._id.toString(),
        name: auth.user.name,
        email: auth.user.email,
        createdAt: auth.user.createdAt.toISOString(),
        updatedAt: auth.user.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error, "Session could not be loaded.");
  }
}
