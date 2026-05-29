import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save,
  Copy,
  Trash2,
  ArrowLeft,
  Plus,
  X,
  Image as ImageIcon,
  GripVertical,
  Wand2,
  Star,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { parseServerError, fieldMessage } from "@/lib/api/error";
import {
  createProduct,
  updateProduct,
  listCategories,
  listProperties,
  listPropertyValues,
  listVariants,
  listProductImages,
  listProductProperties,
  type Page,
  type ProductDetail,
  type CategoryItem,
  type PropertyItem,
  type PropertyValueItem,
  type Variant,
  type ProductImageItem,
  type ProductPropertyItem,
} from "@/lib/api/catalog.functions";

// FE product shape the editor consumes (was mock-data Product) — mapped from
// the BE ProductDetail by the edit route.
export interface Product {
  id: string;
  name: string;
  sku: string;
  store: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  variants: number;
  updated: string;
}

// Editor-local sub-collection row shapes (were mock/products). Variants /
// images / properties tabs edit these in local state and seed from live data
// in edit mode.
interface VariantRow {
  id: string;
  sku: string;
  modelNumber: string;
  attributes: string;
  originalPrice: number;
  price: number;
  discount: number;
  stock: number;
}
interface ImageRow {
  id: string;
  ml: boolean;
  gt: boolean;
  relaxation: boolean;
}
interface PropertyRow {
  id: string;
  property: string;
  value: string;
}

function unpage<T>(p: Page<T> | T[] | undefined): T[] {
  if (!p) return [];
  return Array.isArray(p) ? p : p.results;
}

interface Props {
  mode: "create" | "edit";
  product?: Product;
}

// Supported store languages (region setting); drives Translations tab blocks.
const LANGS = [
  { code: "en", labelKey: "auth.english", dir: "ltr" as const },
  { code: "ar", labelKey: "auth.arabic", dir: "rtl" as const },
];

const STATUSES = [
  "TEMPORARY",
  "PENDING",
  "AVAILABLE",
  "OUT_OF_STOCK",
  "SOLD_OUT",
  "DISCONTINTUED",
  "HIDDEN",
  "DECLINED",
  "PENDING_RESTOCK",
  "PREORDER",
  "ARCHIVED",
] as const;

// Only-legal-transitions map (§7.2 Basics). The current status is always allowed.
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  TEMPORARY: ["TEMPORARY", "PENDING", "AVAILABLE"],
  PENDING: ["PENDING", "AVAILABLE", "DECLINED"],
  AVAILABLE: ["AVAILABLE", "HIDDEN", "ARCHIVED", "OUT_OF_STOCK", "PREORDER"],
  HIDDEN: ["HIDDEN", "AVAILABLE", "ARCHIVED"],
  ARCHIVED: ["ARCHIVED", "AVAILABLE", "HIDDEN"],
  OUT_OF_STOCK: ["OUT_OF_STOCK", "AVAILABLE", "PENDING_RESTOCK", "HIDDEN"],
  SOLD_OUT: ["SOLD_OUT", "AVAILABLE", "PENDING_RESTOCK"],
  DISCONTINTUED: ["DISCONTINTUED", "ARCHIVED"],
  DECLINED: ["DECLINED", "PENDING"],
  PENDING_RESTOCK: ["PENDING_RESTOCK", "AVAILABLE"],
  PREORDER: ["PREORDER", "AVAILABLE", "HIDDEN"],
};

const schema = z
  .object({
    store_id: z.string().min(1, "Required"),
    category_id: z.string(),
    status: z.string().min(1, "Required"),
    list_price: z.coerce.number().min(0, "Must be ≥ 0"),
    name_en: z.string().min(1, "Required"),
    name_ar: z.string().min(1, "Required"),
    description_en: z.string().optional(),
    description_ar: z.string().optional(),
    width: z.coerce.number().min(0).optional(),
    width_unit: z.string(),
    height: z.coerce.number().min(0).optional(),
    height_unit: z.string(),
    length: z.coerce.number().min(0).optional(),
    length_unit: z.string(),
    weight: z.coerce.number().min(0).optional(),
    weight_unit: z.string(),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    seo_slug: z.string().optional(),
    og_image_asset_id: z.string().optional(),
    publish_at: z.string().optional(),
    unpublish_at: z.string().optional(),
    is_featured: z.boolean(),
  })
  .refine((v) => v.status !== "AVAILABLE" || v.category_id.length > 0, {
    path: ["category_id"],
    message: "Category required to make the product Available",
  });

