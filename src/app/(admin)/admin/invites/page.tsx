import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/supabase/guards";
import { createServerSupabase } from "@/lib/supabase/server";
import { createInviteSchema } from "@/lib/schemas/auth.schema";
import { CreateInviteForm } from "./create-invite-form";
import { InvitesTable } from "./invites-table";

async function createInviteAction(formData: FormData): Promise<void> {
  "use server";

  await requireAdmin();

  const parsed = createInviteSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    kind: formData.get("kind"),
    expires_in_days: formData.get("expires_in_days"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Donnees invalides.");
  }

  const { email, full_name, kind, expires_in_days } = parsed.data;
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

  revalidatePath("/admin/invites");
}

export default async function AdminInvitesPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const supabase = await createServerSupabase();
  const { data: invites } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <p className="text-muted-foreground">
          Generez un lien d&apos;invitation a envoyer par WhatsApp ou e-mail.
        </p>
      </div>

      <CreateInviteForm action={createInviteAction} />

      <InvitesTable invites={invites ?? []} origin={origin} />
    </div>
  );
}
