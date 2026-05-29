import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { ADMIN_ROLES, ADMIN_ROLE_POLICIES, ADMIN_PICK_USERS } from "@/lib/mock/admin";
import { PERMISSIONS } from "@/lib/mock-data";

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
  const { id } = Route.useParams();
  const data = ADMIN_ROLES.find((r) => r.id === id) ?? ADMIN_ROLES[0];

  const [members, setMembers] = useState<string[]>([
    ADMIN_PICK_USERS[1].id,
    ADMIN_PICK_USERS[2].id,
  ]);
  const [policies, setPolicies] = useState<string[]>([
    ADMIN_ROLE_POLICIES[0].id,
    ADMIN_ROLE_POLICIES[1].id,
  ]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: data.name, description: data.description, is_enabled: data.is_enabled },
  });

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.roleEdit.title")} description={t("admin.roleEdit.subtitle")} />
        <ForbiddenState perms={["roles.update"]} />
      </div>
    );
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function onSubmit(values: Values) {
    toast.success(t("admin.roleEdit.saved"));
    void values;
  }

  // Effective permission set derived from selected policies (demo: deterministic slice).
  const effective = PERMISSIONS.filter((_, i) =>
    policies.length === 0 ? false : i % Math.max(2, 4 - policies.length) === 0,
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
        description={data.name}
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

      <PageStates state={state} missingPerms={["roles.update"]}>
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
                options={ADMIN_PICK_USERS.map((u) => ({
                  value: u.id,
                  label: `${u.name} · ${u.email}`,
                }))}
                selected={members}
                onToggle={(v) => toggle(members, setMembers, v)}
              />
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("admin.roleEdit.membersHint")}</p>
            <div className="flex flex-wrap gap-2">
              {members.length === 0 && (
                <span className="text-sm text-muted-foreground">{t("admin.common.none")}</span>
              )}
              {members.map((mId) => {
                const u = ADMIN_PICK_USERS.find((x) => x.id === mId);
                if (!u) return null;
                return (
                  <Badge key={mId} variant="secondary" className="gap-1.5 py-1.5 ps-2.5 pe-1.5">
                    {u.name}
                    <button
                      type="button"
                      onClick={() => toggle(members, setMembers, mId)}
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
                options={ADMIN_ROLE_POLICIES.map((p) => ({ value: p.id, label: p.name }))}
                selected={policies}
                onToggle={(v) => toggle(policies, setPolicies, v)}
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
                const p = ADMIN_ROLE_POLICIES.find((x) => x.id === pId);
                if (!p) return null;
                return (
                  <Badge key={pId} variant="secondary" className="gap-1.5 py-1.5 ps-2.5 pe-1.5">
                    {p.name}
                    <button
                      type="button"
                      onClick={() => toggle(policies, setPolicies, pId)}
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
