import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  Globe2,
  Store as StoreIcon,
  Plus,
  X,
  ImagePlus,
  FlaskConical,
  GripVertical,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { parseServerError, fieldMessage } from "@/lib/api/error";
import {
  createCollection,
  updateCollection,
  DISPLAY_STYLES,
  type CollectionRow,
} from "@/lib/api/collections.functions";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z
  .object({
    title: z.string().min(1).max(255),
    slug: z.string().min(1).max(255).regex(SLUG),
    description: z.string().max(2000),
    collection_type: z.enum(["manual", "smart"]),
    scope: z.enum(["STORE", "PLATFORM"]),
    store_id: z.string(),
    display_style: z.enum(["carousel", "grid", "hero", "banner", "list"]),
    priority: z.coerce.number().int().min(0),
    metadata: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    is_active: z.boolean(),
  })
  .refine((v) => v.scope !== "STORE" || v.store_id.length > 0, {
    path: ["store_id"],
    message: "Required",
  });

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/_panel/collections/new")({
  head: () => ({ meta: [{ title: "New collection — Mixlebs Admin" }] }),
  validateSearch: (s: Record<string, unknown>): { scope?: "STORE" | "PLATFORM" } => ({
    scope: s.scope === "PLATFORM" ? "PLATFORM" : s.scope === "STORE" ? "STORE" : undefined,
  }),
  component: NewCollection,
});

function NewCollection() {
  const { scope } = Route.useSearch();
  return <CollectionEditor mode="create" initialScope={scope} />;
}

