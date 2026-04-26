import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createStudentSchema } from "@/lib/schemas/auth.schema";
import { randomBytes } from "node:crypto";

function generatePassword(): string {
  // Pool guarantees all character classes are represented.
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;

  // Pick one from each required class, then fill to 10 chars.
  const required = [
    upper[randomBytes(1)[0] % upper.length],
    lower[randomBytes(1)[0] % lower.length],
    digits[randomBytes(1)[0] % digits.length],
    symbols[randomBytes(1)[0] % symbols.length],
  ];
  const rest = Array.from({ length: 6 }, () => all[randomBytes(1)[0] % all.length]);
  const chars = [...required, ...rest];

  // Fisher-Yates shuffle so the required chars aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1) Verify the caller is an authenticated instructor.
  const serverSupabase = await createServerSupabase();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie." }, { status: 401 });

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("role, id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "instructor") {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  // 2) Validate body.
  const body = await request.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Donnees invalides." },
      { status: 400 }
    );
  }

  const { full_name, email, level, course_id } = parsed.data;
  const password = generatePassword();
  const admin = createAdminSupabase();

  // 3) Create auth user — email_confirm: true so no confirmation email.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !created.user) {
    const isDuplicate = createError?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "Un compte existe deja pour cette adresse e-mail."
          : "Impossible de creer le compte.",
      },
      { status: 400 }
    );
  }

  const studentId = created.user.id;

  // 4) Upsert profile + optional enrollment in one RPC (atomic).
  const { error: rpcError } = await admin.rpc("create_student_profile_and_enroll", {
    p_student_id: studentId,
    p_full_name: full_name,
    p_level: level ?? null,
    p_instructor_id: profile.id,
    p_course_id: course_id ?? null,
  });

  if (rpcError) {
    // Best-effort rollback of the auth user.
    await admin.auth.admin.deleteUser(studentId).catch(() => {});
    return NextResponse.json(
      { error: "Erreur lors de la creation du profil." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, password });
}
