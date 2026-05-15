/**
 * Quick rate-limit smoke test against a running dev server.
 *
 * Usage:
 *   npm run dev                          # in another terminal
 *   npx tsx scripts/test-rate-limit.ts   # this script
 *
 * Hits /api/auth/instructor-signup 12 times. Limit is 5/min per IP, so
 * expect ~5 × 400 (invalid invite token) + ~7 × 429 (rate limited).
 *
 * The signup route is used because it doesn't require auth, so anyone can
 * run the script without setting up a JWT. The token "test-bogus" is
 * intentionally invalid — we are testing the limiter, not signup logic.
 */

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/auth/instructor-signup`;
const REQUEST_COUNT = 12;

interface Result {
  i: number;
  status: number;
  body: string;
}

async function hit(i: number): Promise<Result> {
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
  return { i, status: res.status, body: text.slice(0, 80) };
}

async function main(): Promise<void> {
  console.log(`Hitting ${ENDPOINT} ${REQUEST_COUNT} times in parallel...\n`);
  const results = await Promise.all(
    Array.from({ length: REQUEST_COUNT }, (_, i) => hit(i + 1)),
  );

  console.table(results);

  const counts = results.reduce<Record<number, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nStatus summary:", counts);
  console.log(
    counts[429]
      ? `✅ Rate limiter is working — ${counts[429]} requests blocked with 429.`
      : "❌ No 429 responses — rate limiter did NOT trigger. Check Upstash env vars.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
