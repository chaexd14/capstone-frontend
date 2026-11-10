export function getSafeRedirectUrl(next: string | null, fallback: string): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  const origin = "https://talentmatch.invalid";
  try {
    const url = new URL(next, origin);
    if (url.origin === origin && !url.pathname.startsWith("//")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
