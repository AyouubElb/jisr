"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface CreateInviteDialogProps {
  action: (formData: FormData) => Promise<void>;
}

export function CreateInviteDialog({
  action,
}: CreateInviteDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    startTransition(async () => {
      try {
        await action(formData);
        toast.success("Invitation creee");
        form.reset();
        setOpen(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erreur inconnue";
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle invitation
        </Button>
      } />
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle invitation</DialogTitle>
          <DialogDescription>
            Generez un lien d&apos;invitation a envoyer par WhatsApp ou e-mail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="instructeur@exemple.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="Fatima Benali"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <select
                id="kind"
                name="kind"
                defaultValue="instructor"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="instructor">Instructeur</option>
                <option value="student" disabled>
                  Etudiant (Phase 4)
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_in_days">Expire dans (jours)</Label>
              <Input
                id="expires_in_days"
                name="expires_in_days"
                type="number"
                min={1}
                max={30}
                defaultValue={7}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creation..." : "Creer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
