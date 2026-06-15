import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

interface SignupPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function InstructorSignupPage({
  searchParams,
}: SignupPageProps): Promise<React.JSX.Element> {
  const t = await getTranslations("auth.instructorSignup");
  const { token, error } = await searchParams;

  if (!token) {
    return <InvalidInvite title={t("invalidTitle")} message={t("missingToken")} backLabel={t("backToLogin")} />;
  }

  const supabase = await createServerSupabase();
  const { data: rows, error: lookupError } = await supabase.rpc(
    "get_invite_by_token",
    { p_token: token },
  );

  const invite = rows?.[0];
  if (lookupError || !invite) {
    return (
      <InvalidInvite
        title={t("invalidTitle")}
        message={t("invalidInvite")}
        backLabel={t("backToLogin")}
      />
    );
  }

  if (invite.kind !== "instructor") {
    return (
      <InvalidInvite
        title={t("invalidTitle")}
        message={t("wrongInviteKind")}
        backLabel={t("backToLogin")}
      />
    );
  }

  const signupErrorMessages: Record<string, string> = {
    email_mismatch: t("errorEmailMismatch"),
    invite_invalid: t("errorInviteInvalid"),
    consume_failed: t("errorConsumeFailed"),
  };

  const errorMessage = error ? signupErrorMessages[error] : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          {t("welcomeTitle")}
        </h1>
        <p className="text-muted-foreground">{t("welcomeSubtitle")}</p>
      </div>

      <SignupForm
        token={token}
        email={invite.email}
        defaultFullName={invite.full_name ?? ""}
        initialError={errorMessage ?? null}
      />
    </div>
  );
}

function InvalidInvite({
  title,
  message,
  backLabel,
}: {
  title: string;
  message: string;
  backLabel: string;
}): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          {title}
        </h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
      >
        {backLabel}
      </Link>
    </div>
  );
}