export function CollectionEditor({
  mode,
  value,
  initialScope,
}: {
  mode: "create" | "edit";
  value?: CollectionRow;
  initialScope?: "STORE" | "PLATFORM";
}) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const { stores } = useApp();
  const canPlatform = has("collections.create_platform");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: value?.title ?? "",
      slug: value?.slug ?? "",
      description: value?.description ?? "",
      collection_type:
        value?.collection_type === "smart" || value?.collection_type === "manual"
          ? value.collection_type
          : "manual",
      scope: value?.scope ?? initialScope ?? (canPlatform ? "PLATFORM" : "STORE"),
      store_id: value?.store ?? "",
      display_style:
        (value?.display_style as Values["display_style"]) ?? "grid",
      priority: value?.priority ?? 0,
      metadata: value?.metadata ? JSON.stringify(value.metadata) : "",
      starts_at: value?.starts_at ?? "",
      ends_at: value?.ends_at ?? "",
      is_active: value?.is_active ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = form;
  const collectionType = watch("collection_type");
  const currentScope = watch("scope");

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      let metadata: Record<string, unknown> = {};
      if (values.metadata.trim()) {
        try {
          metadata = JSON.parse(values.metadata) as Record<string, unknown>;
        } catch {
          metadata = {};
        }
      }
      const body: Record<string, unknown> = {
        title: values.title,
        slug: values.slug,
        description: values.description,
        collection_type: values.collection_type,
        scope: values.scope === "STORE" ? "store" : "global",
        store: values.scope === "STORE" ? values.store_id : null,
        display_style: values.display_style,
        priority: values.priority,
        metadata,
        starts_at: values.starts_at ? values.starts_at : null,
        ends_at: values.ends_at ? values.ends_at : null,
        is_active: values.is_active,
      };
      return mode === "edit" && value
        ? updateCollection({ data: { id: Number(value.id), body } })
        : createCollection({ data: body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success(t("catalog.colEditor.saved"));
      void navigate({ to: "/collections" });
    },
    onError: (err) => {
      const info = parseServerError(err);
      (["title", "slug", "description", "priority"] as const).forEach((f) => {
        const msg = fieldMessage(info.fieldErrors, f);
        if (msg) setError(f, { message: msg });
      });
      const storeMsg = fieldMessage(info.fieldErrors, "store");
      if (storeMsg) setError("store_id", { message: storeMsg });
      toast.error(info.message);
    },
  });

  function onSubmit(values: Values) {
    mutation.mutate(values);
  }

  return (
    <div className="p-6">
      <PageHeader
        title={
          mode === "create"
            ? t("catalog.colEditor.newTitle")
            : `${t("catalog.colEditor.editTitle")} — ${value?.title}`
        }
        description={t("catalog.colEditor.desc")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/collections">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("catalog.colEditor.back")}
              </Link>
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || mutation.isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="me-1.5 h-4 w-4" /> {t("common.save")}
            </Button>
          </>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="border-0 bg-card p-2 shadow-soft">
          <Tabs defaultValue="basics">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="basics">{t("catalog.colEditor.tabBasics")}</TabsTrigger>
              <TabsTrigger value="rules">{t("catalog.colEditor.tabRules")}</TabsTrigger>
              <TabsTrigger value="products">{t("catalog.colEditor.tabProducts")}</TabsTrigger>
              <TabsTrigger value="schedule">{t("catalog.colEditor.tabSchedule")}</TabsTrigger>
            </TabsList>

            {/* BASICS */}
            <TabsContent value="basics" className="mt-5 grid gap-6 p-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <Fld label={t("catalog.colEditor.fTitle")} error={errors.title?.message}>
                  <Input {...register("title")} aria-invalid={!!errors.title} />
                </Fld>
                <Fld
                  label={t("catalog.colEditor.fSlug")}
                  hint={t("catalog.colEditor.slugHint")}
                  error={errors.slug?.message}
                >
                  <Input
                    dir="ltr"
                    className="font-mono"
                    {...register("slug")}
                    aria-invalid={!!errors.slug}
                  />
                </Fld>
                <Fld label={t("catalog.colEditor.fDescription")}>
                  <Textarea rows={4} {...register("description")} />
                </Fld>
                <Fld label={t("catalog.colEditor.fType")}>
                  <Controller
                    control={control}
                    name="collection_type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">
                            {t("catalog.colEditor.typeManual")}
                          </SelectItem>
                          <SelectItem value="smart">{t("catalog.colEditor.typeSmart")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Fld>

                <details className="rounded-xl border bg-muted/20 p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {t("catalog.colEditor.advanced")}
                  </summary>
                  <div className="mt-3">
                    <Fld
                      label={t("catalog.colEditor.fMetadata")}
                      hint={t("catalog.colEditor.metadataHint")}
                    >
                      <Textarea
                        rows={4}
                        dir="ltr"
                        className="font-mono text-xs"
                        placeholder="{}"
                        {...register("metadata")}
                      />
                    </Fld>
                  </div>
                </details>
              </div>

              <aside className="space-y-6">
                <Card className="border bg-background/40 p-5 shadow-soft">
                  <h3 className="mb-3 font-display text-base font-semibold">
                    {t("catalog.colEditor.fScope")}
                  </h3>
                  <Controller
                    control={control}
                    name="scope"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <ScopeOption
                          icon={<StoreIcon className="h-4 w-4" />}
                          title={t("catalog.colEditor.scopeStore")}
                          subtitle={t("catalog.colEditor.scopeStoreSub")}
                          checked={field.value === "STORE"}
                          onSelect={() => field.onChange("STORE")}
                        />
                        <ScopeOption
                          icon={<Globe2 className="h-4 w-4" />}
                          title={t("catalog.colEditor.scopePlatform")}
                          subtitle={t("catalog.colEditor.scopePlatformSub")}
                          checked={field.value === "PLATFORM"}
                          disabled={!canPlatform}
                          onSelect={() => canPlatform && field.onChange("PLATFORM")}
                        />
                      </div>
                    )}
                  />
                  {!canPlatform && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("catalog.colEditor.scopeLockedHint")}
                    </p>
                  )}
                  {currentScope === "STORE" && (
                    <div className="mt-4">
                      <Fld label={t("catalog.colEditor.fStore")} error={errors.store_id?.message}>
                        <Controller
                          control={control}
                          name="store_id"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger aria-invalid={!!errors.store_id}>
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
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
                    </div>
                  )}
                </Card>

                <Card className="border bg-background/40 p-5 shadow-soft">
                  <h3 className="mb-3 font-display text-base font-semibold">
                    {t("catalog.colEditor.fDisplay")}
                  </h3>
                  <Controller
                    control={control}
                    name="display_style"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISPLAY_STYLES.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <div className="mt-4">
                    <Fld
                      label={t("catalog.colEditor.fPriority")}
                      hint={t("catalog.colEditor.priorityHint")}
                    >
                      <Input type="number" dir="ltr" {...register("priority")} />
                    </Fld>
                  </div>
                </Card>

                <Card className="border bg-background/40 p-5 shadow-soft">
                  <div className="grid grid-cols-2 gap-3">
                    <Uploader
                      label={t("catalog.colEditor.fThumbnail")}
                      hint={t("catalog.colEditor.uploaderHint")}
                    />
                    <Uploader
                      label={t("catalog.colEditor.fBanner")}
                      hint={t("catalog.colEditor.uploaderHint")}
                    />
                  </div>
                </Card>
              </aside>
            </TabsContent>

            {/* RULES */}
            <TabsContent value="rules" className="mt-5 p-4">
              {collectionType !== "smart" ? (
                <p className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                  {t("catalog.colEditor.rulesOnlySmart")}
                </p>
              ) : (
                <RuleBuilder />
              )}
            </TabsContent>

            {/* PRODUCTS */}
            <TabsContent value="products" className="mt-5 p-4">
              {collectionType !== "manual" ? (
                <p className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                  {t("catalog.colEditor.productsOnlyManual")}
                </p>
              ) : (
                <ProductsPicker />
              )}
            </TabsContent>

            {/* SCHEDULE */}
            <TabsContent value="schedule" className="mt-5 max-w-md space-y-5 p-4">
              <p className="text-sm text-muted-foreground">{t("catalog.colEditor.scheduleHint")}</p>
              <Fld label={t("catalog.colEditor.fStartsAt")}>
                <Input type="datetime-local" dir="ltr" {...register("starts_at")} />
              </Fld>
              <Fld label={t("catalog.colEditor.fEndsAt")}>
                <Input type="datetime-local" dir="ltr" {...register("ends_at")} />
              </Fld>
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm font-medium">{t("catalog.colEditor.fIsActive")}</span>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </form>
    </div>
  );
}

