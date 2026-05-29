import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Package,
  AlertTriangle,
  EyeOff,
  Upload,
  Download,
  X,
  Star,
  Image as ImageIcon,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { CATEGORIES, TAGS } from "@/lib/mock-data";
import { PRODUCT_ROWS, PRODUCT_STATUSES, STORE_NAMES, type ProductRow } from "@/lib/mock/products";

export const Route = createFileRoute("/_panel/products")({
  head: () => ({ meta: [{ title: "Products — Mixlebs Admin" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { role, has } = usePermissions();
  const state = usePageState();
  const staffOrAdmin = role === "admin" || role === "staff";

  // Filters (§7.1)
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("ALL");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [store, setStore] = useState("ALL");
  const [tagChips, setTagChips] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [hasImageOnly, setHasImageOnly] = useState(false);
  const [tab, setTab] = useState("ALL");

  function clearFilters() {
    setQ("");
    setCategory("ALL");
    setStatuses([]);
    setStore("ALL");
    setTagChips([]);
    setPriceMin("");
    setPriceMax("");
    setStockMin("");
    setStockMax("");
    setCreatedFrom("");
    setCreatedTo("");
    setHasImageOnly(false);
    setTab("ALL");
  }

  const filtered = useMemo(() => {
    return PRODUCT_ROWS.filter((p) => {
      if (tab === "AVAILABLE" && p.status !== "AVAILABLE") return false;
      if (tab === "HIDDEN" && p.status !== "HIDDEN") return false;
      if (tab === "ARCHIVED" && p.status !== "ARCHIVED") return false;
      if (
        q &&
        !`${p.name} ${p.sku} ${p.modelNumber} ${p.tags.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      if (category !== "ALL" && p.category !== category) return false;
      if (statuses.length && !statuses.includes(p.status)) return false;
      if (staffOrAdmin && store !== "ALL" && p.store !== store) return false;
      if (tagChips.length && !tagChips.every((c) => p.tags.includes(c))) return false;
      if (priceMin && p.price < Number(priceMin)) return false;
      if (priceMax && p.price > Number(priceMax)) return false;
      if (stockMin && p.stock < Number(stockMin)) return false;
      if (stockMax && p.stock > Number(stockMax)) return false;
      if (createdFrom && p.created < createdFrom) return false;
      if (createdTo && p.created > createdTo) return false;
      if (hasImageOnly && !p.hasImage) return false;
      return true;
    });
  }, [
    q,
    category,
    statuses,
    store,
    tagChips,
    priceMin,
    priceMax,
    stockMin,
    stockMax,
    createdFrom,
    createdTo,
    hasImageOnly,
    tab,
    staffOrAdmin,
  ]);

  const total = PRODUCT_ROWS.length;
  const low = PRODUCT_ROWS.filter((p) => p.stock > 0 && p.stock < 30).length;
  const out = PRODUCT_ROWS.filter((p) => p.stock === 0).length;
  const hidden = PRODUCT_ROWS.filter((p) => p.status === "HIDDEN").length;

  function priceCell(p: ProductRow) {
    if (p.priceMin != null && p.priceMax != null && p.priceMin !== p.priceMax) {
      return (
        <span className="font-mono tabular-nums">
          ${p.priceMin.toFixed(2)} – ${p.priceMax.toFixed(2)}
        </span>
      );
    }
    return <span className="font-mono tabular-nums">${p.price.toFixed(2)}</span>;
  }

  const columns: Column<ProductRow>[] = [
    {
      id: "image",
      header: t("products.colImage"),
      width: "56px",
      cell: (p) => (
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 font-mono text-[11px] text-primary">
          {p.hasImage ? p.sku.slice(0, 3) : <ImageIcon className="h-4 w-4 opacity-50" />}
        </div>
      ),
    },
    {
      id: "name",
      header: t("products.colName"),
      sortValue: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">
            {p.variants > 1
              ? t("products.variantsCount", { n: p.variants })
              : t("products.variantCount", { n: p.variants })}
          </p>
        </div>
      ),
    },
    {
      id: "sku",
      header: t("products.colSku"),
      sortValue: (p) => p.sku,
      cell: (p) => (
        <div>
          <p className="font-mono text-xs">{p.sku}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{p.modelNumber}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: t("products.colCategory"),
      sortValue: (p) => p.category,
      cell: (p) => <span className="text-sm text-muted-foreground">{p.category}</span>,
    },
    ...(staffOrAdmin
      ? [
          {
            id: "store",
            header: t("products.colStore"),
            sortValue: (p: ProductRow) => p.store,
            cell: (p: ProductRow) => <span className="text-sm">{p.store}</span>,
          },
        ]
      : []),
    {
      id: "status",
      header: t("products.colStatus"),
      sortValue: (p) => p.status,
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      id: "price",
      header: t("products.colPrice"),
      align: "end",
      sortValue: (p) => p.price,
      cell: priceCell,
    },
    {
      id: "stock",
      header: t("products.colStock"),
      align: "end",
      sortValue: (p) => p.stock,
      cell: (p) => (
        <span
          className={`font-mono tabular-nums ${p.stock === 0 ? "text-destructive" : p.stock < 30 ? "text-warning" : ""}`}
        >
          {p.stock}
        </span>
      ),
    },
    {
      id: "sold",
      header: t("products.colSold"),
      align: "end",
      sortValue: (p) => p.sold,
      cell: (p) => <span className="font-mono tabular-nums text-muted-foreground">{p.sold}</span>,
    },
    {
      id: "rating",
      header: t("products.colRating"),
      cell: (p) =>
        p.ratingCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span className="tabular-nums">{p.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({p.ratingCount})</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "created",
      header: t("products.colCreated"),
      align: "end",
      sortValue: (p) => p.created,
      cell: (p) => <span className="text-xs text-muted-foreground">{p.created}</span>,
    },
  ];

  const rowActions = (p: ProductRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 opacity-60 group-hover:opacity-100"
          aria-label={t("common.actions")}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <Can perm="products.view">
          <DropdownMenuItem
            onClick={() => navigate({ to: "/products/$id/edit", params: { id: p.id } })}
          >
            {t("products.rowView")}
          </DropdownMenuItem>
        </Can>
        <Can perm="products.update">
          <DropdownMenuItem
            onClick={() => navigate({ to: "/products/$id/edit", params: { id: p.id } })}
          >
            {t("products.rowEdit")}
          </DropdownMenuItem>
        </Can>
        <Can perm="products.create">
          <DropdownMenuItem onClick={() => toast.success(t("products.toastDuplicated"))}>
            {t("products.rowDuplicate")}
          </DropdownMenuItem>
        </Can>
        <DropdownMenuItem
          onClick={() => navigate({ to: "/products/$id/reviews", params: { id: p.id } })}
        >
          {t("products.rowReviews")}
        </DropdownMenuItem>
        <Can perm="products.publish">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              toast.success(
                p.status === "AVAILABLE" ? t("products.toastHidden") : t("products.toastPublished"),
              )
            }
          >
            {p.status === "AVAILABLE"
              ? t("products.rowToggleHide")
              : t("products.rowTogglePublish")}
          </DropdownMenuItem>
        </Can>
        <Can perm="products.delete">
          <DropdownMenuSeparator />
          <ConfirmDialog
            trigger={
              <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                {t("products.rowDelete")}
              </DropdownMenuItem>
            }
            destructive
            typeToConfirm={p.name}
            title={t("products.deleteTitle")}
            description={t("products.deleteDesc")}
            confirmLabel={t("common.delete")}
            onConfirm={() => toast.success(t("products.toastDeleted"))}
          />
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const bulkActions = has("products.bulk_update")
    ? [
        {
          label: t("products.bulkActivate"),
          onClick: (ids: string[]) => toast.success(t("products.toastBulkDone", { n: ids.length })),
        },
        {
          label: t("products.bulkHide"),
          onClick: (ids: string[]) => toast.success(t("products.toastBulkDone", { n: ids.length })),
        },
        {
          label: t("products.bulkArchive"),
          onClick: (ids: string[]) => toast.success(t("products.toastBulkDone", { n: ids.length })),
        },
        {
          label: t("products.bulkChangeCategory"),
          onClick: (ids: string[]) =>
            toast.success(t("products.toastCategoryChanged"), { description: `${ids.length}` }),
        },
        {
          label: t("products.bulkAddTag"),
          onClick: (ids: string[]) =>
            toast.success(t("products.toastTagAdded"), { description: `${ids.length}` }),
        },
        ...(role === "admin"
          ? [
              {
                label: t("products.bulkMoveStore"),
                onClick: (ids: string[]) =>
                  toast.success(t("products.toastMovedStore"), { description: `${ids.length}` }),
              },
            ]
          : []),
        {
          label: t("products.bulkDelete"),
          destructive: true,
          onClick: (ids: string[]) => toast.success(t("products.toastBulkDone", { n: ids.length })),
        },
      ]
    : undefined;

  function addTagChip(v: string) {
    const c = v.trim();
    if (c && !tagChips.includes(c)) setTagChips([...tagChips, c]);
    setTagInput("");
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t("products.title")}
        description={t("products.subtitle")}
        actions={
          <>
            <Can perm="products.bulk_update">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="me-1.5 h-4 w-4" /> {t("products.importCsv")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("products.importCsvTitle")}</DialogTitle>
                    <DialogDescription>{t("products.importCsvDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid place-items-center rounded-xl border-2 border-dashed bg-muted/30 p-8 text-sm text-muted-foreground">
                    <Upload className="mb-2 h-7 w-7" />
                    {t("products.chooseFile")}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => toast.success(t("products.exportToast"))}
                    >
                      <Download className="me-1.5 h-4 w-4" /> {t("products.downloadTemplate")}
                    </Button>
                    <Button
                      className="bg-gradient-primary text-primary-foreground shadow-glow"
                      onClick={() => toast.success(t("products.importToast"))}
                    >
                      {t("products.importCsv")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Can>
            <Button variant="outline" onClick={() => toast.success(t("products.exportToast"))}>
              <Download className="me-1.5 h-4 w-4" /> {t("products.export")}
            </Button>
            <Can perm="products.create">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => navigate({ to: "/products/new" })}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t("products.newProduct")}
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("products.kpiTotal")}
          value={total}
          icon={<Package className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("products.kpiLow")}
          value={low}
          delta={t("products.kpiLowDelta")}
          trend="down"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          label={t("products.kpiOut")}
          value={out}
          delta={t("products.kpiOutDelta")}
          trend="down"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KpiCard
          label={t("products.kpiHidden")}
          value={hidden}
          delta={t("products.kpiHiddenDelta")}
          icon={<EyeOff className="h-5 w-5" />}
        />
      </div>

      {/* Sticky filter bar (§7.1) */}
      <div className="sticky top-2 z-10 mt-6 rounded-2xl border bg-card/95 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="h-9 min-w-[220px] flex-1 bg-muted/50"
            aria-label={t("products.searchPlaceholder")}
          />

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder={t("products.filterCategory")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("products.allCategories")}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status multi-select (all ProductStatusChoices) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                {t("products.filterStatus")}
                {statuses.length > 0 && (
                  <Badge variant="secondary" className="ms-1 px-1.5">
                    {statuses.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-52 overflow-y-auto">
              {PRODUCT_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statuses.includes(s)}
                  onCheckedChange={(v) =>
                    setStatuses((prev) => (v ? [...prev, s] : prev.filter((x) => x !== s)))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {t(`products.status${s}`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {staffOrAdmin && (
            <Select value={store} onValueChange={setStore}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={t("products.filterStore")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("products.allStores")}</SelectItem>
                {STORE_NAMES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Advanced filters popover: price/stock/date/has-image */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> {t("products.filters")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  {t("products.priceRange")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder={t("products.priceMin")}
                    className="h-8 font-mono"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder={t("products.priceMax")}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  {t("products.stockRange")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={stockMin}
                    onChange={(e) => setStockMin(e.target.value)}
                    placeholder={t("products.stockMin")}
                    className="h-8 font-mono"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number"
                    value={stockMax}
                    onChange={(e) => setStockMax(e.target.value)}
                    placeholder={t("products.stockMax")}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  {t("products.dateRange")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={createdFrom}
                    onChange={(e) => setCreatedFrom(e.target.value)}
                    className="h-8"
                    aria-label={t("products.dateFrom")}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="date"
                    value={createdTo}
                    onChange={(e) => setCreatedTo(e.target.value)}
                    className="h-8"
                    aria-label={t("products.dateTo")}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label htmlFor="has-image" className="text-sm font-normal">
                  {t("products.hasImage")}
                </Label>
                <Switch id="has-image" checked={hasImageOnly} onCheckedChange={setHasImageOnly} />
              </div>
            </PopoverContent>
          </Popover>

          {/* Saved presets (placeholder) */}
          <Select defaultValue="NONE">
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder={t("products.savedPresets")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{t("products.noPresets")}</SelectItem>
              <SelectItem value="SAVE">{t("products.saveAsPreset")}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            {t("products.clearFilters")}
          </Button>
        </div>

        {/* Tag chips multi-input */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {tagChips.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1.5">
              {c}
              <button
                onClick={() => setTagChips(tagChips.filter((x) => x !== c))}
                aria-label={`${t("common.remove")} ${c}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTagChip(tagInput);
              }
            }}
            placeholder={t("products.tagsPlaceholder")}
            list="product-tag-suggestions"
            className="h-7 w-44 bg-muted/40"
          />
          <datalist id="product-tag-suggestions">
            {TAGS.map((tg) => (
              <option key={tg} value={tg} />
            ))}
          </datalist>
        </div>

        {/* Status quick tabs */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { v: "ALL", l: t("products.tabAll") },
            { v: "AVAILABLE", l: t("products.tabAvailable") },
            { v: "HIDDEN", l: t("products.tabHidden") },
            { v: "ARCHIVED", l: t("products.tabArchived") },
          ].map((x) => (
            <button
              key={x.v}
              onClick={() => setTab(x.v)}
              className={`rounded-lg px-3 py-1 text-sm transition ${tab === x.v ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted/60"}`}
            >
              {x.l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <PageStates state={state} skeleton={<TableSkeleton cols={8} />}>
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(p) => p.id}
            bulkActions={bulkActions}
            rowActions={rowActions}
            onRowClick={(p) => navigate({ to: "/products/$id/edit", params: { id: p.id } })}
            emptyState={
              <div className="p-2">
                <EmptyState
                  icon={<Package className="h-6 w-6" />}
                  title={t("products.emptyTitle")}
                  description={t("products.emptyDesc")}
                  action={
                    <Can perm="products.create">
                      <Button
                        className="bg-gradient-primary text-primary-foreground shadow-glow"
                        onClick={() => navigate({ to: "/products/new" })}
                      >
                        <Plus className="me-1.5 h-4 w-4" /> {t("products.newProduct")}
                      </Button>
                    </Can>
                  }
                />
              </div>
            }
          />
        </PageStates>
      </div>
    </div>
  );
}
