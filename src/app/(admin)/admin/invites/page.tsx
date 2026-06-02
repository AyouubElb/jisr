import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/guards";
import { createServerSupabase } from "@/lib/supabase/server";
import { createInviteSchema } from "@/lib/schemas/auth.schema";
import { createInvite } from "@/lib/services/invites/create-invite.service";
import { CreateInviteDialog } from "./create-invite-dialog";
import { InvitesTable } from "./invites-table";

// App origin from request headers (proxy-aware) — links work on localhost and
// behind Vercel without a hardcoded base URL.
async function getOrigin(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

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

  await createInvite({ ...parsed.data, origin: await getOrigin() });

  revalidatePath("/admin/invites");
}

export default async function AdminInvitesPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const supabase = await createServerSupabase();
  const { data: invites } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

  const origin = await getOrigin();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invitations</h1>
          <p className="text-muted-foreground">
            Generez un lien d&apos;invitation a envoyer par WhatsApp ou e-mail.
          </p>
        </div>
        <CreateInviteDialog action={createInviteAction} />
      </div>

      <InvitesTable invites={invites ?? []} origin={origin} />
    </div>
  );
}
