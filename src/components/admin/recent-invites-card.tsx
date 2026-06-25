"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminRecentInvites } from "@/lib/hooks/useAdmin";
import { Mail, Plus } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

function inviteStatus(
  consumedAt: string | null,
  expiresAt: string,
): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (consumedAt) return { label: "Utilisee", variant: "secondary" };
  if (new Date(expiresAt) < new Date()) return { label: "Expiree", variant: "destructive" };
  return { label: "Active", variant: "default" };
}

export function RecentInvitesCard(): React.JSX.Element {
  const { data: invites, isLoading } = useAdminRecentInvites();

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Invitations recentes</CardTitle>
            <CardDescription>Les 5 dernieres invitations crees</CardDescription>
          </div>
          <Link href="/admin/invites">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nouvelle invitation
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !invites?.length ? (
          <EmptyState icon={Mail} label="Aucune invitation pour le moment" />
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => {
              const status = inviteStatus(invite.consumed_at, invite.expires_at);
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {invite.full_name ?? invite.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{invite.email}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(invite.created_at), {
                        locale: fr,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <Link
              href="/admin/invites"
              className="block pt-2 text-center text-sm text-primary hover:underline"
            >
              Voir toutes les invitations
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
