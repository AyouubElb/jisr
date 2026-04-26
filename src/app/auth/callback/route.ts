import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const errorRedirect = (origin: string, code: string, token?: string): NextResponse => {
  const url = new URL(`${origin}/login`);
  url.searchParams.set("error", code);
  // Preserve the invite token on error so the user can retry from the signup page
  // by clicking the original link again (still valid until consumed).
  if (token) url.searchParams.set("invite_token", token);
  return NextResponse.redirect(url);
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const inviteToken = searchParams.get("invite_token");

  if (oauthError) {
    return errorRedirect(origin, "oauth_cancelled", inviteToken ?? undefined);
  }

  if (!code) {
    return errorRedirect(origin, "missing_code");
  }

  const supabase = await createServerSupabase();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return errorRedirect(origin, "oauth_failed", inviteToken ?? undefined);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return errorRedirect(origin, "session_invalid", inviteToken ?? undefined);
  }

  // ─── Invite path (Phase 3) ─────────────────────────────────────────────────
  // If the OAuth flow was initiated from the instructor signup page, an
  // invite_token is carried through the `redirectTo` query string.
  if (inviteToken) {
    const { data: inviteRows, error: lookupError } = await supabase.rpc(
      "get_invite_by_token",
      { p_token: inviteToken }
    );

    const invite = inviteRows?.[0];
    if (lookupError || !invite) {
      // Signed in but no valid invite — sign them out and bounce.
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/instructor/signup?error=invite_invalid`);
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      await supabase.auth.signOut();
      const url = new URL(`${origin}/instructor/signup`);
      url.searchParams.set("token", inviteToken);
      url.searchParams.set("error", "email_mismatch");
      return NextResponse.redirect(url);
    }

    const { error: consumeError } = await supabase.rpc(
      "consume_invite_and_create_profile",
      {
        p_token: inviteToken,
        p_email: invite.email,
        p_user_id: user.id,
        p_full_name: invite.full_name ?? user.user_metadata?.full_name ?? user.email,
      }
    );
    if (consumeError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/instructor/signup?error=consume_failed`);
    }

    return NextResponse.redirect(`${origin}/instructor`);
  }

  // ─── Regular login path ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Phase 2 = sign-in only for existing accounts. No profile means no app account.
  if (!profile) {
    await supabase.auth.signOut();
    return errorRedirect(origin, "no_account");
  }

  const dashboard =
    profile.role === "admin"
      ? "/admin"
      : profile.role === "instructor"
        ? "/instructor"
        : "/student";

  return NextResponse.redirect(`${origin}${dashboard}`);
}
