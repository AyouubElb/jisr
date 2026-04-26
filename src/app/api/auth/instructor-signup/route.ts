import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { instructorSignupSchema } from "@/lib/schemas/auth.schema";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = instructorSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }

  const { token, password, full_name } = parsed.data;
  const admin = createAdminSupabase();

  // 1) Validate the invite (anon-callable RPC works fine on the admin client too).
  const { data: rows, error: lookupError } = await admin.rpc(
    "get_invite_by_token",
    { p_token: token }
  );
  const invite = rows?.[0];
  if (lookupError || !invite) {
    return NextResponse.json(
      { error: "Cette invitation est invalide, expiree ou deja utilisee." },
      { status: 400 }
    );
  }
  if (invite.kind !== "instructor") {
    return NextResponse.json(
      { error: "Ce lien n'est pas une invitation instructeur." },
      { status: 400 }
    );
  }

  // 2) Create the auth user. email_confirm: true skips the confirmation email
  //    because the invite link itself is the verification gate.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !created.user) {
    const isDuplicate = createError?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "Un compte existe deja pour cette adresse. Veuillez vous connecter."
          : "Impossible de creer le compte.",
      },
      { status: 400 }
    );
  }

  // 3) Atomic consume + profile activation. If this fails, roll back the auth user.
  const { error: consumeError } = await admin.rpc(
    "consume_invite_and_create_profile",
    {
      p_token: token,
      p_email: invite.email,
      p_user_id: created.user.id,
      p_full_name: full_name,
    }
  );

  if (consumeError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {
      // Best-effort cleanup. If this fails the orphan auth user can be removed
      // from the Supabase dashboard; the invite stays unconsumed for retry.
    });
    return NextResponse.json(
      { error: "Erreur lors de la finalisation du compte." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
