import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, KeyRound, Layers, Pencil, Trash2, MoreHorizontal, X } from "lucide-react";
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
  listPermissions,
  listPermissionResources,
  createPermission,
  updatePermission,
  deletePermission,
} from "@/lib/api/rbac.functions";
import { parseServerError, fieldMessage } from "@/lib/api/error";

// View-model the JSX expects (mock parity); the BE Permission exposes the link
// arrays, which we surface as counts.
interface AdminPermission {
  id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  resources: number;
  role_policies: number;
  user_policies: number;
}

export const Route = createFileRoute("/_panel/admin/permissions")({
  head: () => ({ meta: [{ title: "Permissions — Mixlebs Admin" }] }),
  component: PermissionsPage,
});

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500),
  is_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function PermissionsPage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPermission | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resources, setResources] = useState<string[]>([]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", is_enabled: true },
  });

  const permissionsQuery = useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: () => listPermissions({ data: { page_size: 500 } }),
  });
  const resourcesQuery = useQuery({
    queryKey: ["rbac", "permission-resources"],
    queryFn: () => listPermissionResources({ data: { page_size: 500 } }),
  });
  const resourceOptions = resourcesQuery.data?.results ?? [];

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["rbac"] });
  }

  const saveMut = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        name: values.name,
        description: values.description,
        is_enabled: values.is_enabled,
        resources: resources.map(Number),
      };
      return editingId
        ? updatePermission({ data: { id: editingId, ...body } })
        : createPermission({ data: body });
    },
    onSuccess: () => {
      toast.success(editing ? t("admin.common.savedToast") : t("admin.common.createdToast"));
      invalidate();
      setOpen(false);
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

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePermission({ data: { id } }),
    onSuccess: () => {
      toast.success(t("admin.common.deletedToast"));
      invalidate();
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.permissions.title")}
          description={t("admin.permissions.subtitle")}
        />
        <ForbiddenState perms={["permissions.view"]} />
      </div>
    );
  }

  const rows: AdminPermission[] = (permissionsQuery.data?.results ?? []).map((p) => ({
    id: String(p.id),
    name: p.name,
    description: p.description ?? "",
    is_enabled: p.is_enabled,
    resources: (p.resources ?? []).length,
    role_policies: (p.role_policies ?? []).length,
    user_policies: (p.user_policies ?? []).length,
  }));

  const effState =
    state !== "populated"
      ? state
      : permissionsQuery.isPending
        ? "loading"
        : permissionsQuery.isError
          ? "error"
          : rows.length === 0
            ? "empty"
            : "populated";

  function openNew() {
    setEditing(null);
    setEditingId(null);
    form.reset({ name: "", description: "", is_enabled: true });
    setResources([]);
    setOpen(true);
  }
  function openEdit(r: AdminPermission) {
    const pid = Number(r.id);
    setEditing(r);
    setEditingId(pid);
    form.reset({ name: r.name, description: r.description, is_enabled: r.is_enabled });
    const perm = (permissionsQuery.data?.results ?? []).find((p) => p.id === pid);
    setResources((perm?.resources ?? []).map(String));
    setOpen(true);
  }
  function toggle(v: string) {
    setResources((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  function onSubmit(values: Values) {
    saveMut.mutate(values);
  }

  const columns: Column<AdminPermission>[] = [
    {
      id: "name",
      header: t("admin.permissions.colName"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
      sortValue: (r) => r.name,
    },
    {
      id: "description",
      header: t("admin.permissions.colDescription"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.description}</span>,
    },
    {
      id: "is_enabled",
      header: t("admin.permissions.colEnabled"),
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
      id: "resources",
      header: t("admin.permissions.colResources"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.resources}</span>,
      sortValue: (r) => r.resources,
    },
    {
      id: "role_policies",
      header: t("admin.permissions.colRolePolicies"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.role_policies}</span>,
      sortValue: (r) => r.role_policies,
    },
    {
      id: "user_policies",
      header: t("admin.permissions.colUserPolicies"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.user_policies}</span>,
      sortValue: (r) => r.user_policies,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.permissions.title")}
        description={t("admin.permissions.subtitle")}
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={openNew}
          >
            <Plus className="me-1.5 h-4 w-4" /> {t("admin.permissions.new")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.permissions.kTotal")}
          value={rows.length}
          icon={<KeyRound className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.permissions.kEnabled")}
          value={rows.filter((r) => r.is_enabled).length}
          icon={<Layers className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.permissions.colResources")}
          value={rows.reduce((a, r) => a + r.resources, 0)}
        />
      </div>

      <div className="mt-6">
        <PageStates state={effState} missingPerms={["permissions.view"]}>
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
                    title={t("admin.permissions.deleteTitle")}
                    confirmLabel={t("admin.common.delete")}
                    typeToConfirm={r.name}
                    onConfirm={() => deleteMut.mutate(Number(r.id))}
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
                {editing ? t("admin.common.edit") : t("admin.permissions.new")}
              </SheetTitle>
              <SheetDescription>{t("admin.permissions.subtitle")}</SheetDescription>
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

              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <Label className="font-medium">{t("admin.permissions.resources")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7">
                        <Plus className="me-1.5 h-3.5 w-3.5" /> {t("admin.common.new")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-72 w-72 overflow-y-auto">
                      {resourceOptions.map((o) => (
                        <DropdownMenuCheckboxItem
                          key={o.id}
                          checked={resources.includes(String(o.id))}
                          onCheckedChange={() => toggle(String(o.id))}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <span className="font-mono text-xs">{o.name}</span>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("admin.permissions.resourcesHint")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {resources.length === 0 && (
                    <span className="text-sm text-muted-foreground">{t("admin.common.none")}</span>
                  )}
                  {resources.map((v) => (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="gap-1.5 py-1 ps-2 pe-1 font-mono text-[11px]"
                    >
                      {resourceOptions.find((x) => String(x.id) === v)?.name}
                      <button
                        type="button"
                        onClick={() => toggle(v)}
                        aria-label="Remove"
                        className="rounded-full p-0.5 hover:bg-background/60"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
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
