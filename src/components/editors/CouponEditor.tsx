import { useState } from "react";
import { ArrowLeft, Save, Wand2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePermissions } from "@/components/shared/Can";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-context";
import { parseServerError, fieldMessage } from "@/lib/api/error";
import {
  createCoupon,
  updateCoupon,
  type Coupon,
  type CouponWriteInput,
} from "@/lib/api/coupons.functions";

// ENTRY 008: eligibility (categories / products / excluded / payment types) is
// an accepted-but-DROPPED placeholder on the BE — the Coupon model does not
// persist it. These option lists keep the §9.2 Eligibility tab rendering, but
// the values never round-trip. No category/product picker endpoint is wired
// because the backend would discard the selection anyway.
const CATEGORY_OPTIONS = ["Pantry", "Spices", "Sweets", "Beverages", "Olive Oil", "Honey & Jam"];
const PRODUCT_OPTIONS = [
  "Saffron Threads",
  "Cold-Pressed Olive Oil 1L",
  "Rose Water 500ml",
  "Sumac Powder 250g",
  "Pomegranate Molasses 750ml",
  "Pistachio Halva 400g",
  "Za'atar Premium Blend",
  "Tahini 600g",
];
const PAYMENT_TYPES = ["COD", "CC", "QR", "NS"] as const;

interface Props {
  mode: "create" | "edit";
  coupon?: Coupon;
  defaultScope?: "PLATFORM" | "STORE";
}

const schema = z
  .object({
    code: z.string().min(1).max(50),
    scope: z.enum(["PLATFORM", "STORE"]),
    store_id: z.string().optional(),
    discount_type: z.enum(["MONETARY", "PERCENTAGE"]),
    discount_value: z.coerce.number().min(0),
    capped_at: z.coerce.number().min(0).optional(),
    min_order_cost: z.coerce.number().min(0),
    min_num_items: z.coerce.number().int().min(0),
    applicable_categories: z.array(z.string()),
    applicable_products: z.array(z.string()),
    excluded_products: z.array(z.string()),
    new_customers_only: z.boolean(),
    eligible_payment_types: z.array(z.string()),
    max_uses: z.coerce.number().int().min(0),
    max_uses_per_user: z.coerce.number().int().min(0),
    is_valid: z.boolean(),
    starts_at: z.string().min(1),
    expires: z.string().min(1),
  })
  .refine((v) => v.scope !== "STORE" || !!v.store_id, {
    path: ["store_id"],
    message: "Required for store-scoped coupons",
  })
  .refine((v) => new Date(v.expires) > new Date(v.starts_at), {
    path: ["expires"],
    message: "expiresAfterStarts",
  });

type Values = z.infer<typeof schema>;

