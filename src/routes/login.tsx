import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Languages, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Mixlebs Admin" }] }),
  component: LoginPage,
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
  password: z.string().min(8, "At least 8 characters"),
  remember_me: z.boolean(),
});
type Values = z.infer<typeof schema>;

function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const { signIn, theme, setTheme, locale, setLocale } = useApp();
  const [reveal, setReveal] = useState(false);
  const [tab, setTab] = useState<"email" | "phone">("email");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "", remember_me: false },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  function onSubmit(values: Values) {
    // Demo auth: map a couple of error_type envelopes so the wiring engineer
    // can see the surface; everything else signs in.
    const id = values.identifier.toLowerCase();
    if (id.startsWith("customer") || id.includes("+customer")) {
      toast.error(t("auth.errCustomer"));
      return;
    }
    if (values.password === "inactive") {
      toast.error(t("auth.errInactive"));
      return;
    }
    if (values.password === "wrong") {
      form.setError("password", { message: t("auth.errInvalid") });
      return;
    }
    signIn();
    toast.success(t("auth.signedIn"));
    const next = new URLSearchParams(window.location.search).get("next");
    navigate({ to: next && next.startsWith("/") ? (next as never) : "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-primary lg:block">
        <div className="absolute inset-0 grain" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/0.18),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <span className="font-display text-xl font-bold">M</span>
            </div>
            <div>
              <p className="font-display text-lg font-bold">Mixlebs</p>
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Admin Panel</p>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="max-w-md font-display text-5xl font-bold leading-[1.05] tracking-tight">
              {t("auth.brandTagline")}
            </h1>
            <p className="max-w-sm text-base opacity-80">{t("auth.brandSub")}</p>
            <div className="flex items-center gap-3 text-xs opacity-80">
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono uppercase tracking-wider">
                EN · AR · RTL
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono uppercase tracking-wider">
                SSO ready
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono uppercase tracking-wider">
                2FA
              </span>
            </div>
          </div>
          <p className="text-xs opacity-60">© 2026 Mixlebs SAL · admin.mixlebs.com</p>
        </div>
      </div>

      <div className="relative flex items-center justify-center p-8">
        <div className="absolute end-6 top-6 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            aria-label={t("nav.topbar.toggleLanguage")}
          >
            <Languages className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("nav.topbar.toggleTheme")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <form className="w-full max-w-sm space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t("auth.welcomeBack")}
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">
              {t("auth.signInTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.signInHint")}</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="email">{t("auth.tabEmail")}</TabsTrigger>
              <TabsTrigger value="phone">{t("auth.tabPhone")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="identifier">{t("auth.identifier")}</Label>
            <Input
              id="identifier"
              dir="ltr"
              inputMode={tab === "phone" ? "tel" : "email"}
              placeholder={
                tab === "phone" ? t("auth.phonePlaceholder") : t("auth.identifierPlaceholder")
              }
              aria-invalid={!!errors.identifier}
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-xs text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <a
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("auth.forgot")}
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                dir="ltr"
                type={reveal ? "text" : "password"}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={reveal ? "Hide password" : "Show password"}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="remember" onCheckedChange={(v) => form.setValue("remember_me", !!v)} />
            <Label htmlFor="remember" className="text-sm font-normal">
              {t("auth.remember")}
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
          >
            {t("auth.signIn")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.newStore")}{" "}
            <a href="/register" className="font-semibold text-primary hover:underline">
              {t("auth.apply")}
            </a>
          </p>
          <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            {t("auth.customerNote")}
          </p>
        </form>
      </div>
    </div>
  );
}
