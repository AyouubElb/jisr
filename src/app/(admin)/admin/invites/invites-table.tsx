"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataListCard } from "@/components/admin/data-list-card";
import { Copy, Mail } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import type { Database } from "@/lib/types/database";

type Invite = Database["public"]["Tables"]["invites"]["Row"];

interface InvitesTableProps {
  invites: Invite[];
  origin: string;
}

type InviteStatus = "active" | "consumed" | "expired";

function getStatus(invite: Invite): InviteStatus {
  if (invite.consumed_at !== null) return "consumed";
  if (new Date(invite.expires_at) < new Date()) return "expired";
  return "active";
}

const STATUS_LABELS: Record<InviteStatus, string> = {
  active: "Active",
  consumed: "Utilisee",
  expired: "Expiree",
};

const STATUS_VARIANTS: Record<
  InviteStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  consumed: "secondary",
  expired: "destructive",
};

function getInitials(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  return source
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function InvitesTable({
  invites,
  origin,
}: InvitesTableProps): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return invites;
    return invites.filter(
      (invite) =>
        invite.email.toLowerCase().includes(q) ||
        (invite.full_name?.toLowerCase().includes(q) ?? false),
    );
  }, [invites, search]);

  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const copyLink = async (invite: Invite): Promise<void> => {
    const link = `${origin}/instructor/signup?token=${invite.token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Lien copie dans le presse-papiers");
  };

  return (
    <DataListCard
      search={{
        value: search,
        onChange: (v) => {
          setSearch(v);
          setPage(0);
        },
        placeholder: "Rechercher par nom ou e-mail...",
      }}
      isEmpty={filtered.length === 0}
      emptyState={{
        icon: <Mail />,
        message: search
          ? "Aucune invitation trouvee"
          : "Aucune invitation pour l'instant",
      }}
      pagination={{
        page,
        pageSize,
        totalCount: filtered.length,
        onPageChange: setPage,
        onPageSizeChange: (size) => {
          setPageSize(size);
          setPage(0);
        },
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
    >
      {pageItems.map((invite) => (
        <InviteRow
          key={invite.id}
          invite={invite}
          onCopy={() => copyLink(invite)}
        />
      ))}
    </DataListCard>
  );
}

function InviteRow({
  invite,
  onCopy,
}: {
  invite: Invite;
  onCopy: () => void;
}): React.JSX.Element {
  const status = getStatus(invite);
  const initials = getInitials(invite.full_name, invite.email);
  const expiresIn = formatDistanceToNowStrict(new Date(invite.expires_at), {
    locale: fr,
    addSuffix: true,
  });

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {invite.full_name ?? invite.email}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {invite.full_name ? `${invite.email} · ` : ""}
          {status === "consumed" ? "Utilisee" : `Expire ${expiresIn}`}
        </p>
      </div>

      <Badge variant={STATUS_VARIANTS[status]} className="shrink-0">
        {STATUS_LABELS[status]}
      </Badge>

      {status === "active" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopy}
          className="shrink-0"
        >
          <Copy className="mr-1 h-3 w-3" />
          Copier
        </Button>
      )}
    </div>
  );
}