type Values = z.infer<typeof schema>;

export function ProductEditor({ mode, product }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { role } = usePermissions();
  const staffOrAdmin = role === "admin" || role === "staff";
  const { stores, currentStoreId } = useApp();
  const queryClient = useQueryClient();

  // Live lookups feeding the editor's selects. Stores come from the picker;
  // categories / properties / property-values from the catalog endpoints.
  const STORE_NAMES = useMemo(() => stores.map((s) => s.id), [stores]);
  const storeLabel = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stores]);
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ data: { page_size: 200 } }),
    staleTime: 60 * 1000,
  });
  const CATEGORIES = useMemo<CategoryItem[]>(
    () => categoriesQuery.data?.results ?? [],
    [categoriesQuery.data],
  );
  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => listProperties(),
    staleTime: 60 * 1000,
  });
  const propertyValuesQuery = useQuery({
    queryKey: ["property-values"],
    queryFn: () => listPropertyValues(),
    staleTime: 60 * 1000,
  });
  // PROPERTIES: { id, key, values[] } — values resolved from property-values.
  const PROPERTIES = useMemo(() => {
    const valuesByProperty = new Map<number, string[]>();
    unpage<PropertyValueItem>(propertyValuesQuery.data).forEach((v) => {
      const list = valuesByProperty.get(v.property) ?? [];
      list.push(v.value);
      valuesByProperty.set(v.property, list);
    });
    return unpage<PropertyItem>(propertiesQuery.data).map((p) => ({
      id: String(p.id),
      key: p.key,
      values: valuesByProperty.get(p.id) ?? [],
    }));
  }, [propertiesQuery.data, propertyValuesQuery.data]);
  // TAGS suggestions come from the edited product's existing tags (no global
  // tag-suggestion endpoint); empty for a new product.
  const TAGS = useMemo<string[]>(() => [], []);

  // Edit-mode sub-collections, seeded from the live nested endpoints.
  const variantsQuery = useQuery({
    queryKey: ["product", product?.id, "variants"],
    queryFn: () => listVariants({ data: { productId: Number(product?.id) } }),
    enabled: mode === "edit" && !!product?.id,
  });
  const imagesQuery = useQuery({
    queryKey: ["product", product?.id, "images"],
    queryFn: () => listProductImages({ data: { productId: Number(product?.id) } }),
    enabled: mode === "edit" && !!product?.id,
  });
  const productPropsQuery = useQuery({
    queryKey: ["product", product?.id, "properties"],
    queryFn: () => listProductProperties({ data: { productId: Number(product?.id) } }),
    enabled: mode === "edit" && !!product?.id,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      store_id: product?.store ?? currentStoreId ?? "",
      category_id: product?.category ?? "",
      status: product?.status ?? "TEMPORARY",
      list_price: product?.price ?? 0,
      name_en: product?.name ?? "",
      name_ar: "",
      description_en: "",
      description_ar: "",
      width: undefined,
      width_unit: "cm",
      height: undefined,
      height_unit: "cm",
      length: undefined,
      length_unit: "cm",
      weight: undefined,
      weight_unit: "kg",
      seo_title: "",
      seo_description: "",
      seo_slug: "",
      og_image_asset_id: "",
      publish_at: "",
      unpublish_at: "",
      is_featured: false,
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

  const currentStatus = watch("status");
  const legalStatuses = LEGAL_TRANSITIONS[currentStatus] ?? STATUSES.slice();

  // Sub-collections (local editor state, seeded from live nested data once it
  // resolves in edit mode).
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [primaryImage, setPrimaryImage] = useState(0);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [chipInput, setChipInput] = useState("");

  const propLabelById = useMemo(() => {
    const m = new Map<number, string>();
    unpage<PropertyItem>(propertiesQuery.data).forEach((p) => m.set(p.id, p.key));
    return m;
  }, [propertiesQuery.data]);

  useEffect(() => {
    const live = unpage<Variant>(variantsQuery.data);
    if (live.length) {
      setVariants(
        live.map((v) => ({
          id: String(v.id),
          sku: v.sku ?? String(v.id),
          modelNumber: v.model_number ?? "",
          attributes: (v.attributes ?? [])
            .map((a) => `${a.property_key}: ${a.value_label}`)
            .join(", "),
          originalPrice: Number(v.original_price ?? 0),
          price: Number(v.price ?? 0),
          discount: Number(v.discount ?? 0),
          stock: v.stock ?? 0,
        })),
      );
    }
  }, [variantsQuery.data]);

  useEffect(() => {
    const live = unpage<ProductImageItem>(imagesQuery.data);
    if (live.length) {
      setImages(
        live.map((im) => ({
          id: String(im.id),
          ml: im.ml_creature_detection != null && im.ml_creature_detection !== "NONE",
          gt: im.gt_creature_detection != null && im.gt_creature_detection !== "NONE",
          relaxation: !!im.relaxation,
        })),
      );
    }
  }, [imagesQuery.data]);

  useEffect(() => {
    const live = unpage<ProductPropertyItem>(productPropsQuery.data);
    if (live.length) {
      setProperties(
        live.map((pp) => ({
          id: String(pp.id),
          property: pp.property_key ?? propLabelById.get(pp.property) ?? String(pp.property),
          value: pp.value_label ?? String(pp.value),
        })),
      );
    }
  }, [productPropsQuery.data, propLabelById]);

  const priceMin = variants.length
    ? Math.min(...variants.map((v) => v.price))
    : watch("list_price");
  const priceMax = variants.length
    ? Math.max(...variants.map((v) => v.price))
    : watch("list_price");
  const totalStock = variants.reduce((a, v) => a + v.stock, 0);

  // Resolve the category select value (a category NAME, per the existing JSX)
  // back to its numeric id for the BE write.
  function resolveCategoryId(catValue: string): number | undefined {
    if (!catValue) return undefined;
    const byName = CATEGORIES.find((c) => c.name === catValue);
    if (byName) return byName.id;
    const n = Number(catValue);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  function buildBody(v: Values, statusOverride?: string): Record<string, unknown> {
    const body: Record<string, unknown> = {
      store: v.store_id,
      category: resolveCategoryId(v.category_id),
      status: statusOverride ?? v.status,
      list_price: String(v.list_price),
      translations: [
        { language_code: "en", name: v.name_en, description: v.description_en ?? "" },
        { language_code: "ar", name: v.name_ar, description: v.description_ar ?? "" },
      ],
    };
    return body;
  }

  const saveMutation = useMutation({
    mutationFn: (args: { values: Values; statusOverride?: string }) => {
      const body = buildBody(args.values, args.statusOverride);
      return mode === "edit" && product?.id
        ? updateProduct({ data: { id: Number(product.id), body } })
        : createProduct({ data: body });
    },
    onSuccess: (_d, args) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(args.statusOverride ? t("products.draftSavedToast") : t("products.savedToast"));
      if (!args.statusOverride) navigate({ to: "/products" });
    },
    onError: (err) => {
      const info = parseServerError(err);
      (["store_id", "category_id", "status", "list_price", "name_en", "name_ar"] as const).forEach(
        (f) => {
          const beField =
            f === "store_id"
              ? "store"
              : f === "category_id"
                ? "category"
                : f === "list_price"
                  ? "list_price"
                  : f;
          const msg = fieldMessage(info.fieldErrors, beField);
          if (msg) setError(f, { message: msg });
        },
      );
      toast.error(info.message);
    },
  });

  function submit(asDraft: boolean, duplicate = false) {
    return handleSubmit((values) => {
      if (asDraft) {
        setValue("status", "TEMPORARY");
        saveMutation.mutate({ values, statusOverride: "TEMPORARY" });
        return;
      }
      if (duplicate) {
        toast.success(t("products.duplicatedToast"));
        navigate({ to: "/products/new" });
        return;
      }
      saveMutation.mutate({ values });
    });
  }

  function addChip(v: string) {
    const c = v.trim();
    if (c && !chips.includes(c)) setChips([...chips, c]);
    setChipInput("");
  }

  return (
    <div className="p-6">
      <PageHeader
        title={
          mode === "create" ? t("products.editorNewTitle") : (product?.name ?? t("common.edit"))
        }
        description={
          mode === "create"
            ? t("products.editorNewDesc")
            : `${t("products.colSku")} ${product?.sku} · ${product?.store}`
        }
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/products">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("products.backToList")}
              </Link>
            </Button>
            <Button variant="outline" onClick={submit(true)}>
              {t("products.saveDraft")}
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={isSubmitting}
              onClick={submit(false)}
            >
              <Save className="me-1.5 h-4 w-4" /> {t("products.save")}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="basics">
        <TabsList className="flex flex-wrap bg-muted/50">
          <TabsTrigger value="basics">{t("products.tabBasics")}</TabsTrigger>
          <TabsTrigger value="translations">{t("products.tabTranslations")}</TabsTrigger>
          <TabsTrigger value="pricing">{t("products.tabPricing")}</TabsTrigger>
          <TabsTrigger value="variants">{t("products.tabVariants")}</TabsTrigger>
          <TabsTrigger value="images">{t("products.tabImages")}</TabsTrigger>
          <TabsTrigger value="dimensions">{t("products.tabDimensions")}</TabsTrigger>
          <Can perm="properties.view">
            <TabsTrigger value="properties">{t("products.tabProperties")}</TabsTrigger>
          </Can>
          <Can perm="tags.update">
            <TabsTrigger value="tags">{t("products.tabTags")}</TabsTrigger>
          </Can>
          <TabsTrigger value="seo">{t("products.tabSeo")}</TabsTrigger>
          <TabsTrigger value="visibility">{t("products.tabVisibility")}</TabsTrigger>
        </TabsList>

        {/* ─── Basics ─────────────────────────────────────────────── */}
        <TabsContent value="basics" className="mt-6">
          <Card className="grid gap-6 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
            {staffOrAdmin && (
              <Field label={t("products.fStore")} required error={errors.store_id?.message}>
                <Controller
                  control={control}
                  name="store_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STORE_NAMES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {storeLabel.get(s) ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
            <Field
              label={t("products.fCategory")}
              required
              error={errors.category_id?.message}
              hint={t("products.categoryRequiredForAvailable")}
            >
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("products.allCategories")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label={t("products.fStatus")} error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} disabled={!legalStatuses.includes(s)}>
                          {t(`products.status${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label={t("products.fListPrice")} required error={errors.list_price?.message}>
              <div className="flex">
                <Input
                  type="number"
                  step="0.01"
                  className="rounded-e-none font-mono"
                  {...register("list_price")}
                />
                <span className="grid place-items-center rounded-e-md border border-s-0 bg-muted px-3 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
            </Field>
          </Card>
        </TabsContent>

        {/* ─── Translations ───────────────────────────────────────── */}
        <TabsContent value="translations" className="mt-6 space-y-4">
          {LANGS.map((l) => (
            <Card key={l.code} className="border-0 bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t(l.labelKey)}</h3>
                <Badge variant="outline">{l.code.toUpperCase()}</Badge>
              </div>
              <div className="grid gap-4">
                <Field
                  label={t("products.fName")}
                  required
                  error={l.code === "en" ? errors.name_en?.message : errors.name_ar?.message}
                >
                  <Input dir={l.dir} {...register(l.code === "en" ? "name_en" : "name_ar")} />
                </Field>
                <Field label={t("products.fDescription")}>
                  <Textarea
                    rows={4}
                    dir={l.dir}
                    placeholder={t("products.descriptionPlaceholder")}
                    {...register(l.code === "en" ? "description_en" : "description_ar")}
                  />
                </Field>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* ─── Pricing & Stock ────────────────────────────────────── */}
        <TabsContent value="pricing" className="mt-6">
          <Card className="border-0 bg-card p-6 shadow-soft">
            <div className="grid gap-4 md:grid-cols-4">
              <StatBox
                label={t("products.minVariantPrice")}
                value={`$${Number(priceMin || 0).toFixed(2)}`}
              />
              <StatBox
                label={t("products.maxVariantPrice")}
                value={`$${Number(priceMax || 0).toFixed(2)}`}
              />
              <StatBox label={t("products.variantsLabel")} value={String(variants.length)} />
              <StatBox label={t("products.totalStock")} value={String(totalStock)} />
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => toast.message(t("products.generateVariantsToast"))}
            >
              <Wand2 className="me-1.5 h-4 w-4" /> {t("products.generateVariants")}
            </Button>
          </Card>
        </TabsContent>

        {/* ─── Variants ───────────────────────────────────────────── */}
        <TabsContent value="variants" className="mt-6">
          <Can perm="products.update" fallback={<Locked t={t} />}>
            <Card className="overflow-hidden border-0 shadow-soft">
              <div className="flex items-center justify-between border-b p-5">
                <h3 className="font-display text-lg font-semibold">
                  {t("products.variantsHeading")}
                </h3>
                <VariantDialog
                  t={t}
                  onSave={(v) => {
                    setVariants((prev) => [...prev, v]);
                    toast.success(t("products.variantSaved"));
                  }}
                  trigger={
                    <Button size="sm">
                      <Plus className="me-1.5 h-4 w-4" /> {t("products.addVariant")}
                    </Button>
                  }
                />
              </div>
              {variants.length === 0 ? (
                <div className="grid h-28 place-items-center text-sm text-muted-foreground">
                  {t("products.noVariants")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t("products.colVariantSku")}</TableHead>
                      <TableHead>{t("products.colVariantAttrs")}</TableHead>
                      <TableHead>{t("products.colVariantModel")}</TableHead>
                      <TableHead className="text-end">{t("products.colVariantOriginal")}</TableHead>
                      <TableHead className="text-end">{t("products.colVariantPrice")}</TableHead>
                      <TableHead className="text-end">{t("products.colVariantDiscount")}</TableHead>
                      <TableHead className="text-end">{t("products.colVariantStock")}</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                        <TableCell className="text-sm">{v.attributes}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {v.modelNumber}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          ${v.originalPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">
                          ${v.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-end text-muted-foreground">
                          {v.discount}%
                        </TableCell>
                        <TableCell className="text-end font-mono tabular-nums">{v.stock}</TableCell>
                        <TableCell className="text-end">
                          <VariantDialog
                            t={t}
                            variant={v}
                            onSave={(nv) => {
                              setVariants((prev) => prev.map((x) => (x.id === v.id ? nv : x)));
                              toast.success(t("products.variantSaved"));
                            }}
                            trigger={
                              <Button size="sm" variant="ghost">
                                {t("common.edit")}
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            trigger={
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            }
                            destructive
                            title={t("products.deleteVariantTitle")}
                            description={t("products.deleteVariantDesc")}
                            confirmLabel={t("common.delete")}
                            onConfirm={() => {
                              setVariants((prev) => prev.filter((x) => x.id !== v.id));
                              toast.success(t("products.variantDeleted"));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Can>
        </TabsContent>

        {/* ─── Images ─────────────────────────────────────────────── */}
        <TabsContent value="images" className="mt-6">
          <Can perm="products.update" fallback={<Locked t={t} />}>
            <Card className="border-0 bg-card p-6 shadow-soft">
              <div className="grid gap-3 md:grid-cols-4">
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-xl border bg-card shadow-soft"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-muted/40 to-muted/10">
                      <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                      {primaryImage === i && (
                        <Badge className="absolute start-2 top-2">{t("products.primary")}</Badge>
                      )}
                      <GripVertical className="absolute end-2 top-2 h-4 w-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                    <div className="space-y-1.5 p-2.5">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <Badge
                          variant="outline"
                          className={
                            img.ml ? "border-warning/40 text-warning" : "text-muted-foreground"
                          }
                        >
                          ML {img.ml ? t("products.detected") : t("products.clear")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            img.gt ? "border-warning/40 text-warning" : "text-muted-foreground"
                          }
                        >
                          GT {img.gt ? t("products.detected") : t("products.clear")}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => setPrimaryImage(i)}
                        >
                          {t("products.markPrimary")}
                        </button>
                        <label
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                          title={t("products.relaxationHint")}
                        >
                          {t("products.relaxation")}
                          <Switch
                            checked={img.relaxation}
                            onCheckedChange={(v) =>
                              setImages((prev) =>
                                prev.map((x) => (x.id === img.id ? { ...x, relaxation: v } : x)),
                              )
                            }
                            className="scale-75"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Can perm="assets.upload">
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setImages((prev) => [
                      ...prev,
                      { id: `img_${Date.now()}`, ml: false, gt: false, relaxation: false },
                    ]);
                    toast.success(t("products.imageUploadToast"));
                  }}
                >
                  <Plus className="me-1.5 h-4 w-4" /> {t("products.uploadOrPick")}
                </Button>
              </Can>
            </Card>
          </Can>
        </TabsContent>

        {/* ─── Dimensions ─────────────────────────────────────────── */}
        <TabsContent value="dimensions" className="mt-6">
          <Can perm="products.update" fallback={<Locked t={t} />}>
            <Card className="grid gap-4 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
              <DimensionField
                label={t("products.fWidth")}
                field="width"
                unitField="width_unit"
                units={["cm", "in", "mm"]}
                register={register}
                control={control}
              />
              <DimensionField
                label={t("products.fHeight")}
                field="height"
                unitField="height_unit"
                units={["cm", "in", "mm"]}
                register={register}
                control={control}
              />
              <DimensionField
                label={t("products.fLength")}
                field="length"
                unitField="length_unit"
                units={["cm", "in", "mm"]}
                register={register}
                control={control}
              />
              <DimensionField
                label={t("products.fWeight")}
                field="weight"
                unitField="weight_unit"
                units={["kg", "g", "lb"]}
                register={register}
                control={control}
              />
            </Card>
          </Can>
        </TabsContent>

        {/* ─── Properties ─────────────────────────────────────────── */}
        <TabsContent value="properties" className="mt-6">
          <Can perm="properties.view" fallback={<Locked t={t} />}>
            <Card className="border-0 bg-card p-6 shadow-soft">
              {properties.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("products.noProperties")}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {properties.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border bg-background/40 p-3"
                    >
                      <Badge variant="outline" className="font-medium">
                        {r.property}
                      </Badge>
                      <span className="text-sm">{r.value}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ms-auto h-7 w-7"
                        onClick={() => {
                          setProperties((prev) => prev.filter((x) => x.id !== r.id));
                          toast.success(t("products.propertyRemoved"));
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <PropertyDialog
                t={t}
                propertyOptions={PROPERTIES}
                onSave={(p) => {
                  setProperties((prev) => [...prev, p]);
                  toast.success(t("products.propertyAdded"));
                }}
                trigger={
                  <Button variant="outline" className="mt-4">
                    <Plus className="me-1.5 h-4 w-4" /> {t("products.addProperty")}
                  </Button>
                }
              />
            </Card>
          </Can>
        </TabsContent>

        {/* ─── Tags ───────────────────────────────────────────────── */}
        <TabsContent value="tags" className="mt-6">
          <Can perm="tags.update" fallback={<Locked t={t} />}>
            <Card className="border-0 bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <Badge key={c} className="gap-1.5 px-3 py-1.5 text-xs">
                    {c}
                    <button
                      onClick={() => setChips(chips.filter((x) => x !== c))}
                      aria-label={`${t("common.remove")} ${c}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={chipInput}
                  onChange={(e) => setChipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChip(chipInput);
                    }
                  }}
                  placeholder={t("products.tagPlaceholder")}
                  className="h-8 w-48"
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t("products.suggestions")}:{" "}
                {TAGS.filter((tg) => !chips.includes(tg)).map((tg) => (
                  <button
                    key={tg}
                    onClick={() => setChips([...chips, tg])}
                    className="me-2 underline-offset-2 hover:underline"
                  >
                    {tg}
                  </button>
                ))}
              </p>
            </Card>
          </Can>
        </TabsContent>

        {/* ─── SEO ────────────────────────────────────────────────── */}
        <TabsContent value="seo" className="mt-6">
          <Card className="grid gap-4 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
            <Field label={t("products.seoTitle")}>
              <Input placeholder={t("products.seoTitlePlaceholder")} {...register("seo_title")} />
            </Field>
            <Field label={t("products.seoSlug")}>
              <Input
                className="font-mono"
                dir="ltr"
                placeholder={t("products.seoSlugPlaceholder")}
                {...register("seo_slug")}
              />
            </Field>
            <Field label={t("products.seoDescription")} className="md:col-span-2">
              <Textarea
                rows={3}
                placeholder={t("products.seoDescPlaceholder")}
                {...register("seo_description")}
              />
            </Field>
            <Field label={t("products.ogImage")}>
              <Input
                placeholder={t("products.ogImagePlaceholder")}
                {...register("og_image_asset_id")}
              />
            </Field>
          </Card>
        </TabsContent>

        {/* ─── Visibility ─────────────────────────────────────────── */}
        <TabsContent value="visibility" className="mt-6">
          <Card className="border-0 bg-card p-6 shadow-soft">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t("products.fStatus")}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} disabled={!legalStatuses.includes(s)}>
                            {t(`products.status${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label={t("products.publishAt")}>
                <Input type="datetime-local" {...register("publish_at")} />
              </Field>
              <Field label={t("products.unpublishAt")}>
                <Input type="datetime-local" {...register("unpublish_at")} />
              </Field>
            </div>
            {role === "admin" && (
              <div className="mt-6 flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="font-medium">{t("products.featured")}</p>
                    <p className="text-xs text-muted-foreground">{t("products.featuredHint")}</p>
                  </div>
                </div>
                <Controller
                  control={control}
                  name="is_featured"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom action bar (§7.2) */}
      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-card/95 p-3 shadow-soft backdrop-blur">
        {role === "admin" && (
          <span className="me-auto hidden text-xs text-muted-foreground sm:inline">
            {t("products.moveStoreHint")}
          </span>
        )}
        <Button variant="ghost" disabled={isSubmitting} onClick={submit(false, true)}>
          <Copy className="me-1.5 h-4 w-4" /> {t("products.saveDuplicate")}
        </Button>
        {mode === "edit" && (
          <Can perm="products.delete">
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-destructive">
                  <Trash2 className="me-1.5 h-4 w-4" /> {t("products.deleteProduct")}
                </Button>
              }
              destructive
              typeToConfirm={product?.name}
              title={t("products.deleteTitle")}
              description={t("products.deleteDesc")}
              confirmLabel={t("common.delete")}
              onConfirm={() => {
                toast.success(t("products.toastDeleted"));
                navigate({ to: "/products" });
              }}
            />
          </Can>
        )}
        <span className="mx-2 h-6 w-px bg-border" />
        <ConfirmDialog
          trigger={<Button variant="outline">{t("products.discard")}</Button>}
          title={t("products.discardTitle")}
          description={t("products.discardDesc")}
          confirmLabel={t("products.discard")}
          onConfirm={() => navigate({ to: "/products" })}
        />
        <Button
          className="bg-gradient-primary text-primary-foreground shadow-glow"
          disabled={isSubmitting}
          onClick={submit(false)}
        >
          <Save className="me-1.5 h-4 w-4" />{" "}
          {mode === "create" ? t("products.save") : t("products.saveChanges")}
        </Button>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
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
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/40 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Locked({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <Card className="border-0 bg-card p-10 text-center shadow-soft">
      <p className="text-sm text-muted-foreground">{t("states.forbiddenDesc")}</p>
    </Card>
  );
}

type DimField = "width" | "height" | "length" | "weight";
type DimUnitField = "width_unit" | "height_unit" | "length_unit" | "weight_unit";

function DimensionField({
  label,
  field,
  unitField,
  units,
  register,
  control,
}: {
  label: string;
  field: DimField;
  unitField: DimUnitField;
  units: string[];
  register: UseFormRegister<Values>;
  control: Control<Values>;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.01"
          className="font-mono"
          placeholder="0"
          {...register(field)}
        />
        <Controller
          control={control}
          name={unitField}
          render={({ field: f }) => (
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </Field>
  );
}

function VariantDialog({
  t,
  variant,
  onSave,
  trigger,
}: {
  t: ReturnType<typeof useT>;
  variant?: VariantRow;
  onSave: (v: VariantRow) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState(variant?.sku ?? "");
  const [modelNumber, setModelNumber] = useState(variant?.modelNumber ?? "");
  const [attributes, setAttributes] = useState(variant?.attributes ?? "");
  const [originalPrice, setOriginalPrice] = useState(String(variant?.originalPrice ?? ""));
  const [price, setPrice] = useState(String(variant?.price ?? ""));
  const [discount, setDiscount] = useState(String(variant?.discount ?? "0"));
  const [stock, setStock] = useState(String(variant?.stock ?? "0"));

  function save() {
    onSave({
      id: variant?.id ?? `v_${Date.now()}`,
      sku,
      modelNumber,
      attributes,
      originalPrice: Number(originalPrice) || 0,
      price: Number(price) || 0,
      discount: Number(discount) || 0,
      stock: Number(stock) || 0,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {variant ? t("products.editVariantTitle") : t("products.addVariantTitle")}
          </DialogTitle>
          <DialogDescription>{t("products.addVariantDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("products.colVariantSku")}>
            <Input className="font-mono" value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
          <Field label={t("products.fModelNumber")}>
            <Input
              className="font-mono"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
            />
          </Field>
          <Field label={t("products.fAttribute")} className="md:col-span-2">
            <Input
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
              placeholder="Weight: 250g"
            />
          </Field>
          <Field label={t("products.fOriginalPrice")}>
            <Input
              type="number"
              step="0.01"
              className="font-mono"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
            />
          </Field>
          <Field label={t("products.fPrice")}>
            <Input
              type="number"
              step="0.01"
              className="font-mono"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label={t("products.fDiscount")}>
            <Input
              type="number"
              className="font-mono"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
          <Field label={t("products.fStock")}>
            <Input
              type="number"
              className="font-mono"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={save}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PropertyDialog({
  t,
  propertyOptions,
  onSave,
  trigger,
}: {
  t: ReturnType<typeof useT>;
  propertyOptions: { id: string; key: string; values: string[] }[];
  onSave: (p: PropertyRow) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState("");
  const [value, setValue] = useState("");
  const selected = propertyOptions.find((p) => p.key === property);

  function save() {
    if (!property || !value) return;
    onSave({ id: `pp_${Date.now()}`, property, value });
    setProperty("");
    setValue("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("products.addProperty")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("products.fProperty")}>
            <Select
              value={property}
              onValueChange={(v) => {
                setProperty(v);
                setValue("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("products.chooseProperty")} />
              </SelectTrigger>
              <SelectContent>
                {propertyOptions.map((p) => (
                  <SelectItem key={p.id} value={p.key}>
                    {p.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("products.fValue")}>
            <Select value={value} onValueChange={setValue} disabled={!selected}>
              <SelectTrigger>
                <SelectValue placeholder={t("products.chooseValue")} />
              </SelectTrigger>
              <SelectContent>
                {(selected?.values ?? []).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={save}
          >
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
