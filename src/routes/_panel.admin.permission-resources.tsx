import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Database, RefreshCw, Pencil, Trash2, MoreHorizontal } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  listPermissionResources,
  createPermissionResource,
  updatePermissionResource,
  deletePermissionResource,
  type PermissionResource as ApiPermissionResource,
  type ResourceMethod,
} from "@/lib/api/rbac.functions";
import { parseServerError, fieldMessage } from "@/lib/api/error";

const RESOURCE_METHODS: ResourceMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

// View-model the JSX expects (mock parity); ids are stringified for the table.
interface AdminPermissionResource {
  id: string;
  name: string;
  app: string;
  view_name: string;
  url: string;
  method: ResourceMethod;
  is_enabled: boolean;
}

export const Route = createFileRoute("/_panel/admin/permission-resources")({
  head: () => ({ meta: [{ title: "Permission resources — Mixlebs Admin" }] }),
  component: PermissionResourcesPage,
});

const schema = z.object({
  name: z.string().min(1).max(150),
  app: z.string().min(1).max(100),
  view_name: z.string().min(1).max(150),
  url: z.string().min(1).max(255),
  method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  is_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

const METHOD_STYLE: Record<ResourceMethod, string> = {
  GET: "border-info/30 bg-info/15 text-info",
  POST: "border-success/30 bg-success/15 text-success",
  PATCH: "border-warning/30 bg-warning/15 text-warning",
  PUT: "border-warning/30 bg-warning/15 text-warning",
  DELETE: "border-destructive/30 bg-destructive/15 text-destructive",
};

function PermissionResourcesPage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPermissionResource | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", app: "", view_name: "", url: "", method: "GET", is_enabled: true },
  });
  const methodVal = form.watch("method");

  const resourcesQuery = useQuery({
    queryKey: ["rbac", "permission-resources"],
    queryFn: () => listPermissionResources({ data: { page_size: 500 } }),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["rbac", "permission-resources"] });
  }

  const saveMut = useMutation({
    mutationFn: (values: Values) =>
      editingId
        ? updatePermissionResource({ data: { id: editingId, ...values } })
        : createPermissionResource({ data: values }),
    onSuccess: () => {
      toast.success(editing ? t("admin.common.savedToast") : t("admin.common.createdToast"));
      invalidate();
      setOpen(false);
    },
    onError: (err) => {
      const info = parseServerError(err);
      let mapped = false;
      for (const f of ["name", "app", "view_name", "url", "method", "is_enabled"] as const) {
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
    mutationFn: (id: number) => deletePermissionResource({ data: { id } }),
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
          title={t("admin.permissionResources.title")}
          description={t("admin.permissionResources.subtitle")}
        />
        <ForbiddenState perms={["permission_resources.view"]} />
      </div>
    );
  }

  const rows: AdminPermissionResource[] = (resourcesQuery.data?.results ?? []).map(
    (r: ApiPermissionResource) => ({
      id: String(r.id),
      name: r.name,
      app: r.app,
      view_name: r.view_name,
      url: r.url,
      method: r.method,
      is_enabled: r.is_enabled,
    }),
  );

  const effState =
    state !== "populated"
      ? state
      : resourcesQuery.isPending
        ? "loading"
        : resourcesQuery.isError
          ? "error"
          : rows.length === 0
            ? "empty"
            : "populated";

  function openNew() {
    setEditing(null);
    setEditingId(null);
    form.reset({ name: "", app: "", view_name: "", url: "", method: "GET", is_enabled: true });
    setOpen(true);
  }
  function openEdit(r: AdminPermissionResource) {
    setEditing(r);
    setEditingId(Number(r.id));
    form.reset({
      name: r.name,
      app: r.app,
      view_name: r.view_name,
      url: r.url,
      method: r.method,
      is_enabled: r.is_enabled,
    });
    setOpen(true);
  }
  function onSubmit(values: Values) {
    saveMut.mutate(values);
  }

  const columns: Column<AdminPermissionResource>[] = [
    {
      id: "name",
      header: t("admin.permissionResources.colName"),
      cell: (r) => <code className="font-mono text-xs">{r.name}</code>,
      sortValue: (r) => r.name,
    },
    {
      id: "app",
      header: t("admin.permissionResources.colApp"),
      cell: (r) => <span className="text-sm">{r.app}</span>,
      sortValue: (r) => r.app,
    },
    {
      id: "view_name",
      header: t("admin.permissionResources.colViewName"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.view_name}</span>,
    },
    {
      id: "url",
      header: t("admin.permissionResources.colUrl"),
      cell: (r) => <code className="font-mono text-[11px] text-muted-foreground">{r.url}</code>,
    },
    {
      id: "method",
      header: t("admin.permissionResources.colMethod"),
      cell: (r) => (
        <Badge variant="outline" className={`font-mono text-[10px] ${METHOD_STYLE[r.method]}`}>
          {r.method}
        </Badge>
      ),
      sortValue: (r) => r.method,
    },
    {
      id: "is_enabled",
      header: t("admin.permissionResources.colEnabled"),
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
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.permissionResources.title")}
        description={t("admin.permissionResources.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <ConfirmDialog
              title={t("admin.permissionResources.reseedTitle")}
              description={t("admin.permissionResources.reseedDesc")}
              confirmLabel={t("admin.permissionResources.reseed")}
              onConfirm={() => toast.success(t("admin.permissionResources.reseeded"))}
              trigger={
                <Button variant="outline">
                  <RefreshCw className="me-1.5 h-4 w-4" /> {t("admin.permissionResources.reseed")}
                </Button>
              }
            />
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={openNew}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("admin.permissionResources.new")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.permissionResources.kTotal")}
          value={rows.length}
          icon={<Database className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.permissionResources.kEnabled")}
          value={rows.filter((r) => r.is_enabled).length}
        />
        <KpiCard
          label={t("admin.permissionResources.colApp")}
          value={new Set(rows.map((r) => r.app)).size}
        />
      </div>

      <div className="mt-6">
        <PageStates state={effState} missingPerms={["permission_resources.view"]}>
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
                    title={t("admin.permissionResources.deleteTitle")}
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
                {editing ? t("admin.common.edit") : t("admin.permissionResources.new")}
              </SheetTitle>
              <SheetDescription>{t("admin.permissionResources.subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.permissionResources.colName")}</Label>
                <Input
                  id="name"
                  dir="ltr"
                  className="font-mono"
                  placeholder={t("admin.permissionResources.namePh")}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="app">{t("admin.permissionResources.app")}</Label>
                  <Input
                    id="app"
                    dir="ltr"
                    aria-invalid={!!form.formState.errors.app}
                    {...form.register("app")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="view_name">{t("admin.permissionResources.viewName")}</Label>
                  <Input
                    id="view_name"
                    dir="ltr"
                    aria-invalid={!!form.formState.errors.view_name}
                    {...form.register("view_name")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">{t("admin.permissionResources.url")}</Label>
                <Input
                  id="url"
                  dir="ltr"
                  className="font-mono"
                  aria-invalid={!!form.formState.errors.url}
                  {...form.register("url")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.permissionResources.method")}</Label>
                <Select
                  value={methodVal}
                  onValueChange={(v) => form.setValue("method", v as ResourceMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
