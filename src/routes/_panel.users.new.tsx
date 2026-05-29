import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, UserPlus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageStates } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { ROLE_OPTIONS } from "@/lib/mock/people";

export const Route = createFileRoute("/_panel/users/new")({
  head: () => ({ meta: [{ title: "New staff user — Mixlebs Admin" }] }),
  component: NewUser,
});

function genPassword() {
  return (
    "MX-" +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 4).toUpperCase() +
    "1!"
  );
}

const schema = z.object({
  first_name: z.string().min(1).max(150),
  last_name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: z.string().max(20).optional().or(z.literal("")),
  password: z.string().min(8),
  type: z.literal("STAFF"),
  roles: z.array(z.string()),
  send_setup_email: z.boolean(),
  send_invite: z.boolean(),
});
type Values = z.infer<typeof schema>;

function NewUser() {
  const t = useT();
  const navigate = useNavigate();
  const perms = usePermissions();
  const state = usePageState();
  const canCreate = perms.has("users.create_staff");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: genPassword(),
      type: "STAFF",
      roles: [],
      send_setup_email: true,
      send_invite: true,
    },
  });

  const roles = watch("roles");
  function toggleRole(r: string) {
    setValue("roles", roles.includes(r) ? roles.filter((x) => x !== r) : [...roles, r]);
  }
  function onSubmit() {
    toast.success(t("people.newUser.tCreated"));
    navigate({ to: "/users" });
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t("people.newUser.title")}
        description={t("people.newUser.desc")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/users">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("people.users.backToUsers")}
              </Link>
            </Button>
            {canCreate && (
              <Button
                form="new-user-form"
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <UserPlus className="me-1.5 h-4 w-4" /> {t("people.newUser.create")}
              </Button>
            )}
          </>
        }
      />

      <PageStates state={state} missingPerms={["users.create_staff"]}>
        <form
          id="new-user-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid gap-6 lg:grid-cols-3"
        >
          <Card className="border-0 bg-card p-6 shadow-soft lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-semibold">
              {t("people.newUser.account")}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <F label={t("people.newUser.firstName")} required error={errors.first_name?.message}>
                <Input placeholder="Lara" {...register("first_name")} />
              </F>
              <F label={t("people.newUser.lastName")} required error={errors.last_name?.message}>
                <Input placeholder="Khoury" {...register("last_name")} />
              </F>
              <F label={t("people.newUser.email")} required error={errors.email?.message}>
                <Input
                  type="email"
                  dir="ltr"
                  placeholder="lara@mixlebs.com"
                  {...register("email")}
                />
              </F>
              <F label={t("people.newUser.phone")} error={errors.phone?.message}>
                <Input
                  dir="ltr"
                  className="font-mono"
                  placeholder="+961 70 …"
                  {...register("phone")}
                />
              </F>
              <F
                label={t("people.newUser.password")}
                required
                error={errors.password?.message}
                className="md:col-span-2"
              >
                <div className="flex gap-2">
                  <Input dir="ltr" className="font-mono" {...register("password")} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setValue("password", genPassword(), { shouldValidate: true })}
                  >
                    <Wand2 className="me-1.5 h-4 w-4" /> {t("people.newUser.regenerate")}
                  </Button>
                </div>
              </F>
            </div>
            <div className="mt-6 space-y-3">
              <Toggle
                label={t("people.newUser.sendSetup")}
                desc={t("people.newUser.sendSetupDesc")}
                checked={watch("send_setup_email")}
                onChange={(v) => setValue("send_setup_email", v)}
              />
              <Toggle
                label={t("people.newUser.sendInvite")}
                desc={t("people.newUser.sendInviteDesc")}
                checked={watch("send_invite")}
                onChange={(v) => setValue("send_invite", v)}
              />
            </div>
          </Card>

          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-lg font-semibold">{t("people.newUser.roles")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{t("people.newUser.rolesHint")}</p>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
                >
                  <span className="text-sm font-medium">{r}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={roles.includes(r)}
                    onChange={() => toggleRole(r)}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-4">
              <p className="w-full text-xs text-muted-foreground">{t("people.newUser.typeTag")}</p>
              <Badge>STAFF</Badge>
            </div>
          </Card>
        </form>
      </PageStates>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function F({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
