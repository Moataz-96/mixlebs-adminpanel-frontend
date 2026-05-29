import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Languages as LangIcon, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can, usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ADMIN_LANGUAGES, type AdminLanguage } from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/locations/languages")({
  head: () => ({ meta: [{ title: "Languages — Mixlebs Admin" }] }),
  component: LanguagesPage,
});

const schema = z.object({
  code: z.string().min(2).max(5),
  name: z.string().min(1).max(150),
});
type Values = z.infer<typeof schema>;

function LanguagesPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLanguage | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "" },
  });

  const rows = useMemo(
    () =>
      ADMIN_LANGUAGES.filter(
        (l) => !q || `${l.code} ${l.name}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  if (!has("locations.view")) {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.locations.languages.title")}
          description={t("admin.locations.subtitle")}
        />
        <ForbiddenState perms={["locations.view"]} />
      </div>
    );
  }

  function openNew() {
    setEditing(null);
    form.reset({ code: "", name: "" });
    setOpen(true);
  }
  function openEdit(l: AdminLanguage) {
    setEditing(l);
    form.reset({ code: l.code, name: l.name });
    setOpen(true);
  }
  function onSubmit(values: Values) {
    toast.success(editing ? t("admin.common.savedToast") : t("admin.common.createdToast"));
    setOpen(false);
    void values;
  }

  const columns: Column<AdminLanguage>[] = [
    {
      id: "code",
      header: t("admin.locations.colCode"),
      cell: (l) => <code className="font-mono text-xs">{l.code}</code>,
      sortValue: (l) => l.code,
    },
    {
      id: "name",
      header: t("admin.locations.colName"),
      cell: (l) => <span className="font-medium">{l.name}</span>,
      sortValue: (l) => l.name,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.locations.languages.title")}
        description={t("admin.locations.subtitle")}
        actions={
          <Can perm="locations.update">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={openNew}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("admin.locations.languages.new")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label={t("admin.locations.languages.title")}
          value={ADMIN_LANGUAGES.length}
          icon={<LangIcon className="h-5 w-5" />}
          accent
        />
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="space-y-1.5">
          <Label htmlFor="q" className="text-xs">
            {t("admin.common.search")}
          </Label>
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.locations.searchPlaceholder")}
            className="h-9 max-w-md"
          />
        </div>
      </div>

      <div className="mt-4">
        <PageStates
          state={state}
          missingPerms={["locations.view"]}
          empty={
            <div className="rounded-2xl border border-dashed bg-muted/30 p-16 text-center text-sm text-muted-foreground">
              {t("admin.locations.languages.emptyTitle")}
            </div>
          }
        >
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(l) => l.id}
            onRowClick={has("locations.update") ? openEdit : undefined}
            rowActions={
              has("locations.update")
                ? (l) => (
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
                        <DropdownMenuItem onClick={() => openEdit(l)}>
                          <Pencil className="me-2 h-4 w-4" /> {t("admin.common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          destructive
                          title={t("admin.locations.languages.deleteTitle")}
                          confirmLabel={t("admin.common.delete")}
                          typeToConfirm={l.code}
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
                  )
                : undefined
            }
          />
        </PageStates>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>
                {editing ? t("admin.common.edit") : t("admin.locations.languages.new")}
              </SheetTitle>
              <SheetDescription>{t("admin.locations.subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="code">{t("admin.locations.code")}</Label>
                <Input
                  id="code"
                  dir="ltr"
                  className="font-mono"
                  placeholder="en"
                  aria-invalid={!!form.formState.errors.code}
                  {...form.register("code")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.common.name")}</Label>
                <Input
                  id="name"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
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
