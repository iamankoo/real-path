import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { clearSessionCookie, getCurrentUserSession } from "@/lib/server/session";

type CloudAuthState =
  | {
      guest: true;
      clearSession: boolean;
    }
  | {
      userId: ObjectId;
      clearSession: false;
    };

export const getCloudUserId = async (): Promise<CloudAuthState> => {
  const auth = await getCurrentUserSession();

  if (!auth.user) {
    return { guest: true, clearSession: auth.shouldClearCookie };
  }

  return { userId: auth.user._id, clearSession: false };
};

export const applySessionCleanup = <T extends NextResponse>(
  response: T,
  auth: { clearSession: boolean },
) => {
  if (auth.clearSession) {
    clearSessionCookie(response);
  }

  return response;
};

export const guestNoop = (
  message = "Guest mode active. Log in to save to Real Path Cloud.",
  auth?: { clearSession: boolean },
) => {
  const response = NextResponse.json({
    success: true,
    mode: "guest",
    saved: false,
    message,
  });

  return auth ? applySessionCleanup(response, auth) : response;
};
