// Instructor invite email. English (instructor-facing surfaces are English per
// CLAUDE.md) and brand-styled with inline CSS — email clients strip <style>
// blocks and don't support Tailwind, so brand hex values are inlined directly.
// Brand: amber #F59E0B, espresso heading #451A03, stone text on amber #1C1917.

interface InstructorInviteEmailArgs {
  fullName: string;
  signupUrl: string;
  expiresInDays: number;
}

export function instructorInviteEmail({
  fullName,
  signupUrl,
  expiresInDays,
}: InstructorInviteEmailArgs): { subject: string; html: string } {
  const subject = "You're invited to Jisr";

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#FAFAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#292524;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E7E5E4;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#F59E0B;letter-spacing:-0.02em;">Jisr</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;line-height:1.25;color:#451A03;letter-spacing:-0.02em;">You're invited, ${fullName}</h1>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#57534E;">
                  You've been invited to join <strong style="color:#292524;">Jisr</strong> — the online platform for English instructors. Create your account to start planning lessons, generating quizzes, and tracking your students.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background-color:#F59E0B;">
                      <a href="${signupUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#1C1917;text-decoration:none;border-radius:10px;">Create your account</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#A8A29E;">
                  This invitation expires in ${expiresInDays} day${expiresInDays === 1 ? "" : "s"}. If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin:8px 0 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${signupUrl}" target="_blank" style="color:#B45309;text-decoration:underline;">${signupUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <hr style="border:none;border-top:1px solid #E7E5E4;margin:0 0 16px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#A8A29E;">
                  You received this because someone invited you to Jisr. If you weren't expecting it, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
