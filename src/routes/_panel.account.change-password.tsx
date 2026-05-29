import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Save, Check, Minus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_panel/account/change-password")({
  head: () => ({ meta: [{ title: "Change password — Mixlebs Admin" }] }),
  component: ChangePasswordPage,
});

const schema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z
      .string()
      .min(8, "At least 8 characters")
      .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), "Mix upper and lowercase")
      .refine((v) => /\d/.test(v), "Add a number"),
    confirm_password: z.string().min(1, "Required"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "cpMismatch",
  });
type Values = z.infer<typeof schema>;

function ruleState(pw: string) {
  return {
    length: pw.length >= 8,
    case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

function ChangePasswordPage() {
  const t = useT();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const pw = watch("new_password");
  const rules = ruleState(pw);
  const score = Object.values(rules).filter(Boolean).length;
  const strengthLabel =
    score <= 1
      ? t("account.strengthWeak")
      : score <= 3
        ? t("account.strengthFair")
        : t("account.strengthStrong");
  const strengthColor =
    score <= 1 ? "text-destructive" : score <= 3 ? "text-warning" : "text-success";

  function onSubmit(_values: Values) {
    toast.success(t("account.cpSaved"));
    form.reset();
  }

  const ruleRows: { key: keyof typeof rules; label: string }[] = [
    { key: "length", label: t("account.ruleLength") },
    { key: "case", label: t("account.ruleCase") },
    { key: "digit", label: t("account.ruleDigit") },
    { key: "symbol", label: t("account.ruleSymbol") },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("account.cpTitle")} description={t("account.cpSubtitle")} />
      <Card className="max-w-xl border-0 bg-card p-6 shadow-soft">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="current_password">{t("account.currentPassword")}</Label>
            <Input
              id="current_password"
              type="password"
              dir="ltr"
              className="mt-1"
              autoComplete="current-password"
              aria-invalid={!!errors.current_password}
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="mt-1 text-xs text-destructive">{errors.current_password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="new_password">{t("account.newPassword")}</Label>
            <Input
              id="new_password"
              type="password"
              dir="ltr"
              className="mt-1"
              autoComplete="new-password"
              aria-invalid={!!errors.new_password}
              {...register("new_password")}
            />
            {errors.new_password && (
              <p className="mt-1 text-xs text-destructive">{errors.new_password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm_password">{t("account.confirmPassword")}</Label>
            <Input
              id="confirm_password"
              type="password"
              dir="ltr"
              className="mt-1"
              autoComplete="new-password"
              aria-invalid={!!errors.confirm_password}
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.confirm_password.message === "cpMismatch"
                  ? t("account.cpMismatch")
                  : errors.confirm_password.message}
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="mb-2 flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" /> {t("account.strength")}:{" "}
              <span className={cn("font-semibold", strengthColor)}>{strengthLabel}</span>
            </div>
            <ul className="space-y-1">
              {ruleRows.map((r) => (
                <li key={r.key} className="flex items-center gap-1.5">
                  {rules[r.key] ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground/50" />
                  )}
                  <span className={cn(rules[r.key] && "text-foreground")}>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Save className="me-1.5 h-4 w-4" /> {t("account.cpSubmit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
