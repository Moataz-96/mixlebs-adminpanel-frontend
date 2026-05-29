import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Sliders, Calendar, Pencil, Trash2, MoreHorizontal } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
  listOptions,
  createOption,
  updateOption,
  deleteOption,
  toAdminOption,
  type AdminOption,
} from "@/lib/api/options.functions";

export const Route = createFileRoute("/_panel/admin/options")({
  head: () => ({ meta: [{ title: "Options — Mixlebs Admin" }] }),
  component: OptionsPage,
});

const schema = z.object({
  event: z.string().min(1).max(150),
  identifier: z.string().min(1).max(150),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
});
type Values = z.infer<typeof schema>;

function OptionsPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOption | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { event: "", identifier: "", name_en: "", name_ar: "" },
  });

  const optionsQuery = useQuery({
    queryKey: ["options"],
    queryFn: () => listOptions({ data: {} }),
    enabled: has("options.view"),
    retry: false,
  });
  const options = useMemo(
    () => (optionsQuery.data?.results ?? []).map(toAdminOption),
    [optionsQuery.data],
  );

  const rows = useMemo(
    () =>
      options.filter(
        (o) =>
          !q ||
          `${o.event} ${o.identifier} ${o.name_en} ${o.name_ar}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [options, q],
  );

  if (!has("options.view")) {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.options.title")} description={t("admin.options.subtitle")} />
        <ForbiddenState perms={["options.view"]} />
      </div>
    );
  }

  function openNew() {
    setEditing(null);
    form.reset({ event: "", identifier: "", name_en: "", name_ar: "" });
    setOpen(true);
  }
  function openEdit(o: AdminOption) {
    setEditing(o);
    form.reset({
      event: o.event,
      identifier: o.identifier,
      name_en: o.name_en,
      name_ar: o.name_ar,
    });
    setOpen(true);
  }
  async function onSubmit(values: Values) {
    try {
      if (editing) {
        await updateOption({ data: { id: Number(editing.id), body: values } });
      } else {
        await createOption({ data: values });
      }
      await queryClient.invalidateQueries({ queryKey: ["options"] });
      toast.success(editing ? t("admin.common.savedToast") : t("admin.common.createdToast"));
      setOpen(false);
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  async function removeOption(o: AdminOption) {
    try {
      await deleteOption({ data: { id: Number(o.id) } });
      await queryClient.invalidateQueries({ queryKey: ["options"] });
      toast.success(t("admin.common.deletedToast"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  const columns: Column<AdminOption>[] = [
    {
      id: "event",
      header: t("admin.options.colEvent"),
      cell: (o) => <code className="font-mono text-xs">{o.event}</code>,
      sortValue: (o) => o.event,
    },
    {
      id: "identifier",
      header: t("admin.options.colIdentifier"),
      cell: (o) => <code className="font-mono text-xs text-muted-foreground">{o.identifier}</code>,
      sortValue: (o) => o.identifier,
    },
    {
      id: "translations",
      header: t("admin.options.colTranslations"),
      cell: (o) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            EN · {o.name_en}
          </Badge>
          <Badge variant="outline" className="text-[10px]" dir="rtl">
            AR · {o.name_ar}
          </Badge>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.options.title")}
        description={t("admin.options.subtitle")}
        actions={
          <Can perm="options.update">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={openNew}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("admin.options.new")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label={t("admin.options.kTotal")}
          value={options.length}
          icon={<Sliders className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.options.kEvents")}
          value={new Set(options.map((o) => o.event)).size}
          icon={<Calendar className="h-5 w-5" />}
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
            placeholder={t("admin.options.searchPlaceholder")}
            className="h-9 max-w-md"
          />
        </div>
      </div>

      <div className="mt-4">
        <PageStates
          state={state}
          missingPerms={["options.view"]}
          empty={
            <div className="rounded-2xl border border-dashed bg-muted/30 p-16 text-center text-sm text-muted-foreground">
              {t("admin.options.emptyDesc")}
            </div>
          }
        >
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(o) => o.id}
            onRowClick={has("options.update") ? openEdit : undefined}
            rowActions={
              has("options.update")
                ? (o) => (
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
                        <DropdownMenuItem onClick={() => openEdit(o)}>
                          <Pencil className="me-2 h-4 w-4" /> {t("admin.common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          destructive
                          title={t("admin.options.deleteTitle")}
                          confirmLabel={t("admin.common.delete")}
                          typeToConfirm={o.identifier}
                          onConfirm={() => removeOption(o)}
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
              <SheetTitle>{editing ? t("admin.common.edit") : t("admin.options.new")}</SheetTitle>
              <SheetDescription>{t("admin.options.subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="event">{t("admin.options.event")}</Label>
                <Input
                  id="event"
                  dir="ltr"
                  className="font-mono"
                  aria-invalid={!!form.formState.errors.event}
                  {...form.register("event")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identifier">{t("admin.options.identifier")}</Label>
                <Input
                  id="identifier"
                  dir="ltr"
                  className="font-mono"
                  aria-invalid={!!form.formState.errors.identifier}
                  {...form.register("identifier")}
                />
              </div>
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <Label className="font-medium">{t("admin.options.translations")}</Label>
                <div className="space-y-2">
                  <Label htmlFor="name_en" className="text-xs text-muted-foreground">
                    {t("admin.options.translationEn")}
                  </Label>
                  <Input
                    id="name_en"
                    dir="ltr"
                    aria-invalid={!!form.formState.errors.name_en}
                    {...form.register("name_en")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar" className="text-xs text-muted-foreground">
                    {t("admin.options.translationAr")}
                  </Label>
                  <Input
                    id="name_ar"
                    dir="rtl"
                    aria-invalid={!!form.formState.errors.name_ar}
                    {...form.register("name_ar")}
                  />
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
