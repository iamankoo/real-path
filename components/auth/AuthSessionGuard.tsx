"use client";

import { useEffect } from "react";

import {
  authChangedEvent,
  authRefreshEvent,
  isAuthenticatedPayload,
  resetClientAppState,
} from "@/lib/client/auth-state";

export default function AuthSessionGuard({
  initialAuthenticated,
}: {
  initialAuthenticated: boolean;
}) {
  useEffect(() => {
    let cancelled = false;

    const validateSession = async (reason: string) => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = await response.json().catch(() => null);

        if (!cancelled && !isAuthenticatedPayload(payload)) {
          resetClientAppState(reason);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Auth session refresh failed.", error);
        }
      }
    };

    const handleFocus = () => {
      void validateSession("window-focus");
    };

    const handleAuthRefresh = () => {
      void validateSession("auth-refresh");
    };

    const handleAuthChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;

      if (detail?.authenticated === false) {
        resetClientAppState("auth-changed");
      }
    };

    if (!initialAuthenticated) {
      resetClientAppState("initial-load");
    }

    void validateSession("initial-validation");

    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);
    window.addEventListener(authRefreshEvent, handleAuthRefresh);
    window.addEventListener(authChangedEvent, handleAuthChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
      window.removeEventListener(authRefreshEvent, handleAuthRefresh);
      window.removeEventListener(authChangedEvent, handleAuthChanged);
    };
  }, [initialAuthenticated]);

  return null;
}