interface Rule {
  field: string;
  op: string;
  value: string;
}

function RuleBuilder() {
  const t = useT();
  const [rules, setRules] = useState<Rule[]>([{ field: "category", op: "eq", value: "" }]);
  const [preview, setPreview] = useState<number | null>(null);

  const fields: [string, string][] = [
    ["category", t("catalog.colEditor.fieldCategory")],
    ["tag", t("catalog.colEditor.fieldTag")],
    ["price", t("catalog.colEditor.fieldPrice")],
    ["stock", t("catalog.colEditor.fieldStock")],
    ["store", t("catalog.colEditor.fieldStore")],
    ["attribute", t("catalog.colEditor.fieldAttribute")],
    ["created", t("catalog.colEditor.fieldCreated")],
  ];
  const ops: [string, string][] = [
    ["eq", t("catalog.colEditor.opEq")],
    ["neq", t("catalog.colEditor.opNeq")],
    ["gt", t("catalog.colEditor.opGt")],
    ["lt", t("catalog.colEditor.opLt")],
    ["in", t("catalog.colEditor.opIn")],
  ];

  function update(i: number, patch: Partial<Rule>) {
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">{t("catalog.colEditor.ruleBuilder")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("catalog.colEditor.ruleBuilderHint")}
        </p>
      </div>
      <div className="space-y-2">
        {rules.map((r, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-xl border bg-background/40 p-3"
          >
            <Select value={r.field} onValueChange={(v) => update(i, { field: v })}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={r.op} onValueChange={(v) => update(i, { op: v })}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={r.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder={t("catalog.colEditor.ruleValue")}
              className="h-9 min-w-[120px] flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive"
              onClick={() => setRules((rs) => rs.filter((_, idx) => idx !== i))}
              aria-label={t("catalog.colEditor.removeRule")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRules((rs) => [...rs, { field: "category", op: "eq", value: "" }])}
        >
          <Plus className="me-1 h-3.5 w-3.5" /> {t("catalog.colEditor.addRule")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const n = 12 + rules.length * 3;
            setPreview(n);
            toast.success(t("catalog.colEditor.testRulesRan", { n }));
          }}
        >
          <FlaskConical className="me-1 h-3.5 w-3.5" /> {t("catalog.colEditor.testRules")}
        </Button>
      </div>
      {preview !== null && (
        <Card className="border bg-background/40 p-4 shadow-soft">
          <p className="text-sm font-medium">{t("catalog.colEditor.rulePreview")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("catalog.colEditor.testRulesRan", { n: preview })}
          </p>
        </Card>
      )}
    </div>
  );
}

interface PickedProduct {
  id: string;
  name: string;
  position: number;
  score: number;
  pinned: boolean;
}

function ProductsPicker() {
  const t = useT();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<PickedProduct[]>([
    { id: "p_1", name: "Saffron Threads", position: 1, score: 90, pinned: true },
    { id: "p_2", name: "Cold-Pressed Olive Oil", position: 2, score: 70, pinned: false },
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">{t("catalog.colEditor.productsHint")}</p>
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("catalog.colEditor.productPickerPh")}
          className="h-9 max-w-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() =>
            setPicked((p) => [
              ...p,
              {
                id: `p_${p.length + 1}`,
                name: q || "New product",
                position: p.length + 1,
                score: 50,
                pinned: false,
              },
            ])
          }
        >
          <Plus className="me-1 h-3.5 w-3.5" /> {t("catalog.colEditor.addProducts")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("catalog.colEditor.reorderHint")}</p>
      {picked.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
          {t("catalog.colEditor.noProducts")}
        </p>
      ) : (
        <div className="space-y-2">
          {picked.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border bg-background/40 p-3"
            >
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <span className="w-8 font-mono text-sm tabular-nums text-muted-foreground">
                #{p.position}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("catalog.colEditor.colScore")}
                </Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={p.score}
                  onChange={(e) =>
                    setPicked((ps) =>
                      ps.map((x) => (x.id === p.id ? { ...x, score: Number(e.target.value) } : x)),
                    )
                  }
                  className="h-8 w-20"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={p.pinned ? "h-8 w-8 text-primary" : "h-8 w-8 text-muted-foreground"}
                onClick={() =>
                  setPicked((ps) =>
                    ps.map((x) => (x.id === p.id ? { ...x, pinned: !x.pinned } : x)),
                  )
                }
                aria-label={t("catalog.colEditor.colPinned")}
              >
                {p.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => setPicked((ps) => ps.filter((x) => x.id !== p.id))}
                aria-label={t("common.remove")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Fld({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Uploader({ label, hint }: { label: string; hint: string }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <button
        type="button"
        className="grid aspect-square w-full place-items-center gap-1 rounded-xl border border-dashed bg-muted/30 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      >
        <ImagePlus className="h-6 w-6" />
        <span className="px-2 text-center text-[10px] leading-tight">{hint}</span>
      </button>
    </div>
  );
}

function ScopeOption({
  icon,
  title,
  subtitle,
  checked,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-start transition ${checked ? "border-primary bg-primary/5" : ""} ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/40"}`}
    >
      <span className="mt-0.5">{icon}</span>
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {disabled && (
            <Badge variant="outline" className="text-[9px]">
              🔒
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
