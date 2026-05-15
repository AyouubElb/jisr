import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:ai",
  analytics: true,
});

export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:signup",
  analytics: true,
});

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
};

export const enforceRateLimit = async (
  limiter: Ratelimit,
  identifier: string,
): Promise<NextResponse | null> => {
  const { success, reset } = await limiter.limit(identifier);
  if (success) return null;

  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Trop de requêtes, réessayez dans une minute." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
};
