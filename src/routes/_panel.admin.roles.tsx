import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ShieldCheck, Users, Pencil, Copy, Ban, Trash2, MoreHorizontal } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ADMIN_ROLES, type AdminRole } from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/roles")({
  head: () => ({ meta: [{ title: "Roles — Mixlebs Admin" }] }),
  component: RolesPage,
});

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500),
  is_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function RolesPage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", is_enabled: true },
  });

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.roles.title")} description={t("admin.roles.subtitle")} />
        <ForbiddenState perms={["roles.view"]} />
      </div>
    );
  }

  const rows = ADMIN_ROLES;
  const fmt = (n: number) => n.toLocaleString();

  function onCreate(values: Values) {
    toast.success(t("admin.common.createdToast"));
    setOpen(false);
    form.reset();
    void values;
  }

  const columns: Column<AdminRole>[] = [
    {
      id: "name",
      header: t("admin.roles.colName"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
      sortValue: (r) => r.name,
    },
    {
      id: "description",
      header: t("admin.roles.colDescription"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.description}</span>,
    },
    {
      id: "is_enabled",
      header: t("admin.roles.colEnabled"),
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
      header: t("admin.roles.colUsers"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.users)}</span>,
      sortValue: (r) => r.users,
    },
    {
      id: "policies",
      header: t("admin.roles.colPolicies"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.policies)}</span>,
      sortValue: (r) => r.policies,
    },
    {
      id: "created_at",
      header: t("admin.roles.colCreated"),
      cell: (r) => <span className="text-xs text-muted-foreground">{r.created_at}</span>,
      sortValue: (r) => r.created_at,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.roles.title")}
        description={t("admin.roles.subtitle")}
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={() => setOpen(true)}
          >
            <Plus className="me-1.5 h-4 w-4" /> {t("admin.roles.new")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.roles.kTotal")}
          value={rows.length}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.roles.kAssignments")}
          value={rows.reduce((a, r) => a + r.users, 0)}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.roles.kPolicies")}
          value={Math.round(rows.reduce((a, r) => a + r.policies, 0) / Math.max(1, rows.length))}
        />
      </div>

      <div className="mt-6">
        <PageStates state={state} missingPerms={["roles.view"]}>
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate({ to: "/admin/roles/$id/edit", params: { id: r.id } })}
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
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/admin/roles/$id/edit", params: { id: r.id } })}
                  >
                    <Pencil className="me-2 h-4 w-4" /> {t("admin.common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => toast.success(t("admin.common.duplicatedToast"))}
                  >
                    <Copy className="me-2 h-4 w-4" /> {t("admin.common.duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success(t("admin.common.disabledToast"))}>
                    <Ban className="me-2 h-4 w-4" /> {t("admin.common.disable")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    destructive
                    title={t("admin.roles.deleteTitle")}
                    description={t("admin.roles.deleteDesc")}
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
        <SheetContent className="w-full sm:max-w-md">
          <form onSubmit={form.handleSubmit(onCreate)} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{t("admin.roles.createTitle")}</SheetTitle>
              <SheetDescription>{t("admin.roles.subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.common.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("admin.roles.namePh")}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("admin.common.description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("admin.roles.descPh")}
                  {...form.register("description")}
                />
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
