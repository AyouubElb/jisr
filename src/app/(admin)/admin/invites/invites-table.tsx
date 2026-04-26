"use client";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/types/database";
import { Copy } from "lucide-react";
import { toast } from "sonner";

type Invite = Database["public"]["Tables"]["invites"]["Row"];

interface InvitesTableProps {
  invites: Invite[];
  origin: string;
}

export function InvitesTable({
  invites,
  origin,
}: InvitesTableProps): React.JSX.Element {
  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune invitation pour l&apos;instant.
      </p>
    );
  }

  const inviteLink = (invite: Invite): string =>
    `${origin}/instructor/signup?token=${invite.token}`;

  const copyLink = async (invite: Invite): Promise<void> => {
    await navigator.clipboard.writeText(inviteLink(invite));
    toast.success("Lien copie dans le presse-papiers");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Invitations recentes</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Expire le</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => {
              const isConsumed = invite.consumed_at !== null;
              const isExpired = new Date(invite.expires_at) < new Date();
              const status = isConsumed
                ? "Utilisee"
                : isExpired
                  ? "Expiree"
                  : "Active";

              return (
                <tr key={invite.id} className="border-t border-border">
                  <td className="px-4 py-2">{invite.email}</td>
                  <td className="px-4 py-2">{invite.full_name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        isConsumed
                          ? "text-muted-foreground"
                          : isExpired
                            ? "text-destructive"
                            : "text-green-700"
                      }
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(invite.expires_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!isConsumed && !isExpired && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(invite)}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copier
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
