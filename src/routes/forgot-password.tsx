import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { forgotPassword } from "@/lib/api/auth.functions";
import { parseServerError, fieldMessage } from "@/lib/api/error";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Mixlebs Admin" }] }),
  component: ForgotPassword,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[1-9]\d{6,14}$/;

const schema = z.object({
  identifier: z
    .string()
    .min(1, "Required")
    .max(255)
    .refine(
      (v) => EMAIL.test(v) || PHONE.test(v.replace(/\s/g, "")),
      "Enter a valid email or phone",
    ),
});
type Values = z.infer<typeof schema>;

function ForgotPassword() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "" },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: Values) {
    // POST /api/admin/v1/auth/forgot_password/ — the BE response is always
    // neutral (never reveals whether the account exists), so we show the
    // neutral confirmation regardless of outcome. A validation error (e.g.
    // malformed identifier) is surfaced on the field.
    try {
      await forgotPassword({ data: values });
      setSent(true);
    } catch (err) {
      const { fieldErrors } = parseServerError(err);
      const idMsg = fieldMessage(fieldErrors, "identifier");
      if (idMsg) {
        form.setError("identifier", { message: idMsg });
        return;
      }
      // Stay neutral on any other error.
      setSent(true);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      {sent ? (
        <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("auth.forgotNeutral")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.forgotNeutralHint")}</p>
          <p className="mt-5 text-center text-sm">
            <a href="/login" className="text-primary hover:underline">
              {t("auth.backToLogin")}
            </a>
          </p>
        </div>
      ) : (
        <form
          className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-elevated"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("auth.forgotTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.forgotDesc")}</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="identifier">{t("auth.forgotIdentifier")}</Label>
            <Input
              id="identifier"
              dir="ltr"
              placeholder="you@mixlebs.com"
              aria-invalid={!!errors.identifier}
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-xs text-destructive">{errors.identifier.message}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {t("auth.sendResetLink")}
          </Button>
          <p className="mt-4 text-center text-sm">
            <a href="/login" className="text-primary hover:underline">
              {t("auth.backToLogin")}
            </a>
          </p>
        </form>
      )}
    </div>
  );
}
