const NON_RECOVERABLE_AUTH_ERRORS = new Set([
  "AuthRetryableFetchError",
  "AuthRefreshDiscardedError",
]);

type AuthErrorShape = {
  name?: unknown;
  status?: unknown;
  code?: unknown;
};

export function shouldResetStoredSession(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const { name, status, code } = error as AuthErrorShape;
  if (typeof name === "string" && NON_RECOVERABLE_AUTH_ERRORS.has(name)) {
    return false;
  }

  if (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "bad_jwt"
  ) {
    return true;
  }

  if (
    name === "AuthSessionMissingError" ||
    name === "AuthInvalidJwtError" ||
    name === "AuthInvalidTokenResponseError"
  ) {
    return true;
  }

  return status === 400 || status === 401 || status === 403;
}

export function getSupabaseAuthCookieName() {
  try {
    const projectReference = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    ).hostname.split(".")[0];
    return projectReference ? `sb-${projectReference}-auth-token` : null;
  } catch {
    return null;
  }
}

