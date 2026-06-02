// Quiz-corrected email. French (student-facing surface per CLAUDE.md), brand
// inline CSS (clients strip Tailwind). Brand: amber #F59E0B, espresso #451A03,
// stone-on-amber #1C1917.

interface QuizCorrectedEmailArgs {
  quizTitle: string;
  resultUrl: string;
  score: number | null;
}

export function quizCorrectedEmail({
  quizTitle,
  resultUrl,
  score,
}: QuizCorrectedEmailArgs): { subject: string; html: string } {
  const subject = "Votre quiz a été corrigé";
  const scoreLine =
    score === null
      ? ""
      : `<p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#57534E;">Votre note : <strong style="color:#292524;">${score}%</strong></p>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
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
                <h1 style="margin:0 0 12px 0;font-size:24px;font-weight:700;line-height:1.25;color:#451A03;letter-spacing:-0.02em;">Votre quiz a été corrigé</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#57534E;">
                  Votre professeur a corrigé <strong style="color:#292524;">${quizTitle}</strong>. Vous pouvez maintenant consulter votre note et les commentaires.
                </p>
                ${scoreLine}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background-color:#F59E0B;">
                      <a href="${resultUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#1C1917;text-decoration:none;border-radius:10px;">Voir mon résultat</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <hr style="border:none;border-top:1px solid #E7E5E4;margin:0 0 16px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#A8A29E;">
                  Vous recevez cet e-mail car vous êtes inscrit(e) à un cours sur Jisr.
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
