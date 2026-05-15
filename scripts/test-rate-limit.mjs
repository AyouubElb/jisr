/**
 * Rate-limit smoke test against a running dev server.
 *
 * Usage:
 *   npm run dev                              # in another terminal
 *   node scripts/test-rate-limit.mjs         # this script
 *
 * Sends 8 requests sequentially (parallel kills Next.js dev server with OOM
 * because Turbopack compiles the route on each first hit). Limit is 5/min
 * per IP, so expect first ~5 to return 400 (invalid invite token, expected),
 * then ~3 to return 429.
 *
 * If you've recently tested, the sliding window may still be active —
 * wait 60 seconds between runs for clean results.
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const ENDPOINT = `${BASE_URL}/api/auth/instructor-signup`;
const REQUEST_COUNT = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hit(i) {
  const start = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "test-bogus-token",
      password: "TestPassword123!",
      full_name: "Test User",
    }),
  });
  const text = await res.text();
  return {
    i,
    status: res.status,
    ms: Date.now() - start,
    body: text.slice(0, 60),
  };
}

async function main() {
  console.log(`Hitting ${ENDPOINT} ${REQUEST_COUNT} times sequentially...\n`);
  const results = [];
  for (let i = 1; i <= REQUEST_COUNT; i++) {
    const r = await hit(i);
    console.log(`#${i}: ${r.status} (${r.ms}ms) ${r.body}`);
    results.push(r);
    await sleep(150);
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nStatus summary:", counts);
  if (counts[429]) {
    console.log(
      `Rate limiter is working — ${counts[429]} requests blocked with 429.`,
    );
  } else if (counts[400]) {
    console.log(
      "All requests returned 400 (invalid invite). Limiter did NOT trigger — check Upstash env vars or wait 60s and retry.",
    );
  } else {
    console.log("Unexpected statuses — inspect output above.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
