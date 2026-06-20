import { NextResponse } from "next/server";
import { analyzeHotspots } from "../../../lib/openrouter";
import type { HotspotItem } from "../../../lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { items?: HotspotItem[] } | null;
  const items = Array.isArray(payload?.items) ? payload!.items : [];
  const analysis = await analyzeHotspots(items);

  return NextResponse.json({ analysis }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}