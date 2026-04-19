export const authChangedEvent = "real-path:auth-changed";
export const authRefreshEvent = "real-path:auth-refresh";
export const authOpenEvent = "real-path:open-auth";
export const appResetEvent = "real-path:app-reset";

export const promptSeenKey = "real_path_cloud_prompt_seen";
export const analyzerHistoryKey = "real_path_guest_analyzer_history";
export const resumeDraftKey = "real_path_guest_resume_draft";
export const lastCloudResumeIdKey = "real_path_last_cloud_resume_id";
export const cloudRestoreKey = "real_path_resume_restore";
export const ayanshChatStorageKey = "real-path-ayansh-chat-v1";
export const ayanshOpenStorageKey = "real-path-ayansh-open-v1";

export const clearPersistedClientState = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.clear();
  } catch (error) {
    console.error("Client storage reset failed.", error);
  }

  try {
    window.sessionStorage.clear();
  } catch (error) {
    console.error("Session storage reset failed.", error);
  }
};

export const resetClientAppState = (reason = "unauthenticated") => {
  if (typeof window === "undefined") {
    return;
  }

  clearPersistedClientState();
  window.dispatchEvent(new CustomEvent(appResetEvent, { detail: { reason } }));
};

export const isAuthenticatedPayload = (
  payload: unknown,
): payload is {
  authenticated: true;
  mode: "user";
  user: { id: string; name: string; email: string };
} =>
  typeof payload === "object" &&
  payload !== null &&
  "authenticated" in payload &&
  "mode" in payload &&
  "user" in payload &&
  Boolean(
    (payload as { authenticated?: boolean }).authenticated &&
      (payload as { mode?: string }).mode === "user" &&
      (payload as { user?: unknown }).user,
  );
