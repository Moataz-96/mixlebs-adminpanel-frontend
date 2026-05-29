import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, LogOut, Shield, Smartphone, Monitor, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageStates } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import {
  PEOPLE_USERS,
  ROLE_OPTIONS,
  USER_POLICIES,
  DEVICE_TOKENS,
  AUDIT_ENTRIES,
  type UserRow,
} from "@/lib/mock/people";
import { PERMISSIONS } from "@/lib/mock-data";

export const Route = createFileRoute("/_panel/users/$id")({
  head: () => ({ meta: [{ title: "User — Mixlebs Admin" }] }),
  component: UserDetail,
});

const profileSchema = z.object({
  first_name: z.string().min(1).max(150),
  last_name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: z.string().min(1).max(20),
  is_active: z.boolean(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function UserDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const perms = usePermissions();
  const state = usePageState();
  const u = PEOPLE_USERS.find((x) => x.id === id) ?? PEOPLE_USERS[0];

  return (
    <div className="p-6">
      <PageHeader
        title={`${u.first_name} ${u.last_name}`}
        description={`${u.email} · ${t(`people.users.type${u.type}`)}`}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/users">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("people.users.backToUsers")}
              </Link>
            </Button>
            <Can perm="users.reset_password">
              <Button variant="outline" onClick={() => toast.success(t("people.users.tReset"))}>
                <KeyRound className="me-1.5 h-4 w-4" /> {t("people.users.sendReset")}
              </Button>
            </Can>
            {perms.role === "admin" && (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => toast.success(t("people.users.tForceLogout"))}
              >
                <LogOut className="me-1.5 h-4 w-4" /> {t("people.users.forceLogout")}
              </Button>
            )}
          </>
        }
      />

      <PageStates state={state} missingPerms={["users.view"]}>
        <Card className="border-0 bg-gradient-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-primary text-lg font-bold text-primary-foreground">
                {u.first_name[0]}
                {u.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold">
                  {u.first_name} {u.last_name}
                </h2>
                <Badge>{t(`people.users.type${u.type}`)}</Badge>
                {u.is_superuser && (
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    <Shield className="me-1 h-3 w-3" /> {t("people.users.colSuperuser")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                {u.email} · {u.phone}
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profile">{t("people.users.tabProfile")}</TabsTrigger>
            {perms.role === "admin" && (
              <TabsTrigger value="rbac">{t("people.users.tabRbac")}</TabsTrigger>
            )}
            <TabsTrigger value="devices">{t("people.users.tabDevices")}</TabsTrigger>
            <TabsTrigger value="audit">{t("people.users.tabAudit")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab u={u} />
          </TabsContent>
          {perms.role === "admin" && (
            <TabsContent value="rbac" className="mt-6">
              <RbacTab u={u} />
            </TabsContent>
          )}
          <TabsContent value="devices" className="mt-6">
            <DevicesTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-6">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </PageStates>
    </div>
  );
}

function ProfileTab({ u }: { u: UserRow }) {
  const t = useT();
  const canEdit = usePermissions().has("users.update");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone,
      is_active: u.is_active,
    },
  });
  function onSubmit() {
    toast.success(t("people.users.tSaved"));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form className="lg:col-span-2" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="grid gap-4 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
          <F label={t("people.users.pFirstName")} error={errors.first_name?.message}>
            <Input disabled={!canEdit} {...register("first_name")} />
          </F>
          <F label={t("people.users.pLastName")} error={errors.last_name?.message}>
            <Input disabled={!canEdit} {...register("last_name")} />
          </F>
          <F label={t("people.users.pEmail")} error={errors.email?.message}>
            <Input type="email" dir="ltr" disabled={!canEdit} {...register("email")} />
          </F>
          <F label={t("people.users.pPhone")} error={errors.phone?.message}>
            <Input dir="ltr" className="font-mono" disabled={!canEdit} {...register("phone")} />
          </F>
          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <span className="text-sm font-medium">{t("people.users.statusActive")}</span>
            <Switch
              checked={watch("is_active")}
              disabled={!canEdit}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
          </div>
          {canEdit && (
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {t("people.users.saveProfile")}
              </Button>
            </div>
          )}
        </Card>
      </form>

      <Card className="border-0 bg-card p-6 shadow-soft">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("people.users.tabProfile")}
        </h3>
        <dl className="space-y-2.5 text-sm">
          <ReadRow label={t("people.users.pId")} value={u.id} mono />
          <ReadRow label={t("people.users.pUsername")} value={u.username} mono />
          <ReadRow
            label={t("people.users.pWallet")}
            value={`$${u.wallet_balance.toFixed(2)}`}
            mono
          />
          <ReadRow label={t("people.users.pType")} value={t(`people.users.type${u.type}`)} />
          <ReadRow
            label={t("people.users.pRegister")}
            value={u.register_completed ? t("common.yes") : t("common.no")}
          />
          <ReadRow
            label={t("people.users.pResetVersion")}
            value={String(u.password_reset_version)}
            mono
          />
          <ReadRow label={t("people.users.pJoined")} value={u.date_joined} />
          <ReadRow label={t("people.users.pLastLogin")} value={u.last_login} />
        </dl>
      </Card>
    </div>
  );
}

function ReadRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-sm"}>{value}</dd>
    </div>
  );
}

