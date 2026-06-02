import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/services/email/send";
import { quizCorrectedEmail } from "@/lib/services/email/templates/notification/quiz-corrected";
import type { CreateNotificationArgs, NotificationType } from "./types";

// Types that email the moment their row is created. Others are bell-only until
// moved to a digest/cron later — change here, nothing else.
const EMAIL_INLINE: Record<NotificationType, boolean> = {
  quiz_corrected: true,
};

// Writes one notification row (service-role: a user's action can notify another
// user). For email-inline types, sends the email and stamps emailed_at. The
// email is best-effort and never blocks the write.
export async function createNotification({
  userId,
  type,
  payload,
}: CreateNotificationArgs): Promise<void> {
  const { data: row, error } = await createAdminSupabase()
    .from("notifications")
    .insert({ user_id: userId, type, payload })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (!EMAIL_INLINE[type]) return;

  void deliverEmail(userId, type, payload, row.id as string);
}

async function deliverEmail(
  userId: string,
  type: NotificationType,
  payload: CreateNotificationArgs["payload"],
  notificationId: string,
): Promise<void> {
  // Recipient address lives on the auth user, not profiles.
  const { data: userRes } = await createAdminSupabase().auth.admin.getUserById(userId);
  const to = userRes.user?.email;
  if (!to) return;

  const rendered = renderEmail(type, payload);
  if (!rendered) return;

  const result = await sendEmail({ to, ...rendered });
  if (result.ok) {
    await createAdminSupabase()
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", notificationId);
  }
}

// App base URL for email links. Vercel injects the production host; fall back to
// localhost for dev. No scheme on the Vercel var, so add https.
function appBaseUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function renderEmail(
  type: NotificationType,
  payload: CreateNotificationArgs["payload"],
): { subject: string; html: string } | null {
  switch (type) {
    case "quiz_corrected": {
      const p = payload as CreateNotificationArgs<"quiz_corrected">["payload"];
      return quizCorrectedEmail({
        quizTitle: p.quiz_title,
        resultUrl: `${appBaseUrl()}/student/attempts/${p.attempt_id}`,
        score: p.score,
      });
    }
    default:
      return null;
  }
}
