import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Coins, Pencil, Trash2, MoreHorizontal } from "lucide-react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseServerError } from "@/lib/api/error";
import {
  listCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  toAdminCurrency,
  type AdminCurrency,
} from "@/lib/api/locations.functions";

export const Route = createFileRoute("/_panel/admin/locations/currencies")({
  head: () => ({ meta: [{ title: "Currencies — Mixlebs Admin" }] }),
  component: CurrenciesPage,
});

const schema = z.object({
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  code: z.string().min(2).max(5),
});
type Values = z.infer<typeof schema>;

function CurrenciesPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCurrency | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name_en: "", name_ar: "", code: "" },
  });

  const currenciesQuery = useQuery({
    queryKey: ["currencies"],
    queryFn: () => listCurrencies(),
    enabled: has("locations.view"),
    retry: false,
  });
  const currencies = useMemo(
    () => (currenciesQuery.data?.results ?? []).map(toAdminCurrency),
    [currenciesQuery.data],
  );

  const rows = useMemo(
    () =>
      currencies.filter(
        (c) => !q || `${c.name_en} ${c.name_ar} ${c.code}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [currencies, q],
  );

  if (!has("locations.view")) {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.locations.currencies.title")}
          description={t("admin.locations.subtitle")}
        />
        <ForbiddenState perms={["locations.view"]} />
      </div>
    );
  }

  function openNew() {
    setEditing(null);
    form.reset({ name_en: "", name_ar: "", code: "" });
    setOpen(true);
  }
  function openEdit(c: AdminCurrency) {
    setEditing(c);
    form.reset({ name_en: c.name_en, name_ar: c.name_ar, code: c.code });
    setOpen(true);
  }
  async function onSubmit(values: Values) {
    const body = { name: values.name_en, code: values.code };
    try {
      if (editing) {
        await updateCurrency({ data: { id: Number(editing.id), body } });
      } else {
        await createCurrency({ data: body });
      }
      await queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success(editing ? t("admin.common.savedToast") : t("admin.common.createdToast"));
      setOpen(false);
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  async function removeCurrency(c: AdminCurrency) {
    try {
      await deleteCurrency({ data: { id: Number(c.id) } });
      await queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success(t("admin.common.deletedToast"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  const columns: Column<AdminCurrency>[] = [
    {
      id: "name",
      header: t("admin.locations.colName"),
      cell: (c) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{c.name_en}</span>
          <span className="text-sm text-muted-foreground" dir="rtl">
            {c.name_ar}
          </span>
        </div>
      ),
      sortValue: (c) => c.name_en,
    },
    {
      id: "code",
      header: t("admin.locations.colCode"),
      cell: (c) => <code className="font-mono text-xs">{c.code}</code>,
      sortValue: (c) => c.code,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.locations.currencies.title")}
        description={t("admin.locations.subtitle")}
        actions={
          <Can perm="locations.update">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={openNew}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("admin.locations.currencies.new")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label={t("admin.locations.currencies.title")}
          value={currencies.length}
          icon={<Coins className="h-5 w-5" />}
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
              {t("admin.locations.currencies.emptyTitle")}
            </div>
          }
        >
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(c) => c.id}
            onRowClick={has("locations.update") ? openEdit : undefined}
            rowActions={
              has("locations.update")
                ? (c) => (
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
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="me-2 h-4 w-4" /> {t("admin.common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          destructive
                          title={t("admin.locations.currencies.deleteTitle")}
                          confirmLabel={t("admin.common.delete")}
                          typeToConfirm={c.code}
                          onConfirm={() => removeCurrency(c)}
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
                {editing ? t("admin.common.edit") : t("admin.locations.currencies.new")}
              </SheetTitle>
              <SheetDescription>{t("admin.locations.subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="name_en">{t("admin.locations.nameEn")}</Label>
                <Input
                  id="name_en"
                  dir="ltr"
                  aria-invalid={!!form.formState.errors.name_en}
                  {...form.register("name_en")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t("admin.locations.nameAr")}</Label>
                <Input
                  id="name_ar"
                  dir="rtl"
                  aria-invalid={!!form.formState.errors.name_ar}
                  {...form.register("name_ar")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{t("admin.locations.code")}</Label>
                <Input
                  id="code"
                  dir="ltr"
                  className="font-mono uppercase"
                  aria-invalid={!!form.formState.errors.code}
                  {...form.register("code")}
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
