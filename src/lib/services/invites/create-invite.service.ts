import "server-only";

import { randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/services/email/send";
import { instructorInviteEmail } from "@/lib/services/email/templates/transactional/instructor-invite";
import type { CreateInviteInput } from "@/lib/schemas/auth.schema";

interface CreateInviteArgs extends CreateInviteInput {
  // App origin (e.g. https://app.com), used to build the signup link. Passed in
  // because services stay free of Next.js request APIs like headers().
  origin: string;
}

// Generates a single-use invite, stores it, and fires the invite email
// (fire-and-forget — a failed send never blocks creation; the admin can still
// copy the link from the invites table).
export async function createInvite({
  email,
  full_name,
  kind,
  expires_in_days,
  origin,
}: CreateInviteArgs): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + expires_in_days * 24 * 60 * 60 * 1000
  ).toISOString();

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("invites").insert({
    token,
    email,
    full_name,
    kind,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  // TODO: move to a job queue if a JOB-QUEUE.md trigger is hit (bulk invites,
  // 50+ concurrent admins) — overkill for one email today.
  if (kind === "instructor") {
    const signupUrl = `${origin}/instructor/signup?token=${token}`;
    const { subject, html } = instructorInviteEmail({
      fullName: full_name,
      signupUrl,
      expiresInDays: expires_in_days,
    });
    void sendEmail({ to: email, subject, html });
  }
}
