import { NextResponse } from "next/server";
import { getHotspotBundle } from "../../../lib/hotspots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const bundle = await getHotspotBundle();
  return NextResponse.json(bundle, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}