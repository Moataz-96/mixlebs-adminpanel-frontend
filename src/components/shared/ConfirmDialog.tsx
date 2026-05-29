import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** When set, the confirm button stays disabled until the user types this string. */
  typeToConfirm?: string;
}

/**
 * Reusable destructive/irreversible-action confirmation. Pass `typeToConfirm`
 * (e.g. the entity name) to require typed confirmation for delete actions.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
  typeToConfirm,
}: ConfirmDialogProps) {
  const t = useT();
  const [value, setValue] = useState("");
  const locked = !!typeToConfirm && value.trim() !== typeToConfirm;

  return (
    <AlertDialog onOpenChange={() => setValue("")}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t("confirm.title")}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          {destructive && !description && (
            <AlertDialogDescription>{t("confirm.destructiveHint")}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {typeToConfirm && (
          <div className="space-y-2">
            <Label htmlFor="confirm-input" className="text-sm font-normal text-muted-foreground">
              {t("confirm.typeToConfirm", { name: typeToConfirm })}
            </Label>
            <Input
              id="confirm-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              className="font-mono"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={locked}
            onClick={onConfirm}
            className={cn(
              destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {confirmLabel ?? t("common.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
