import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Users, ShieldCheck, KeyRound, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getRole,
  updateRole,
  listRolePolicies,
  updateRolePolicy,
  listPermissions,
  listPermissionResources,
  attachUserRole,
  detachUserRole,
} from "@/lib/api/rbac.functions";
import { parseServerError, fieldMessage } from "@/lib/api/error";

// Members picker options need user display names/emails, which Phase 2 does not
// expose (no admin users-list endpoint until Phase 7). Until then the picker is
// seeded from the role's own member ids; see required_adminpanel_change.md.
const MEMBER_OPTION_FALLBACK: { id: string; name: string; email: string }[] = [];

export const Route = createFileRoute("/_panel/admin/roles/$id/edit")({
  head: () => ({ meta: [{ title: "Edit role — Mixlebs Admin" }] }),
  component: EditRolePage,
});

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500),
  is_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function EditRolePage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const roleId = Number(id);

  const roleQuery = useQuery({
    queryKey: ["rbac", "role", id],
    queryFn: () => getRole({ data: { id: roleId } }),
  });
  const policiesQuery = useQuery({
    queryKey: ["rbac", "role-policies"],
    queryFn: () => listRolePolicies({ data: { page_size: 200 } }),
  });
  const permissionsQuery = useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: () => listPermissions({ data: { page_size: 500 } }),
  });
  const resourcesQuery = useQuery({
    queryKey: ["rbac", "permission-resources"],
    queryFn: () => listPermissionResources({ data: { page_size: 500 } }),
  });

  const data = roleQuery.data;

  // Members are the role's user ids. The display picker lacks a user lookup in
  // Phase 2 (see required_adminpanel_change.md); chips fall back to the raw id.
  const [members, setMembers] = useState<string[]>([]);
  const [policies, setPolicies] = useState<string[]>([]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", is_enabled: true },
  });

  // Hydrate local form + pickers once the role + policies arrive.
  const policyRows = policiesQuery.data?.results ?? [];
  useEffect(() => {
    if (!data) return;
    form.reset({
      name: data.name,
      description: data.description ?? "",
      is_enabled: data.is_enabled,
    });
    setMembers((data.users ?? []).map(String));
    setPolicies(
      policyRows.filter((p) => (p.roles ?? []).includes(roleId)).map((p) => String(p.id)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, policiesQuery.data]);

  const saveMut = useMutation({
    mutationFn: (values: Values) =>
      updateRole({
        data: {
          id: roleId,
          name: values.name,
          description: values.description,
          is_enabled: values.is_enabled,
          users: members,
        },
      }),
    onSuccess: () => {
      toast.success(t("admin.roleEdit.saved"));
      void queryClient.invalidateQueries({ queryKey: ["rbac"] });
    },
    onError: (err) => {
      const info = parseServerError(err);
      let mapped = false;
      for (const f of ["name", "description", "is_enabled"] as const) {
        const msg = fieldMessage(info.fieldErrors, f);
        if (msg) {
          form.setError(f, { message: msg });
          mapped = true;
        }
      }
      if (!mapped) toast.error(info.message);
    },
  });

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.roleEdit.title")} description={t("admin.roleEdit.subtitle")} />
        <ForbiddenState perms={["roles.update"]} />
      </div>
    );
  }

  function toggleMember(userId: string) {
    const attached = members.includes(userId);
    const fn = attached ? detachUserRole : attachUserRole;
    setMembers(attached ? members.filter((m) => m !== userId) : [...members, userId]);
    fn({ data: { user_id: userId, role_id: roleId } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["rbac", "role", id] }))
      .catch((err) => toast.error(parseServerError(err).message));
  }

  // Attaching/detaching a role-policy edits that policy's roles[] (the link
  // lives on RolePolicy, not Role).
  function togglePolicy(policyId: string) {
    const pid = Number(policyId);
    const policy = policyRows.find((p) => p.id === pid);
    if (!policy) return;
    const attached = policies.includes(policyId);
    const nextRoles = attached
      ? (policy.roles ?? []).filter((r) => r !== roleId)
      : [...(policy.roles ?? []), roleId];
    setPolicies(attached ? policies.filter((p) => p !== policyId) : [...policies, policyId]);
    updateRolePolicy({ data: { id: pid, roles: nextRoles } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["rbac", "role-policies"] }))
      .catch((err) => toast.error(parseServerError(err).message));
  }

  function onSubmit(values: Values) {
    saveMut.mutate(values);
  }

  const effState =
    state !== "populated"
      ? state
      : roleQuery.isPending
        ? "loading"
        : roleQuery.isError
          ? "notfound"
          : "populated";

  // Effective permission set: resources reachable from the role's selected
  // role-policies. permission.role_policies[] links a permission to policies;
  // permission.resources[] links it to permission-resources whose `name` is the
  // canonical "resource.action" string.
  const selectedPolicyIds = policies.map(Number);
  const resourceById = new Map((resourcesQuery.data?.results ?? []).map((r) => [r.id, r.name]));
  const effective = Array.from(
    new Set(
      (permissionsQuery.data?.results ?? [])
        .filter(
          (p) =>
            p.is_enabled !== false &&
            (p.role_policies ?? []).some((rp) => selectedPolicyIds.includes(rp)),
        )
        .flatMap((p) => (p.resources ?? []).map((rid) => resourceById.get(rid)))
        .filter((name): name is string => !!name),
    ),
  );
  const grouped = effective.reduce<Record<string, string[]>>((acc, p) => {
    const [app, ...rest] = p.split(".");
    (acc[app] ??= []).push(rest.join("."));
    return acc;
  }, {});

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.roleEdit.title")}
        description={data?.name ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/admin/roles" })}>
              <ArrowLeft className="me-1.5 h-4 w-4" /> {t("admin.roleEdit.back")}
            </Button>
            <Button
              form="role-form"
              type="submit"
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="me-1.5 h-4 w-4" /> {t("admin.common.save_changes")}
            </Button>
          </div>
        }
      />

      <PageStates state={effState} missingPerms={["roles.update"]}>
        <form id="role-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 p-6 shadow-soft">
            <h3 className="mb-4 font-display text-lg font-semibold">
              {t("admin.roleEdit.fields")}
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.common.name")}</Label>
                <Input
                  id="name"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <div className="flex items-end justify-between rounded-xl border bg-card p-3">
                <Label htmlFor="is_enabled" className="font-normal">
                  {t("admin.common.isEnabled")}
                </Label>
                <Switch
                  id="is_enabled"
                  checked={form.watch("is_enabled")}
                  onCheckedChange={(v) => form.setValue("is_enabled", v)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">{t("admin.common.description")}</Label>
                <Textarea id="description" {...form.register("description")} />
              </div>
            </div>
          </Card>

          {/* Members */}
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">
                  {t("admin.roleEdit.members")}
                </h3>
              </div>
              <MultiPicker
                label={t("admin.roleEdit.addMember")}
                options={members.map((mId) => {
                  const u = MEMBER_OPTION_FALLBACK.find((x) => x.id === mId);
                  return { value: mId, label: u ? `${u.name} · ${u.email}` : mId };
                })}
                selected={members}
                onToggle={toggleMember}
              />
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("admin.roleEdit.membersHint")}</p>
            <div className="flex flex-wrap gap-2">
              {members.length === 0 && (
                <span className="text-sm text-muted-foreground">{t("admin.common.none")}</span>
              )}
              {members.map((mId) => {
                const u = MEMBER_OPTION_FALLBACK.find((x) => x.id === mId);
                return (
                  <Badge key={mId} variant="secondary" className="gap-1.5 py-1.5 ps-2.5 pe-1.5">
                    {u ? u.name : mId}
                    <button
                      type="button"
                      onClick={() => toggleMember(mId)}
                      aria-label="Remove"
                      className="rounded-full p-0.5 hover:bg-background/60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Role policies */}
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">
                  {t("admin.roleEdit.rolePolicies")}
                </h3>
              </div>
              <MultiPicker
                label={t("admin.roleEdit.addPolicy")}
                options={policyRows.map((p) => ({ value: String(p.id), label: p.name }))}
                selected={policies}
                onToggle={togglePolicy}
              />
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("admin.roleEdit.rolePoliciesHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              {policies.length === 0 && (
                <span className="text-sm text-muted-foreground">{t("admin.common.none")}</span>
              )}
              {policies.map((pId) => {
                const p = policyRows.find((x) => String(x.id) === pId);
                if (!p) return null;
                return (
                  <Badge key={pId} variant="secondary" className="gap-1.5 py-1.5 ps-2.5 pe-1.5">
                    {p.name}
                    <button
                      type="button"
                      onClick={() => togglePolicy(pId)}
                      aria-label="Remove"
                      className="rounded-full p-0.5 hover:bg-background/60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Effective permissions (read-only matrix) */}
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">
                {t("admin.roleEdit.effective")}
              </h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("admin.roleEdit.effectiveHint")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(grouped).map(([app, actions]) => (
                <div key={app} className="rounded-xl border bg-muted/30 p-3">
                  <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {app}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {actions.map((a) => (
                      <code
                        key={a}
                        className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]"
                      >
                        {a}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <span className="text-sm text-muted-foreground">{t("admin.common.none")}</span>
              )}
            </div>
          </div>
        </form>
      </PageStates>
    </div>
  );
}

function MultiPicker({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Plus className="me-1.5 h-3.5 w-3.5" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-72 overflow-y-auto">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onCheckedChange={() => onToggle(o.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
