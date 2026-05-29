import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles, Pencil } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { usePageState } from "@/lib/page-state";
import { useApp } from "@/lib/app-context";
import { PROPERTY_VALUES, PROPERTIES_FULL, type PropertyValueRow } from "@/lib/mock/catalog";

export const Route = createFileRoute("/_panel/property-values")({
  head: () => ({ meta: [{ title: "Property values — Mixlebs Admin" }] }),
  component: PropertyValuesPage,
});

const LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

const schema = z.object({
  store_id: z.string(),
  property_id: z.string().min(1),
  value: z.string().min(1).max(255),
});
type Values = z.infer<typeof schema>;

function PropertyValuesPage() {
  const t = useT();
  const state = usePageState();
  const { role } = usePermissions();
  const isStore = role === "store";
  const canSeeStore = role === "admin" || role === "staff";

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PropertyValueRow | "new" | null>(null);

  const filtered = useMemo(
    () =>
      PROPERTY_VALUES.filter((v) =>
        `${v.property} ${v.value}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  const columns: Column<PropertyValueRow>[] = [
    {
      id: "property",
      header: t("catalog.propertyValues.colProperty"),
      sortValue: (r) => r.property,
      cell: (r) => <span className="font-medium">{r.property}</span>,
    },
    {
      id: "value",
      header: t("catalog.propertyValues.colValue"),
      sortValue: (r) => r.value,
      cell: (r) => <span>{r.value}</span>,
    },
    ...(canSeeStore
      ? [
          {
            id: "store",
            header: t("catalog.propertyValues.colStore"),
            cell: (r: PropertyValueRow) =>
              r.store ? (
                <span className="text-sm text-muted-foreground">{r.store}</span>
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {t("catalog.propertyValues.platformValue")}
                </Badge>
              ),
          } as Column<PropertyValueRow>,
        ]
      : []),
    {
      id: "translations",
      header: t("catalog.propertyValues.colTranslations"),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.translations.map((tr) => (
            <Badge key={tr.lang} variant="outline" className="font-mono text-[10px]">
              <span className="uppercase opacity-60">{tr.lang}</span>&nbsp;{tr.value}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("catalog.propertyValues.title")}
        description={t("catalog.propertyValues.desc")}
        actions={
          <Can perm="properties.create_value">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => setEditing("new")}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("catalog.propertyValues.add")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("catalog.propertyValues.kpiKeys")}
          value={PROPERTIES_FULL.length}
          icon={<Sparkles className="h-5 w-5" />}
          accent
        />
        <KpiCard label={t("catalog.propertyValues.kpiValues")} value={PROPERTY_VALUES.length} />
        <KpiCard
          label={t("catalog.propertyValues.kpiStoreScoped")}
          value={PROPERTY_VALUES.filter((v) => v.store).length}
          delta={t("catalog.propertyValues.storeScopedDelta")}
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("catalog.propertyValues.searchPh")}
          count={filtered.length}
          countLabel={t("catalog.propertyValues.count")}
        />
      </div>

      <PageStates
        state={filtered.length === 0 && state === "populated" ? "empty" : state}
        skeleton={<TableSkeleton rows={5} cols={4} />}
        missingPerms={["properties.view"]}
        empty={
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={t("catalog.propertyValues.emptyTitle")}
            description={t("catalog.propertyValues.emptyDesc")}
          />
        }
      >
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          onRowClick={(r) => setEditing(r)}
          rowActions={(r) => (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditing(r)}
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        />
      </PageStates>

      <ValueEditor
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        value={editing === "new" ? null : editing}
        isStore={isStore}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ValueEditor({
  open,
  value,
  isStore,
  onClose,
}: {
  open: boolean;
  value: PropertyValueRow | null;
  isStore: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const { stores, currentStoreId } = useApp();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      store_id: isStore ? (currentStoreId ?? "") : value?.store ? "str_01" : "",
      property_id: PROPERTIES_FULL.find((p) => p.key === value?.property)?.id ?? "",
      value: value?.value ?? "",
    },
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = form;

  function submit(_v: Values) {
    toast.success(t("catalog.propertyValues.saved"));
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {value ? t("catalog.propertyValues.editorEdit") : t("catalog.propertyValues.editorNew")}
          </SheetTitle>
          <SheetDescription>{t("catalog.propertyValues.desc")}</SheetDescription>
        </SheetHeader>

        <form
          id="value-form"
          onSubmit={handleSubmit(submit)}
          noValidate
          className="mt-4 flex-1 space-y-5"
        >
          {!isStore && (
            <Fld label={t("catalog.propertyValues.fStore")}>
              <Controller
                control={control}
                name="store_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("catalog.propertyValues.platformValue")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("catalog.propertyValues.platformValue")}</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Fld>
          )}

          <Fld label={t("catalog.propertyValues.fProperty")} error={errors.property_id?.message}>
            <Controller
              control={control}
              name="property_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={!!errors.property_id}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTIES_FULL.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Fld>

          <Fld label={t("catalog.propertyValues.fValue")} error={errors.value?.message}>
            <Input {...register("value")} aria-invalid={!!errors.value} />
          </Fld>

          <div>
            <h4 className="mb-2 font-display text-sm font-semibold">
              {t("catalog.propertyValues.translations")}
            </h4>
            <div className="space-y-2">
              {LANGS.map((l) => {
                const tr = value?.translations.find((x) => x.lang === l.code);
                return (
                  <div key={l.code} className="flex items-center gap-2">
                    <span className="w-8 font-mono text-xs uppercase text-muted-foreground">
                      {l.code}
                    </span>
                    <Input
                      dir={l.code === "ar" ? "rtl" : "ltr"}
                      defaultValue={tr?.value ?? ""}
                      className="h-9"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form="value-form"
            disabled={isSubmitting}
            className="bg-gradient-primary text-primary-foreground"
          >
            {t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Fld({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
