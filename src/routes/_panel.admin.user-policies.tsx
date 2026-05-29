import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, UserCog, ShieldX, Pencil, Trash2, MoreHorizontal, X } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  ADMIN_USER_POLICIES,
  ADMIN_PERMISSIONS,
  ADMIN_PICK_USERS,
  type AdminUserPolicy,
} from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/user-policies")({
  head: () => ({ meta: [{ title: "User policies — Mixlebs Admin" }] }),
  component: UserPoliciesPage,
});

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500),
  type: z.enum(["POSITIVE", "NEGATIVE"]),
  is_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function UserPoliciesPage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserPolicy | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [perms, setPerms] = useState<string[]>([]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", type: "POSITIVE", is_enabled: true },
  });
  const typeVal = form.watch("type");

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.userPolicies.title")}
          description={t("admin.userPolicies.subtitle")}
        />
        <ForbiddenState perms={["user_policies.view"]} />
      </div>
    );
  }

  const rows = ADMIN_USER_POLICIES;

  function openNew() {
    setEditing(null);
    form.reset({ name: "", description: "", type: "POSITIVE", is_enabled: true });
    setUsers([]);
    setPerms([]);
    setOpen(true);
  }
  function openEdit(r: AdminUserPolicy) {
    setEditing(r);
    form.reset({
      name: r.name,
      description: r.description,
      type: r.type,
      is_enabled: r.is_enabled,
    });
    setUsers(ADMIN_PICK_USERS.slice(0, r.users).map((u) => u.id));
    setPerms(ADMIN_PERMISSIONS.slice(0, r.permissions).map((p) => p.id));
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

  const columns: Column<AdminUserPolicy>[] = [
    {
      id: "name",
      header: t("admin.userPolicies.colName"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
      sortValue: (r) => r.name,
    },
    {
      id: "description",
      header: t("admin.userPolicies.colDescription"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.description}</span>,
    },
    {
      id: "type",
      header: t("admin.userPolicies.colType"),
      cell: (r) => (
        <Badge
          variant="outline"
          className={
            r.type === "NEGATIVE"
              ? "border-destructive/30 bg-destructive/15 text-destructive"
              : "border-success/30 bg-success/15 text-success"
          }
        >
          {r.type === "NEGATIVE"
            ? t("admin.userPolicies.negative")
            : t("admin.userPolicies.positive")}
        </Badge>
      ),
      sortValue: (r) => r.type,
    },
    {
      id: "is_enabled",
      header: t("admin.userPolicies.colEnabled"),
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
      id: "users",
      header: t("admin.userPolicies.colUsers"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.users}</span>,
      sortValue: (r) => r.users,
    },
    {
      id: "permissions",
      header: t("admin.userPolicies.colPermissions"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.permissions}</span>,
      sortValue: (r) => r.permissions,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.userPolicies.title")}
        description={t("admin.userPolicies.subtitle")}
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={openNew}
          >
            <Plus className="me-1.5 h-4 w-4" /> {t("admin.userPolicies.new")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.userPolicies.kTotal")}
          value={rows.length}
          icon={<UserCog className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.userPolicies.kNegative")}
          value={rows.filter((r) => r.type === "NEGATIVE").length}
          icon={<ShieldX className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.userPolicies.colUsers")}
          value={rows.reduce((a, r) => a + r.users, 0)}
        />
      </div>

      <div className="mt-6">
        <PageStates state={state} missingPerms={["user_policies.view"]}>
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
                    title={t("admin.userPolicies.deleteTitle")}
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
                {editing ? t("admin.common.edit") : t("admin.userPolicies.new")}
              </SheetTitle>
              <SheetDescription>{t("admin.userPolicies.subtitle")}</SheetDescription>
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
              <div className="space-y-2">
                <Label>{t("admin.userPolicies.type")}</Label>
                <RadioGroup
                  value={typeVal}
                  onValueChange={(v) => form.setValue("type", v as Values["type"])}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="POSITIVE" id="type-pos" />{" "}
                    {t("admin.userPolicies.positive")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="NEGATIVE" id="type-neg" />{" "}
                    {t("admin.userPolicies.negative")}
                  </label>
                </RadioGroup>
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
                title={t("admin.userPolicies.users")}
                hint={t("admin.userPolicies.usersHint")}
                options={ADMIN_PICK_USERS.map((u) => ({
                  value: u.id,
                  label: `${u.name} · ${u.email}`,
                }))}
                selected={users}
                onToggle={(v) => toggle(users, setUsers, v)}
                renderChip={(v) => ADMIN_PICK_USERS.find((u) => u.id === v)?.name}
              />
              <PickerField
                title={t("admin.userPolicies.permissions")}
                hint={t("admin.userPolicies.permissionsHint")}
                options={ADMIN_PERMISSIONS.map((p) => ({ value: p.id, label: p.name }))}
                selected={perms}
                onToggle={(v) => toggle(perms, setPerms, v)}
                renderChip={(v) => ADMIN_PERMISSIONS.find((p) => p.id === v)?.name}
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
