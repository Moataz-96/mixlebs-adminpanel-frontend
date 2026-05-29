import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password/$key")({
  head: () => ({ meta: [{ title: "Reset password — Mixlebs Admin" }] }),
  component: ResetPassword,
});

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    password_confirm: z.string().min(1, "Required"),
  })
  .refine((v) => v.password === v.password_confirm, {
    path: ["password_confirm"],
    message: "passwordsMismatch",
  });
type Values = z.infer<typeof schema>;

function ResetPassword() {
  const t = useT();
  const navigate = useNavigate();
  const { key } = Route.useParams();
  // Demo: trigger the 410 / token_expired view when the key is "expired".
  const expired = key === "expired";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", password_confirm: "" },
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const pw = watch("password");

  function onSubmit(_values: Values) {
    // POST /api/admin/v1/auth/reset_password/<key>/ — wired later.
    void _values;
    toast.success(t("auth.resetDoneToast"));
    navigate({ to: "/login" });
  }

  if (expired) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-surface p-6">
        <Card className="w-full max-w-md border-0 bg-card p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold">{t("auth.linkExpiredTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.linkExpiredDesc")}</p>
          <Button
            asChild
            className="mt-6 w-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Link to="/forgot-password">{t("auth.requestNewLink")}</Link>
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-surface p-6">
      <Card className="w-full max-w-md border-0 bg-card p-8 shadow-soft">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-center font-display text-2xl font-bold">{t("auth.resetTitle")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("auth.resetDesc")}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("auth.newPassword")}
            </Label>
            <Input
              dir="ltr"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("auth.confirmPassword")}
            </Label>
            <Input
              dir="ltr"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.password_confirm}
              {...register("password_confirm")}
            />
            {errors.password_confirm && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password_confirm.message === "passwordsMismatch"
                  ? t("auth.passwordsMismatch")
                  : errors.password_confirm.message}
              </p>
            )}
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Check
                className={`h-3 w-3 ${pw.length >= 8 ? "text-success" : "text-muted-foreground/40"}`}
              />{" "}
              {t("auth.reqMinChars")}
            </li>
            <li className="flex items-center gap-1.5">
              <Check
                className={`h-3 w-3 ${/\d/.test(pw) ? "text-success" : "text-muted-foreground/40"}`}
              />{" "}
              {t("auth.reqNumber")}
            </li>
            <li className="flex items-center gap-1.5">
              <Check
                className={`h-3 w-3 ${/[^A-Za-z0-9]/.test(pw) ? "text-success" : "text-muted-foreground/40"}`}
              />{" "}
              {t("auth.reqSymbol")}
            </li>
          </ul>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {t("auth.resetPassword")}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("auth.rememberedIt")}{" "}
          <Link to="/login" className="text-primary hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
