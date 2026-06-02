import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getResend } from "./resend.client";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

type SendResult = { ok: true } | { ok: false; reason: "unconfigured" | "error" };

// Sends one email. Never throws — returns a result and logs failures to Sentry
// so a silent fire-and-forget failure still reaches the alert inbox.
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { ok: false, reason: "unconfigured" };

  try {
    const { error } = await resend.client.emails.send({
      from: resend.from,
      to,
      subject,
      html,
    });
    if (error) {
      Sentry.captureException(error, { tags: { feature: "email" } });
      return { ok: false, reason: "error" };
    }
    return { ok: true };
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "email" } });
    return { ok: false, reason: "error" };
  }
}
