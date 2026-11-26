"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getSupabaseAuthCookieName,
  shouldResetStoredSession,
} from "@/lib/supabase/session-recovery";

const RECOVERY_ATTEMPT_KEY = "tm_session_recovery_attempted";

function hasStoredAuthCookie(cookieName: string) {
  try {
    return document.cookie
      .split(";")
      .some(
        (part) =>
          part.trim().startsWith(`${cookieName}=`) ||
          part.trim().startsWith(`${cookieName}.`)
      );
  } catch {
    return false;
  }
}

function clearRecoveryAttempt() {
  try {
    sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY);
  } catch {}
}

function markRecoveryAttempt() {
  try {
    if (sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) === "1") return false;
    sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, "1");
    return true;
  } catch {
    // Without tab-scoped storage we cannot guarantee loop prevention, so leave
    // recovery to the explicit reset-session endpoint instead.
    return false;
  }
}

function recoverCurrentPath() {
  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(
    `/auth/reset-session?next=${encodeURIComponent(nextPath)}`
  );
}

export function SessionRecovery() {
  useEffect(() => {
    const authCookieName = getSupabaseAuthCookieName();
    if (!authCookieName || !hasStoredAuthCookie(authCookieName)) {
      clearRecoveryAttempt();
      return;
    }

    let active = true;
    const supabase = createClient();

    const recoverIfNeeded = async () => {
      try {
        const { error } = await supabase.auth.getUser();
        if (!active) return;

        if (!error) {
          clearRecoveryAttempt();
          return;
        }

        if (!shouldResetStoredSession(error) || !markRecoveryAttempt()) {
          return;
        }

        recoverCurrentPath();
      } catch (error) {
        if (
          !active ||
          !shouldResetStoredSession(error) ||
          !markRecoveryAttempt()
        ) {
          return;
        }

        recoverCurrentPath();
      }
    };

    void recoverIfNeeded();
    return () => {
      active = false;
    };
  }, []);

  return null;
}

