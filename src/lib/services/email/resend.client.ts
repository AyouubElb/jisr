import "server-only";

import { Resend } from "resend";

// Returns null when RESEND_API_KEY is unset so callers no-op instead of
// throwing. EMAIL_FROM defaults to Resend's sandbox sender (delivers only to
// your own verified address); swap to a domain address to enable real delivery.
export function getResend(): { client: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from = process.env.EMAIL_FROM ?? "Jisr <onboarding@resend.dev>";
  return { client: new Resend(apiKey), from };
}
