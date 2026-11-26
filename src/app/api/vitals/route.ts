import { NextResponse } from "next/server";

const METRICS = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.name !== "string" ||
      !METRICS.has(body.name) ||
      typeof body.value !== "number" ||
      !Number.isFinite(body.value)
    ) {
      return NextResponse.json({ detail: "Invalid metric" }, { status: 400 });
    }
    const event = {
      event: "web_vital",
      name: body.name,
      value: Math.round(body.value * 100) / 100,
      rating: typeof body.rating === "string" ? body.rating.slice(0, 20) : "unknown",
      route: typeof body.route === "string" && body.route.startsWith("/")
        ? body.route.slice(0, 120)
        : "/",
      device: body.device === "mobile" ? "mobile" : "desktop",
    };
    console.info(JSON.stringify(event));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ detail: "Invalid metric" }, { status: 400 });
  }
}
