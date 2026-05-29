import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sliders, Check, Minus, Pencil } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
import {
  PROPERTIES_FULL,
  PROP_DATA_TYPES,
  PROP_FIELD_TYPES,
  type PropertyRow,
} from "@/lib/mock/catalog";

export const Route = createFileRoute("/_panel/properties")({
  head: () => ({ meta: [{ title: "Properties — Mixlebs Admin" }] }),
  component: PropertiesPage,
});

const LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

const schema = z.object({
  key: z.string().min(1).max(100),
  placeholder: z.string().max(255),
  is_multilingual: z.boolean(),
  is_multi_value: z.boolean(),
  is_attribute: z.boolean(),
  is_modifiable: z.boolean(),
  data_type: z.enum(["string", "number", "boolean", "date"]),
  field_type: z.enum(["text", "select", "multiselect", "toggle", "number"]),
});
type Values = z.infer<typeof schema>;

function PropertiesPage() {
  const t = useT();
  const state = usePageState();
  const { has } = usePermissions();
  const canEdit = has("properties.update");

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PropertyRow | "new" | null>(null);

  const filtered = useMemo(
    () => PROPERTIES_FULL.filter((p) => p.key.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  const Bool = ({ v }: { v: boolean }) =>
    v ? (
      <Check className="h-4 w-4 text-success" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground/50" />
    );

  const columns: Column<PropertyRow>[] = [
    {
      id: "key",
      header: t("catalog.properties.colKey"),
      sortValue: (r) => r.key,
      cell: (r) => <span className="font-medium">{r.key}</span>,
    },
    {
      id: "placeholder",
      header: t("catalog.properties.colPlaceholder"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.placeholder || "—"}</span>,
    },
    {
      id: "ml",
      header: t("catalog.properties.colMultilingual"),
      align: "center",
      cell: (r) => <Bool v={r.is_multilingual} />,
    },
    {
      id: "mv",
      header: t("catalog.properties.colMultiValue"),
      align: "center",
      cell: (r) => <Bool v={r.is_multi_value} />,
    },
    {
      id: "attr",
      header: t("catalog.properties.colAttribute"),
      align: "center",
      cell: (r) => <Bool v={r.is_attribute} />,
    },
    {
      id: "mod",
      header: t("catalog.properties.colModifiable"),
      align: "center",
      cell: (r) => <Bool v={r.is_modifiable} />,
    },
    {
      id: "dt",
      header: t("catalog.properties.colDataType"),
      sortValue: (r) => r.data_type,
      cell: (r) => (
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {r.data_type}
        </Badge>
      ),
    },
    {
      id: "ft",
      header: t("catalog.properties.colFieldType"),
      sortValue: (r) => r.field_type,
      cell: (r) => (
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {r.field_type}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("catalog.properties.title")}
        description={t("catalog.properties.desc")}
        actions={
          <Can perm="properties.update">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => setEditing("new")}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("catalog.properties.new")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("catalog.properties.kpiKeys")}
          value={PROPERTIES_FULL.length}
          icon={<Sliders className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("catalog.properties.kpiValues")}
          value={PROPERTIES_FULL.reduce((a, p) => a + p.values.length, 0)}
        />
        <KpiCard
          label={t("catalog.properties.kpiInUse")}
          value={PROPERTIES_FULL.reduce((a, p) => a + p.used, 0)}
          delta={t("catalog.properties.inUseDelta")}
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("catalog.properties.searchPh")}
          count={filtered.length}
          countLabel={t("catalog.properties.count")}
        />
      </div>

      <PageStates
        state={filtered.length === 0 && state === "populated" ? "empty" : state}
        skeleton={<TableSkeleton rows={5} cols={8} />}
        missingPerms={["properties.view"]}
        empty={
          <EmptyState
            icon={<Sliders className="h-6 w-6" />}
            title={t("catalog.properties.emptyTitle")}
            description={t("catalog.properties.emptyDesc")}
          />
        }
      >
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          onRowClick={canEdit ? (r) => setEditing(r) : undefined}
          rowActions={
            canEdit
              ? (r) => (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditing(r)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )
              : undefined
          }
        />
      </PageStates>

      <PropertyEditor
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        property={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function PropertyEditor({
  open,
  property,
  onClose,
}: {
  open: boolean;
  property: PropertyRow | null;
  onClose: () => void;
}) {
  const t = useT();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      key: property?.key ?? "",
      placeholder: property?.placeholder ?? "",
      is_multilingual: property?.is_multilingual ?? false,
      is_multi_value: property?.is_multi_value ?? false,
      is_attribute: property?.is_attribute ?? false,
      is_modifiable: property?.is_modifiable ?? true,
      data_type: property?.data_type ?? "string",
      field_type: property?.field_type ?? "text",
    },
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  function submit(_v: Values) {
    toast.success(t("catalog.properties.saved"));
    onClose();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          reset();
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {property ? t("catalog.properties.editorEdit") : t("catalog.properties.editorNew")}
          </SheetTitle>
          <SheetDescription>{t("catalog.properties.desc")}</SheetDescription>
        </SheetHeader>

        <form
          id="property-form"
          onSubmit={handleSubmit(submit)}
          noValidate
          className="mt-4 flex-1 space-y-5"
        >
          <Fld label={t("catalog.properties.fKey")} error={errors.key?.message}>
            <Input {...register("key")} aria-invalid={!!errors.key} />
          </Fld>
          <Fld label={t("catalog.properties.fPlaceholder")}>
            <Input {...register("placeholder")} />
          </Fld>

          <div className="grid grid-cols-2 gap-4">
            <Fld label={t("catalog.properties.fDataType")}>
              <Controller
                control={control}
                name="data_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROP_DATA_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Fld>
            <Fld label={t("catalog.properties.fFieldType")}>
              <Controller
                control={control}
                name="field_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROP_FIELD_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Fld>
          </div>

          <div>
            <h4 className="mb-2 font-display text-sm font-semibold">
              {t("catalog.properties.flagsTitle")}
            </h4>
            <div className="space-y-1">
              <FlagRow
                control={control}
                name="is_multilingual"
                label={t("catalog.properties.fMultilingual")}
              />
              <FlagRow
                control={control}
                name="is_multi_value"
                label={t("catalog.properties.fMultiValue")}
              />
              <FlagRow
                control={control}
                name="is_attribute"
                label={t("catalog.properties.fAttribute")}
              />
              <FlagRow
                control={control}
                name="is_modifiable"
                label={t("catalog.properties.fModifiable")}
              />
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-display text-sm font-semibold">
              {t("catalog.properties.fKey")} — {t("catalog.categories.translations")}
            </h4>
            <div className="space-y-2">
              {LANGS.map((l) => {
                const tr = property?.translations.find((x) => x.lang === l.code);
                return (
                  <div key={l.code} className="flex items-center gap-2">
                    <span className="w-8 font-mono text-xs uppercase text-muted-foreground">
                      {l.code}
                    </span>
                    <Input
                      dir={l.code === "ar" ? "rtl" : "ltr"}
                      defaultValue={tr?.label ?? ""}
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
            form="property-form"
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

function FlagRow({
  control,
  name,
  label,
}: {
  control: ReturnType<typeof useForm<Values>>["control"];
  name: keyof Values;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/40 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />}
      />
    </div>
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
