"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  onConfirm,
  isPending = false,
  variant = "destructive",
}: ConfirmDialogProps): React.JSX.Element {
  const isDestructive = variant === "destructive";
  const Icon = isDestructive ? AlertTriangle : HelpCircle;
  const iconBg = isDestructive ? "bg-destructive/10" : "bg-primary/10";
  const iconColor = isDestructive ? "text-destructive" : "text-primary";
  const finalConfirmLabel =
    confirmLabel ?? (isDestructive ? "Supprimer" : "Confirmer");
  const pendingLabel = isDestructive ? "Suppression..." : "...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="space-y-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isPending}
          >
            {isPending ? pendingLabel : finalConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
