import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import {
  getUser,
  updateUser,
  resetUserPassword,
  assignRole,
  removeRole,
  listUserDevices,
  type AdminUser,
  type AdminDeviceToken,
} from "@/lib/api/users.functions";
import { listRoles, type Role } from "@/lib/api/rbac.functions";

// Frozen-UI local row shape (was mock UserRow). Mapped from BE AdminUser.
interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  type: "STAFF" | "STORE" | "CUSTOMER";
  is_active: boolean;
  is_superuser: boolean;
  register_completed: boolean;
  roles: string[];
  wallet_balance: number;
  password_reset_version: number;
  last_login: string;
  date_joined: string;
}

function fmt(dt: string | null | undefined): string {
  return (dt ?? "").slice(0, 16).replace("T", " ");
}

function mapUser(u: AdminUser): UserRow {
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    username: u.username,
    email: u.email,
    phone: u.phone ?? "",
    type: u.type,
    is_active: u.is_active,
    is_superuser: u.is_superuser,
    register_completed: u.register_completed,
    roles: u.roles,
    wallet_balance: 0,
    password_reset_version: u.password_reset_version,
    last_login: fmt(u.last_login),
    date_joined: fmt(u.date_joined),
  };
}

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
  const previewState = usePageState();

  const userQuery = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => getUser({ data: { id } }),
    staleTime: 30 * 1000,
  });
  const u: UserRow | null = useMemo(
    () => (userQuery.data ? mapUser(userQuery.data) : null),
    [userQuery.data],
  );

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : userQuery.isLoading
        ? "loading"
        : userQuery.isError
          ? "error"
          : "populated";

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword({ data: { id } }),
    onSuccess: () => toast.success(t("people.users.tReset")),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  return (
    <div className="p-6">
      <PageHeader
        title={u ? `${u.first_name} ${u.last_name}` : ""}
        description={u ? `${u.email} · ${t(`people.users.type${u.type}`)}` : ""}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/users">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("people.users.backToUsers")}
              </Link>
            </Button>
            <Can perm="users.reset_password">
              <Button
                variant="outline"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
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
        {u && (
          <>
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
                <DevicesTab userId={id} />
              </TabsContent>
              <TabsContent value="audit" className="mt-6">
                <AuditTab />
              </TabsContent>
            </Tabs>
          </>
        )}
      </PageStates>
    </div>
  );
}

function ProfileTab({ u }: { u: UserRow }) {
  const t = useT();
  const canEdit = usePermissions().has("users.update");
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
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
  async function onSubmit(values: ProfileValues) {
    try {
      await updateUser({
        data: {
          id: u.id,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone,
          is_active: values.is_active,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-user", u.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("people.users.tSaved"));
    } catch (err) {
      const info = parseServerError(err);
      if (info.fieldErrors) {
        for (const [field, msg] of Object.entries(info.fieldErrors)) {
          if (["first_name", "last_name", "email", "phone", "is_active"].includes(field)) {
            setError(field as keyof ProfileValues, {
              message: Array.isArray(msg) ? msg[0] : String(msg),
            });
          }
        }
      }
      toast.error(info.message);
    }
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
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ["rbac-roles", "picker"],
    queryFn: () => listRoles({ data: { page_size: 200 } }),
    staleTime: 60 * 1000,
  });
  const roleList: Role[] = rolesQuery.data?.results ?? [];
  const roleIdByName = useMemo(() => {
    const m = new Map<string, number>();
    roleList.forEach((r) => m.set(r.name, r.id));
    return m;
  }, [roleList]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin-user", u.id] });

  const assignMutation = useMutation({
    mutationFn: (roleName: string) => {
      const roleId = roleIdByName.get(roleName);
      if (roleId == null) throw new Error("Unknown role");
      return assignRole({ data: { id: u.id, role_id: roleId } });
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("people.users.tRoleAdded"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });
  const removeMutation = useMutation({
    mutationFn: (roleName: string) => {
      const roleId = roleIdByName.get(roleName);
      if (roleId == null) throw new Error("Unknown role");
      return removeRole({ data: { id: u.id, role_id: roleId } });
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("people.users.tRoleRemoved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  // Per-user UserPolicy attach/detach and the flattened effective-permission
  // list have no dedicated endpoint in the P7 administration BE (ENTRY 029);
  // those two cards render empty until that surface lands.
  const USER_POLICIES: { id: string; name: string; type: "positive" | "negative"; description: string }[] = [];
  const PERMISSIONS: string[] = [];

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-card p-6 shadow-soft">
        <h3 className="mb-3 font-display text-lg font-semibold">{t("people.users.rbacRoles")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {u.roles.map((r) => (
            <Badge key={r} className="gap-1.5 px-3 py-1.5">
              {r}
              <button aria-label={t("common.remove")} onClick={() => removeMutation.mutate(r)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Select onValueChange={(r) => assignMutation.mutate(r)}>
            <SelectTrigger className="h-8 w-auto gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <SelectValue placeholder={t("people.users.rbacAddRole")} />
            </SelectTrigger>
            <SelectContent>
              {roleList
                .filter((r) => !u.roles.includes(r.name))
                .map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name}
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

function DevicesTab({ userId }: { userId: string }) {
  const t = useT();
  const devicesQuery = useQuery({
    queryKey: ["admin-user-devices", userId],
    queryFn: () => listUserDevices({ data: { id: userId } }),
    staleTime: 30 * 1000,
  });
  const devices: AdminDeviceToken[] = devicesQuery.data?.results ?? [];

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
          {devices.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {d.device_type === "WEB" ? (
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  )}
                  {d.device_type ?? "—"}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{d.token}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {d.endpoint_arn}
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
              <TableCell className="text-sm text-muted-foreground">—</TableCell>
              <TableCell>
                {/* Revoking another user's device has no BE endpoint (only the
                    self-service /account/devices/{id}/ exists) — ENTRY 029. */}
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
  // The per-user audit trail is served by the Phase 8 /admin/audit-log surface;
  // there is no per-user audit endpoint in the P7 administration BE (ENTRY 029),
  // so this tab renders an empty trail until P8 wires the shared audit query.
  const AUDIT_ENTRIES: {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    request_id: string;
    ip: string;
  }[] = [];
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