function RbacTab({ u }: { u: UserRow }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <Card className="border-0 bg-card p-6 shadow-soft">
        <h3 className="mb-3 font-display text-lg font-semibold">{t("people.users.rbacRoles")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {u.roles.map((r) => (
            <Badge key={r} className="gap-1.5 px-3 py-1.5">
              {r}
              <button
                aria-label={t("common.remove")}
                onClick={() => toast.success(t("people.users.tRoleRemoved"))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Select onValueChange={() => toast.success(t("people.users.tRoleAdded"))}>
            <SelectTrigger className="h-8 w-auto gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <SelectValue placeholder={t("people.users.rbacAddRole")} />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.filter((r) => !u.roles.includes(r)).map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-0 bg-card p-6 shadow-soft">
        <h3 className="mb-3 font-display text-lg font-semibold">
          {t("people.users.rbacPolicies")}
        </h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>{t("people.users.rbacPolicyName")}</TableHead>
              <TableHead>{t("people.users.rbacPolicyType")}</TableHead>
              <TableHead>{t("people.users.rbacPolicyDesc")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {USER_POLICIES.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      p.type === "positive"
                        ? "border-success/40 text-success"
                        : "border-destructive/40 text-destructive"
                    }
                  >
                    {t(`people.users.rbac${p.type === "positive" ? "Positive" : "Negative"}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.description}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => toast.success(t("people.users.tPolicyRemoved"))}
                  >
                    {t("common.remove")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button size="sm" variant="outline" className="mt-4">
          <Plus className="me-1 h-3.5 w-3.5" /> {t("people.users.rbacAddPolicy")}
        </Button>
      </Card>

      <Card className="border-0 bg-card p-6 shadow-soft">
        <h3 className="mb-3 font-display text-lg font-semibold">
          {t("people.users.rbacEffective")}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {PERMISSIONS.map((p) => (
            <Badge key={p} variant="outline" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DevicesTab() {
  const t = useT();
  return (
    <Card className="overflow-hidden border-0 shadow-soft">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>{t("people.users.devDevice")}</TableHead>
            <TableHead>{t("people.users.devToken")}</TableHead>
            <TableHead>{t("people.users.devEndpoint")}</TableHead>
            <TableHead>{t("people.users.devValid")}</TableHead>
            <TableHead>{t("people.users.devCreated")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEVICE_TOKENS.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {d.device_type === "WEB" ? (
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  )}
                  {d.device_type}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {d.token.slice(0, 4)}…{d.token.slice(-4)}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                …{d.endpoint_arn.slice(-12)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    d.is_valid
                      ? "border-success/40 text-success"
                      : "border-muted text-muted-foreground"
                  }
                >
                  {t(d.is_valid ? "people.users.devValidBadge" : "people.users.devInvalidBadge")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{d.created_at}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => toast.success(t("people.users.tRevoked"))}
                >
                  {t("people.users.devRevoke")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function AuditTab() {
  const t = useT();
  return (
    <Card className="overflow-hidden border-0 shadow-soft">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>{t("people.users.auTimestamp")}</TableHead>
            <TableHead>{t("people.users.auMethod")}</TableHead>
            <TableHead>{t("people.users.auUrl")}</TableHead>
            <TableHead>{t("people.users.auStatus")}</TableHead>
            <TableHead>{t("people.users.auRequestId")}</TableHead>
            <TableHead>{t("people.users.auIp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {AUDIT_ENTRIES.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-xs text-muted-foreground">{e.timestamp}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {e.method}
                </Badge>
              </TableCell>
              <TableCell>
                <code className="text-xs">{e.url}</code>
              </TableCell>
              <TableCell>
                <span
                  className={`font-mono text-xs ${e.status < 400 ? "text-success" : "text-destructive"}`}
                >
                  {e.status}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {e.request_id}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground" dir="ltr">
                {e.ip}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function F({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
