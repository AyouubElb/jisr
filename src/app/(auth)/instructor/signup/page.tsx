import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

interface SignupPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  email_mismatch:
    "L'adresse Google utilisee ne correspond pas a celle de votre invitation.",
  invite_invalid: "Cette invitation est invalide ou a deja ete utilisee.",
  consume_failed:
    "Une erreur est survenue lors de la finalisation de votre compte. Veuillez reessayer.",
};

export default async function InstructorSignupPage({
  searchParams,
}: SignupPageProps): Promise<React.JSX.Element> {
  const { token, error } = await searchParams;

  if (!token) {
    return <InvalidInvite message="Lien d'invitation manquant." />;
  }

  // Anon-callable lookup: returns rows only if invite is unconsumed and unexpired.
  const supabase = await createServerSupabase();
  const { data: rows, error: lookupError } = await supabase.rpc(
    "get_invite_by_token",
    { p_token: token }
  );

  const invite = rows?.[0];
  if (lookupError || !invite) {
    return (
      <InvalidInvite message="Cette invitation est invalide, expiree ou deja utilisee. Contactez la personne qui vous l'a envoyee." />
    );
  }

  if (invite.kind !== "instructor") {
    return (
      <InvalidInvite message="Ce lien n'est pas une invitation instructeur." />
    );
  }

  const errorMessage = error ? SIGNUP_ERROR_MESSAGES[error] : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          Bienvenue
        </h1>
        <p className="text-muted-foreground">
          Creez votre compte instructeur pour commencer.
        </p>
      </div>

      <SignupForm
        token={token}
        email={invite.email}
        defaultFullName={invite.full_name ?? ""}
        initialError={errorMessage}
      />
    </div>
  );
}

function InvalidInvite({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-amber-950">
          Invitation invalide
        </h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
      >
        Retour a la connexion
      </Link>
    </div>
  );
}
