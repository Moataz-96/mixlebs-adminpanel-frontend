import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Save, Phone, Mail, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useT } from "@/lib/i18n";
import { ACCOUNT_PROFILE } from "@/lib/mock/account";

export const Route = createFileRoute("/_panel/account")({
  head: () => ({ meta: [{ title: "Profile — Mixlebs Admin" }] }),
  component: AccountPage,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[1-9]\d{6,14}$/;

const schema = z.object({
  first_name: z.string().min(1, "Required").max(150),
  last_name: z.string().min(1, "Required").max(150),
  email: z.string().min(1, "Required").max(255).regex(EMAIL, "Enter a valid email"),
  phone: z
    .string()
    .min(1, "Required")
    .max(20)
    .refine((v) => PHONE.test(v.replace(/\s/g, "")), "Enter a valid phone"),
});
type Values = z.infer<typeof schema>;

function AccountPage() {
  const t = useT();
  const p = ACCOUNT_PROFILE;
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      phone: p.phone,
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  function onSubmit(_values: Values) {
    toast.success(t("account.saved"));
  }

  const typeLabel =
    p.type === "ADMIN"
      ? t("account.typeAdmin")
      : p.type === "STAFF"
        ? t("account.typeStaff")
        : t("account.typeStore");
  const initials = `${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="p-6">
      <PageHeader
        title={t("account.title")}
        description={t("account.subtitle")}
        actions={
          <Button
            type="submit"
            form="profile-form"
            disabled={isSubmitting}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Save className="me-1.5 h-4 w-4" /> {t("account.save")}
          </Button>
        }
      />

      <form id="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Card className="border-0 bg-card p-6 shadow-soft">
          {/* Avatar uploader */}
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-primary text-xl text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-lg font-semibold">
                {p.first_name} {p.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {typeLabel} · {t("account.fieldDateJoined")} {p.date_joined}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    setAvatarRemoved(false);
                    toast.success(t("account.saved"));
                  }}
                >
                  <Upload className="me-1 h-3.5 w-3.5" /> {t("account.changePhoto")}
                </Button>
                {!avatarRemoved && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-destructive"
                    onClick={() => setAvatarRemoved(true)}
                  >
                    <X className="me-1 h-3.5 w-3.5" /> {t("account.removePhoto")}
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{t("account.avatarHint")}</p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="first_name">{t("account.firstName")}</Label>
              <Input
                id="first_name"
                className="mt-1"
                aria-invalid={!!errors.first_name}
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name">{t("account.lastName")}</Label>
              <Input
                id="last_name"
                className="mt-1"
                aria-invalid={!!errors.last_name}
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="email">{t("account.email")}</Label>
                <ChangeEmailDialog />
              </div>
              <Input
                id="email"
                dir="ltr"
                inputMode="email"
                className="mt-1"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="phone">{t("account.phone")}</Label>
                <ChangePhoneDialog phone={form.getValues("phone")} />
              </div>
              <Input
                id="phone"
                dir="ltr"
                inputMode="tel"
                className="mt-1"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Read-only account facts */}
        <Card className="border-0 bg-card p-6 shadow-soft">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
            <User className="h-4 w-4" /> {t("account.readonly")}
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnly label={t("account.fieldId")} value={p.id} mono />
            <ReadOnly label={t("account.fieldUsername")} value={p.username} mono />
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {t("account.fieldType")}
              </dt>
              <dd className="mt-1">
                <Badge variant="outline">{typeLabel}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {t("account.fieldRegisterCompleted")}
              </dt>
              <dd className="mt-1">
                <Badge
                  variant="outline"
                  className={
                    p.register_completed ? "border-success/30 bg-success/10 text-success" : ""
                  }
                >
                  {p.register_completed ? t("account.yes") : t("account.no")}
                </Badge>
              </dd>
            </div>
            <ReadOnly label={t("account.fieldDateJoined")} value={p.date_joined} />
            <ReadOnly label={t("account.fieldLastLogin")} value={p.last_login} />
          </dl>
        </Card>
      </form>
    </div>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 truncate text-sm ${mono ? "font-mono text-xs" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function ChangeEmailDialog() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary">
          <Mail className="me-1 h-3 w-3" /> {t("account.changeEmail")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("account.changeEmail")}</DialogTitle>
          <DialogDescription>{t("account.changeEmailDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="new-email">{t("account.email")}</Label>
          <Input
            id="new-email"
            dir="ltr"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            disabled={!EMAIL.test(email)}
            onClick={() => {
              toast.success(t("account.emailVerifySent"));
              setOpen(false);
              setEmail("");
            }}
          >
            {t("account.changeEmail")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePhoneDialog({ phone }: { phone: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");

  function reset() {
    setStage("phone");
    setNewPhone("");
    setCode("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary">
          <Phone className="me-1 h-3 w-3" /> {t("account.changePhone")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {stage === "phone" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("account.changePhone")}</DialogTitle>
              <DialogDescription>{t("account.changePhoneDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-phone">{t("account.phone")}</Label>
              <Input
                id="new-phone"
                dir="ltr"
                inputMode="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                disabled={!PHONE.test(newPhone.replace(/\s/g, ""))}
                onClick={() => {
                  toast.success(t("account.otpSent"));
                  setStage("otp");
                }}
              >
                {t("account.otpResend")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("account.otpTitle")}</DialogTitle>
              <DialogDescription>
                {t("account.otpDesc", { phone: newPhone || phone })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-2" dir="ltr">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  toast.success(t("account.otpSent"));
                }}
              >
                {t("account.otpResend")}
              </Button>
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                disabled={code.length !== 6}
                onClick={() => {
                  toast.success(t("account.phoneVerified"));
                  setOpen(false);
                  reset();
                }}
              >
                {t("account.otpVerify")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
