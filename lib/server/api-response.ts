import { NextResponse } from "next/server";

import { MongoConfigError } from "@/lib/server/mongo";
import { ServerConfigError } from "@/lib/server/crypto";

export const jsonError = (error: unknown, fallback: string, status = 500) => {
  console.error(`${fallback}`, error);

  if (error instanceof MongoConfigError) {
    return NextResponse.json(
      {
        code: "MONGO_NOT_CONFIGURED",
        success: false,
        message:
          "Real Path Cloud accounts are not connected on this deployment. Add MONGODB_URI before creating accounts.",
        error:
          "Real Path Cloud accounts are not connected on this deployment. Add MONGODB_URI before creating accounts.",
      },
      { status: 503 },
    );
  }

  if (error instanceof ServerConfigError) {
    return NextResponse.json(
      {
        code: "AUTH_NOT_CONFIGURED",
        success: false,
        message:
          "Secure authentication is not connected on this deployment. You can continue with guest mode for now.",
        error:
          "Secure authentication is not connected on this deployment. You can continue with guest mode for now.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { success: false, message: fallback, error: fallback },
    { status },
  );
};
