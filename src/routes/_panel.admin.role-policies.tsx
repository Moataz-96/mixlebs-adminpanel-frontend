import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ShieldCheck, KeyRound, Pencil, Trash2, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ADMIN_ROLE_POLICIES,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  type AdminRolePolicy,
} from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/role-policies")({
  head: () => ({ meta: [{ title: "Role policies — Mixlebs Admin" }] }),
  component: RolePoliciesPage,
});

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500),
  is_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function RolePoliciesPage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRolePolicy | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", is_enabled: true },
  });

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.rolePolicies.title")}
          description={t("admin.rolePolicies.subtitle")}
        />
        <ForbiddenState perms={["role_policies.view"]} />
      </div>
    );
  }

  const rows = ADMIN_ROLE_POLICIES;

  function openNew() {
    setEditing(null);
    form.reset({ name: "", description: "", is_enabled: true });
    setPerms([]);
    setRoles([]);
    setOpen(true);
  }
  function openEdit(r: AdminRolePolicy) {
    setEditing(r);
    form.reset({ name: r.name, description: r.description, is_enabled: r.is_enabled });
    setPerms(ADMIN_PERMISSIONS.slice(0, r.permissions).map((p) => p.id));
    setRoles(ADMIN_ROLES.slice(0, r.roles).map((x) => x.id));
    setOpen(true);
  }
  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }
  function onSubmit(values: Values) {
    toast.success(editing ? t("admin.common.savedToast") : t("admin.common.createdToast"));
    setOpen(false);
    void values;
  }

  const columns: Column<AdminRolePolicy>[] = [
    {
      id: "name",
      header: t("admin.rolePolicies.colName"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
      sortValue: (r) => r.name,
    },
    {
      id: "description",
      header: t("admin.rolePolicies.colDescription"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.description}</span>,
    },
    {
      id: "is_enabled",
      header: t("admin.rolePolicies.colEnabled"),
      cell: (r) => (
        <Badge
          variant="outline"
          className={
            r.is_enabled
              ? "border-success/30 bg-success/15 text-success"
              : "border-border bg-muted text-muted-foreground"
          }
        >
          {r.is_enabled ? t("admin.common.enabled") : t("admin.common.disabled")}
        </Badge>
      ),
      sortValue: (r) => (r.is_enabled ? 1 : 0),
    },
    {
      id: "roles",
      header: t("admin.rolePolicies.colRoles"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.roles}</span>,
      sortValue: (r) => r.roles,
    },
    {
      id: "permissions",
      header: t("admin.rolePolicies.colPermissions"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.permissions}</span>,
      sortValue: (r) => r.permissions,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.rolePolicies.title")}
        description={t("admin.rolePolicies.subtitle")}
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={openNew}
          >
            <Plus className="me-1.5 h-4 w-4" /> {t("admin.rolePolicies.new")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.rolePolicies.kTotal")}
          value={rows.length}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.rolePolicies.kEnabled")}
          value={rows.filter((r) => r.is_enabled).length}
          icon={<KeyRound className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.rolePolicies.colPermissions")}
          value={rows.reduce((a, r) => a + r.permissions, 0)}
        />
      </div>

      <div className="mt-6">
        <PageStates state={state} missingPerms={["role_policies.view"]}>
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={openEdit}
            rowActions={(r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-60 group-hover:opacity-100"
                    aria-label={t("admin.common.actions")}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(r)}>
                    <Pencil className="me-2 h-4 w-4" /> {t("admin.common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    destructive
                    title={t("admin.rolePolicies.deleteTitle")}
                    confirmLabel={t("admin.common.delete")}
                    typeToConfirm={r.name}
                    onConfirm={() => toast.success(t("admin.common.deletedToast"))}
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive"
                      >
                        <Trash2 className="me-2 h-4 w-4" /> {t("admin.common.delete")}
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </PageStates>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>
                {editing ? t("admin.common.edit") : t("admin.rolePolicies.new")}
              </SheetTitle>
              <SheetDescription>{t("admin.rolePolicies.subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.common.name")}</Label>
                <Input
                  id="name"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("admin.common.description")}</Label>
                <Textarea id="description" {...form.register("description")} />
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                <Label htmlFor="is_enabled" className="font-normal">
                  {t("admin.common.isEnabled")}
                </Label>
                <Switch
                  id="is_enabled"
                  checked={form.watch("is_enabled")}
                  onCheckedChange={(v) => form.setValue("is_enabled", v)}
                />
              </div>

              <PickerField
                title={t("admin.rolePolicies.permissions")}
                hint={t("admin.rolePolicies.permissionsHint")}
                options={ADMIN_PERMISSIONS.map((p) => ({ value: p.id, label: p.name }))}
                selected={perms}
                onToggle={(v) => toggle(perms, setPerms, v)}
                renderChip={(v) => ADMIN_PERMISSIONS.find((p) => p.id === v)?.name}
              />
              <PickerField
                title={t("admin.rolePolicies.roles")}
                hint={t("admin.rolePolicies.rolesHint")}
                options={ADMIN_ROLES.map((r) => ({ value: r.id, label: r.name }))}
                selected={roles}
                onToggle={(v) => toggle(roles, setRoles, v)}
                renderChip={(v) => ADMIN_ROLES.find((r) => r.id === v)?.name}
              />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("admin.common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {t("admin.common.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PickerField({
  title,
  hint,
  options,
  selected,
  onToggle,
  renderChip,
}: {
  title: string;
  hint: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  renderChip: (v: string) => string | undefined;
}) {
  const t = useT();
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-1 flex items-center justify-between">
        <Label className="font-medium">{title}</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7">
              <Plus className="me-1.5 h-3.5 w-3.5" /> {t("admin.common.new")}
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
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground">{t("admin.common.none")}</span>
        )}
        {selected.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1.5 py-1 ps-2 pe-1">
            {renderChip(v)}
            <button
              type="button"
              onClick={() => onToggle(v)}
              aria-label="Remove"
              className="rounded-full p-0.5 hover:bg-background/60"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
