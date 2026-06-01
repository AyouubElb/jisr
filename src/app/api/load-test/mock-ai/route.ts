import { NextResponse } from "next/server";

// Same cap as the real AI routes (literal required by Next segment config).
export const maxDuration = 60;

// Mock AI endpoint for Tier 2 load testing ONLY. Holds a serverless function
// open for a random 15-30s — like a real AI generation — but calls no LLM, so
// it costs nothing. Measures how many concurrent long requests Vercel sustains.
//
// Hard-gated: returns 404 unless ENABLE_LOAD_TEST_ROUTE=true. Never set that
// flag in production. No auth check — keep it off prod entirely, not behind a
// login that load tests would have to bypass.

const MIN_DELAY_MS = 15_000;
const MAX_DELAY_MS = 30_000;

export async function POST(): Promise<Response> {
  if (process.env.ENABLE_LOAD_TEST_ROUTE !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  // Random hold in [15s, 30s] — the real spread of AI generation times.
  const delayMs =
    MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return NextResponse.json({ ok: true, heldMs: delayMs });
}