function genCode() {
  const words = ["SUMMER", "SAVE", "MIX", "FRESH", "DEAL", "BONUS"];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(10 + Math.random() * 89)}`;
}

// ISO datetime (with TZ) -> the datetime-local value the inputs expect.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  // Keep yyyy-MM-ddTHH:mm; drop seconds / timezone for the native input.
  return iso.slice(0, 16);
}

function num(s: string | number | null | undefined): number | undefined {
  if (s === null || s === undefined || s === "") return undefined;
  const n = typeof s === "number" ? s : parseFloat(String(s));
  return Number.isFinite(n) ? n : undefined;
}

export function CouponEditor({ mode, coupon, defaultScope }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const { stores } = useApp();
  const storeOptions = stores.map((s) => ({ id: s.id, name: s.name }));
  const canPlatform = has("coupons.create_platform");
  const [selectedPayments, setSelectedPayments] = useState<string[]>(["COD", "CC"]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: coupon?.code ?? "",
      scope: coupon?.scope ?? defaultScope ?? "STORE",
      store_id: coupon?.store_id ?? storeOptions[0]?.id ?? "",
      discount_type: coupon?.discount_type ?? "PERCENTAGE",
      discount_value: num(coupon?.discount_value) ?? 15,
      capped_at: num(coupon?.capped_at),
      min_order_cost: num(coupon?.min_order_cost) ?? 0,
      min_num_items: coupon?.min_num_items ?? 0,
      // ENTRY 008 placeholders (not persisted by the BE).
      applicable_categories: [],
      applicable_products: [],
      excluded_products: [],
      new_customers_only: false,
      eligible_payment_types: ["COD", "CC"],
      max_uses: coupon?.max_uses ?? 500,
      max_uses_per_user: coupon?.max_uses_per_user ?? 1,
      is_valid: coupon?.is_valid ?? true,
      starts_at: toLocalInput(coupon?.starts_at) || "2026-06-01T00:00",
      expires: toLocalInput(coupon?.expires) || "2026-12-31T23:59",
    },
  });
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const scope = watch("scope");
  const discountType = watch("discount_type");
  const code = watch("code");
  const discountValue = watch("discount_value");
  const startsAt = watch("starts_at");
  const expires = watch("expires");
  const minOrder = watch("min_order_cost");
  const minItems = watch("min_num_items");
  const newOnly = watch("new_customers_only");

  function togglePayment(p: string) {
    const next = selectedPayments.includes(p)
      ? selectedPayments.filter((x) => x !== p)
      : [...selectedPayments, p];
    setSelectedPayments(next);
    setValue("eligible_payment_types", next);
  }

  async function onSubmit(values: Values) {
    // ENTRY 008: eligibility + starts_at are sent but DROPPED by the BE.
    const payload: CouponWriteInput = {
      code: values.code,
      scope: values.scope,
      store_id: values.scope === "STORE" ? values.store_id : undefined,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      capped_at: values.discount_type === "PERCENTAGE" ? values.capped_at : undefined,
      min_order_cost: values.min_order_cost,
      min_num_items: values.min_num_items,
      max_uses: values.max_uses,
      max_uses_per_user: values.max_uses_per_user,
      is_valid: values.is_valid,
      starts_at: values.starts_at,
      expires: values.expires,
      eligible_category_ids: values.applicable_categories,
      eligible_product_ids: values.applicable_products,
      excluded_product_ids: values.excluded_products,
      new_customers_only: values.new_customers_only,
      eligible_payment_types: values.eligible_payment_types,
    };
    try {
      if (mode === "edit" && coupon) {
        await updateCoupon({ data: { ...payload, id: coupon.id } });
      } else {
        await createCoupon({ data: payload });
      }
      toast.success(t("finance.couponEditor.saved"));
      navigate({ to: "/coupons" });
    } catch (err) {
      const info = parseServerError(err);
      // Map server field errors onto the matching form fields.
      const fieldKeys: (keyof Values)[] = [
        "code",
        "discount_type",
        "discount_value",
        "capped_at",
        "min_order_cost",
        "min_num_items",
        "max_uses",
        "max_uses_per_user",
        "is_valid",
        "expires",
        "store_id",
      ];
      let mapped = false;
      for (const key of fieldKeys) {
        const msg = fieldMessage(info.fieldErrors, key as string);
        if (msg) {
          setError(key, { message: msg });
          mapped = true;
        }
      }
      if (!mapped) toast.error(info.message);
    }
  }

  const expiresError =
    errors.expires?.message === "expiresAfterStarts"
      ? t("finance.couponEditor.expiresAfterStarts")
      : errors.expires?.message;

  return (
    <div className="p-6">
      <PageHeader
        title={
          mode === "create"
            ? t("finance.couponEditor.createTitle")
            : t("finance.couponEditor.editTitle", { code: coupon?.code ?? "" })
        }
        description={t("finance.couponEditor.description")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/coupons">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("finance.couponEditor.backToCoupons")}
              </Link>
            </Button>
            <Button
              type="submit"
              form="coupon-form"
              disabled={isSubmitting}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="me-1.5 h-4 w-4" /> {t("finance.couponEditor.save")}
            </Button>
          </>
        }
      />

      <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Tabs defaultValue="basics">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="basics">{t("finance.couponEditor.tabBasics")}</TabsTrigger>
            <TabsTrigger value="eligibility">
              {t("finance.couponEditor.tabEligibility")}
            </TabsTrigger>
            <TabsTrigger value="limits">{t("finance.couponEditor.tabLimits")}</TabsTrigger>
            <TabsTrigger value="schedule">{t("finance.couponEditor.tabSchedule")}</TabsTrigger>
            <TabsTrigger value="preview">{t("finance.couponEditor.tabPreview")}</TabsTrigger>
          </TabsList>

          {/* Basics */}
          <TabsContent value="basics" className="mt-6">
            <Card className="grid gap-5 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
              <F label={t("finance.couponEditor.code")} required error={errors.code?.message}>
                <div className="flex gap-2">
                  <Input
                    dir="ltr"
                    className="font-mono uppercase"
                    placeholder={t("finance.couponEditor.codePlaceholder")}
                    aria-invalid={!!errors.code}
                    {...register("code")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue("code", genCode())}
                    aria-label={t("finance.couponEditor.autoGenerate")}
                    title={t("finance.couponEditor.autoGenerate")}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </F>
              <F label={t("finance.couponEditor.scope")} required>
                <Controller
                  control={control}
                  name="scope"
                  render={({ field }) => (
                    <RadioGroup
                      className="flex gap-6"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="STORE" /> {t("finance.coupons.scopeStore")}
                      </label>
                      <label
                        className={`flex items-center gap-2 text-sm ${canPlatform ? "" : "opacity-50"}`}
                      >
                        <RadioGroupItem value="PLATFORM" disabled={!canPlatform} />{" "}
                        {t("finance.coupons.scopePlatform")}
                      </label>
                    </RadioGroup>
                  )}
                />
              </F>
              {scope === "STORE" && (
                <F
                  label={t("finance.couponEditor.store")}
                  required
                  error={errors.store_id?.message}
                >
                  <Controller
                    control={control}
                    name="store_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={!!errors.store_id}>
                          <SelectValue placeholder={t("finance.couponEditor.storePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {storeOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </F>
              )}
              <F label={t("finance.couponEditor.discountType")} required>
                <Controller
                  control={control}
                  name="discount_type"
                  render={({ field }) => (
                    <RadioGroup
                      className="flex gap-6"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="MONETARY" /> {t("finance.couponEditor.typeMonetary")}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="PERCENTAGE" />{" "}
                        {t("finance.couponEditor.typePercentage")}
                      </label>
                    </RadioGroup>
                  )}
                />
              </F>
              <F
                label={t("finance.couponEditor.discountValue")}
                required
                error={errors.discount_value?.message}
              >
                <Input
                  dir="ltr"
                  type="number"
                  step="0.01"
                  className="font-mono"
                  aria-invalid={!!errors.discount_value}
                  {...register("discount_value")}
                />
              </F>
              {discountType === "PERCENTAGE" && (
                <F
                  label={t("finance.couponEditor.cappedAt")}
                  hint={t("finance.couponEditor.cappedHint")}
                  error={errors.capped_at?.message}
                >
                  <Input
                    dir="ltr"
                    type="number"
                    step="0.01"
                    placeholder={t("finance.couponEditor.optional")}
                    className="font-mono"
                    {...register("capped_at")}
                  />
                </F>
              )}
            </Card>
          </TabsContent>

          {/* Eligibility */}
          <TabsContent value="eligibility" className="mt-6">
            <Card className="grid gap-5 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
              <F
                label={t("finance.couponEditor.minOrderCost")}
                error={errors.min_order_cost?.message}
              >
                <Input
                  dir="ltr"
                  type="number"
                  step="0.01"
                  className="font-mono"
                  {...register("min_order_cost")}
                />
              </F>
              <F
                label={t("finance.couponEditor.minNumItems")}
                error={errors.min_num_items?.message}
              >
                <Input
                  dir="ltr"
                  type="number"
                  className="font-mono"
                  {...register("min_num_items")}
                />
              </F>
              <Controller
                control={control}
                name="applicable_categories"
                render={({ field }) => (
                  <F
                    label={t("finance.couponEditor.applicableCategories")}
                    className="md:col-span-2"
                  >
                    <ChipMulti
                      options={CATEGORY_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("finance.couponEditor.pickCategories")}
                    />
                  </F>
                )}
              />
              <Controller
                control={control}
                name="applicable_products"
                render={({ field }) => (
                  <F label={t("finance.couponEditor.applicableProducts")}>
                    <ChipMulti
                      options={PRODUCT_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("finance.couponEditor.searchProducts")}
                    />
                  </F>
                )}
              />
              <Controller
                control={control}
                name="excluded_products"
                render={({ field }) => (
                  <F label={t("finance.couponEditor.excludedProducts")}>
                    <ChipMulti
                      options={PRODUCT_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("finance.couponEditor.searchProducts")}
                    />
                  </F>
                )}
              />
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{t("finance.couponEditor.newCustomersOnly")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("finance.couponEditor.newCustomersHint")}
                  </p>
                </div>
                <Controller
                  control={control}
                  name="new_customers_only"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
              <F label={t("finance.couponEditor.eligiblePaymentTypes")} className="md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_TYPES.map((p) => (
                    <button type="button" key={p} onClick={() => togglePayment(p)}>
                      <Badge
                        variant="outline"
                        className={`cursor-pointer ${selectedPayments.includes(p) ? "border-primary/40 bg-primary/10 text-primary" : ""}`}
                      >
                        {p}
                      </Badge>
                    </button>
                  ))}
                </div>
              </F>
            </Card>
          </TabsContent>

          {/* Limits */}
          <TabsContent value="limits" className="mt-6">
            <Card className="grid gap-5 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
              <F
                label={t("finance.couponEditor.maxUses")}
                hint={t("finance.couponEditor.maxUsesHint")}
                error={errors.max_uses?.message}
              >
                <Input dir="ltr" type="number" className="font-mono" {...register("max_uses")} />
              </F>
              <F
                label={t("finance.couponEditor.maxUsesPerUser")}
                error={errors.max_uses_per_user?.message}
              >
                <Input
                  dir="ltr"
                  type="number"
                  className="font-mono"
                  {...register("max_uses_per_user")}
                />
              </F>
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{t("finance.couponEditor.isValid")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("finance.couponEditor.isValidHint")}
                  </p>
                </div>
                <Controller
                  control={control}
                  name="is_valid"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </Card>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule" className="mt-6">
            <Card className="grid gap-5 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
              <F
                label={t("finance.couponEditor.startsAt")}
                required
                error={errors.starts_at?.message}
              >
                <Input dir="ltr" type="datetime-local" {...register("starts_at")} />
              </F>
              <F label={t("finance.couponEditor.expires")} required error={expiresError}>
                <Input
                  dir="ltr"
                  type="datetime-local"
                  aria-invalid={!!errors.expires}
                  {...register("expires")}
                />
              </F>
            </Card>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="mt-6">
            <Card className="border-0 bg-gradient-surface p-8 shadow-soft">
              <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("finance.couponEditor.previewLabel")}
                </p>
                <p className="my-3 font-display text-4xl font-bold tracking-tight">
                  {code || "NEW-CODE"}
                </p>
                <p className="font-display text-xl text-primary">
                  {discountType === "PERCENTAGE"
                    ? `${discountValue || 0}%`
                    : `$${Number(discountValue || 0).toFixed(2)}`}{" "}
                  {t("finance.couponEditor.previewOff")}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {t("finance.couponEditor.previewValidFrom", {
                    from: startsAt.slice(0, 10),
                    to: expires.slice(0, 10),
                  })}
                </p>
                <div className="mt-5 border-t pt-4 text-start">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("finance.couponEditor.previewConditions")}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {Number(minOrder) > 0 && (
                      <li>
                        {t("finance.couponEditor.previewMinOrder", {
                          value: `$${Number(minOrder).toFixed(2)}`,
                        })}
                      </li>
                    )}
                    {Number(minItems) > 0 && (
                      <li>{t("finance.couponEditor.previewMinItems", { value: minItems })}</li>
                    )}
                    {newOnly && <li>{t("finance.couponEditor.previewNewOnly")}</li>}
                    {Number(minOrder) === 0 && Number(minItems) === 0 && !newOnly && (
                      <li className="text-muted-foreground">
                        {t("finance.couponEditor.previewNoConditions")}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}

function ChipMulti({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-background p-2">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <button type="button" key={v} onClick={() => onChange(value.filter((x) => x !== v))}>
              <Badge
                variant="outline"
                className="cursor-pointer border-primary/40 bg-primary/10 text-primary"
              >
                {v} ×
              </Badge>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="w-full text-start text-sm text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        {placeholder}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
          {options
            .filter((o) => !value.includes(o))
            .map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => {
                  onChange([...value, o]);
                }}
              >
                <Badge variant="outline" className="cursor-pointer">
                  {o}
                </Badge>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function F({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
