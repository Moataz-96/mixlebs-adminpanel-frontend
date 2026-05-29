import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  ImageIcon,
  Share2,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Eye,
  Link2,
  Sparkles,
  MoreHorizontal,
  UploadCloud,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageStates, CardsSkeleton } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { usePageState } from "@/lib/page-state";
import { ASSETS_FULL, ASSET_DIMENSION_BUCKETS, type AssetRow } from "@/lib/mock/catalog";

export const Route = createFileRoute("/_panel/assets")({
  head: () => ({ meta: [{ title: "Asset library — Mixlebs Admin" }] }),
  component: AssetsPage,
});

const APP_FIELDS = ["product_image", "collection_banner", "category_icon", "store_logo", "story"];

function AssetsPage() {
  const t = useT();
  const state = usePageState();
  const { role, has } = usePermissions();
  const canSeeStore = role === "admin" || role === "staff";

  const [rows, setRows] = useState<AssetRow[]>(ASSETS_FULL);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [q, setQ] = useState("");
  const [field, setField] = useState("all");
  const [enhanced, setEnhanced] = useState("all");
  const [shared, setShared] = useState("all");
  const [dim, setDim] = useState("any");
  const [detail, setDetail] = useState<AssetRow | null>(null);

  const filtered = useMemo(() => {
    const dimMatch = (a: AssetRow) => {
      if (dim === "any") return true;
      if (dim === "square") return a.width === a.height;
      if (dim === "landscape") return a.width > a.height;
      if (dim === "portrait") return a.height > a.width;
      if (dim === "icon") return a.width <= 256;
      return true;
    };
    return rows.filter((a) => {
      if (q && !a.filename.toLowerCase().includes(q.toLowerCase())) return false;
      if (field !== "all" && a.app_field !== field) return false;
      if (enhanced !== "all" && String(a.is_enhanced) !== enhanced) return false;
      if (shared !== "all" && String(a.is_shared) !== shared) return false;
      if (!dimMatch(a)) return false;
      return true;
    });
  }, [rows, q, field, enhanced, shared, dim]);

  function toggleShare(a: AssetRow) {
    setRows((rs) => rs.map((r) => (r.id === a.id ? { ...r, is_shared: !r.is_shared } : r)));
    toast.success(a.is_shared ? t("catalog.assets.unshared") : t("catalog.assets.shared"));
  }
  function copyUrl(a: AssetRow) {
    void navigator.clipboard?.writeText(`https://cdn.mixlebs.com/assets/${a.id}/${a.filename}`);
    toast.success(t("catalog.assets.copied"));
  }
  function remove(a: AssetRow) {
    if (a.usage_count > 0) {
      toast.error(t("catalog.assets.deleteBlocked", { n: a.usage_count }));
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== a.id));
    toast.success(t("catalog.assets.deleted"));
  }

  const columns: Column<AssetRow>[] = [
    {
      id: "thumb",
      header: t("catalog.assets.colThumb"),
      cell: () => <Thumb className="h-9 w-9 rounded-lg" />,
    },
    {
      id: "filename",
      header: t("catalog.assets.colFilename"),
      sortValue: (r) => r.filename,
      cell: (r) => <span className="font-medium">{r.filename}</span>,
    },
    {
      id: "dim",
      header: t("catalog.assets.colDimensions"),
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.width}×{r.height}
        </span>
      ),
    },
    {
      id: "size",
      header: t("catalog.assets.colSize"),
      align: "end",
      sortValue: (r) => r.size_kb,
      cell: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">{r.size_kb} KB</span>
      ),
    },
    {
      id: "usage",
      header: t("catalog.assets.colUsage"),
      align: "end",
      sortValue: (r) => r.usage_count,
      cell: (r) => <span className="font-mono tabular-nums">{r.usage_count}</span>,
    },
    {
      id: "enhanced",
      header: t("catalog.assets.colEnhanced"),
      align: "center",
      cell: (r) =>
        r.is_enhanced ? (
          <Sparkles className="mx-auto h-4 w-4 text-primary" />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        ),
    },
    {
      id: "shared",
      header: t("catalog.assets.colShared"),
      align: "center",
      cell: (r) => (
        <Switch
          checked={r.is_shared}
          disabled={!has("assets.share")}
          onCheckedChange={() => toggleShare(r)}
          aria-label={t("catalog.assets.share")}
        />
      ),
    },
    {
      id: "by",
      header: t("catalog.assets.colUploadedBy"),
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.uploaded_by}
          {canSeeStore && r.store ? ` · ${r.store}` : ""}
        </span>
      ),
    },
    {
      id: "created",
      header: t("catalog.assets.colCreated"),
      sortValue: (r) => r.created_at,
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.created_at}</span>,
    },
  ];

  const total = rows.length;
  const sharedCount = rows.filter((a) => a.is_shared).length;
  const enhancedCount = rows.filter((a) => a.is_enhanced).length;
  const unused = rows.filter((a) => a.usage_count === 0).length;

  return (
    <div className="p-6">
      <PageHeader
        title={t("catalog.assets.title")}
        description={t("catalog.assets.desc")}
        actions={
          <Can perm="assets.upload">
            <UploadDialog />
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label={t("catalog.assets.kpiTotal")}
          value={total}
          icon={<ImageIcon className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("catalog.assets.kpiShared")}
          value={sharedCount}
          icon={<Share2 className="h-5 w-5" />}
        />
        <KpiCard
          label={t("catalog.assets.kpiEnhanced")}
          value={enhancedCount}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <KpiCard
          label={t("catalog.assets.kpiUnused")}
          value={unused}
          delta={t("catalog.assets.unusedDelta")}
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("catalog.assets.searchPh")}
          count={filtered.length}
          countLabel={t("catalog.assets.count")}
          filters={
            <>
              <FilterSelect
                value={field}
                onChange={setField}
                label={t("catalog.assets.fField")}
                options={APP_FIELDS.map((f) => [f, f] as [string, string])}
                allLabel={t("common.all")}
              />
              <FilterSelect
                value={enhanced}
                onChange={setEnhanced}
                label={t("catalog.assets.fEnhanced")}
                options={[
                  ["true", t("common.yes")],
                  ["false", t("common.no")],
                ]}
                allLabel={t("common.all")}
              />
              <FilterSelect
                value={shared}
                onChange={setShared}
                label={t("catalog.assets.fShared")}
                options={[
                  ["true", t("common.yes")],
                  ["false", t("common.no")],
                ]}
                allLabel={t("common.all")}
              />
              <FilterSelect
                value={dim}
                onChange={setDim}
                label={t("catalog.assets.fDimensions")}
                options={ASSET_DIMENSION_BUCKETS.filter((d) => d !== "any").map(
                  (d) => [d, d] as [string, string],
                )}
                allLabel={t("catalog.assets.any")}
                allValue="any"
              />
              <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
                <Button
                  size="icon"
                  variant={view === "grid" ? "secondary" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setView("grid")}
                  aria-label={t("catalog.assets.viewGrid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={view === "table" ? "secondary" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setView("table")}
                  aria-label={t("catalog.assets.viewTable")}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
            </>
          }
        />
      </div>

      <PageStates
        state={filtered.length === 0 && state === "populated" ? "empty" : state}
        skeleton={<CardsSkeleton count={6} />}
        missingPerms={["assets.view"]}
        empty={
          <EmptyState
            icon={<ImageIcon className="h-6 w-6" />}
            title={t("catalog.assets.emptyTitle")}
            description={t("catalog.assets.emptyDesc")}
            action={
              <Can perm="assets.upload">
                <UploadDialog />
              </Can>
            }
          />
        }
      >
        {view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filtered.map((a) => (
              <Card
                key={a.id}
                className="group overflow-hidden border-0 shadow-soft transition hover:shadow-glow"
              >
                <button
                  type="button"
                  onClick={() => setDetail(a)}
                  className="block w-full"
                  aria-label={`${t("catalog.assets.preview")} ${a.filename}`}
                >
                  <Thumb className="aspect-square w-full" />
                </button>
                <div className="p-2.5">
                  <div className="flex items-center gap-1">
                    <p className="min-w-0 flex-1 truncate text-xs font-medium">{a.filename}</p>
                    {a.is_enhanced && <Sparkles className="h-3 w-3 shrink-0 text-primary" />}
                    {a.is_shared && <Share2 className="h-3 w-3 shrink-0 text-info" />}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{a.size_kb} KB</span>
                    <span>
                      {a.usage_count} {t("catalog.assets.uses")}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => copyUrl(a)}
                      aria-label={t("catalog.assets.copyUrl")}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Can perm="assets.share">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => toggleShare(a)}
                        aria-label={t("catalog.assets.share")}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </Can>
                    <Can perm="assets.delete">
                      <ConfirmDialog
                        trigger={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive disabled:opacity-40"
                            disabled={a.usage_count > 0}
                            aria-label={t("catalog.assets.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                        title={t("catalog.assets.delete")}
                        description={t("catalog.assets.deleteDesc")}
                        confirmLabel={t("common.delete")}
                        destructive
                        typeToConfirm={a.filename}
                        onConfirm={() => remove(a)}
                      />
                    </Can>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(r) => setDetail(r)}
            rowActions={(r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDetail(r)}>
                    <Eye className="me-2 h-4 w-4" /> {t("catalog.assets.preview")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyUrl(r)}>
                    <Link2 className="me-2 h-4 w-4" /> {t("catalog.assets.copyUrl")}
                  </DropdownMenuItem>
                  <Can perm="assets.share">
                    <DropdownMenuItem onClick={() => toggleShare(r)}>
                      <Share2 className="me-2 h-4 w-4" />{" "}
                      {r.is_shared ? t("catalog.assets.unshare") : t("catalog.assets.share")}
                    </DropdownMenuItem>
                  </Can>
                  <Can perm="assets.delete">
                    <ConfirmDialog
                      trigger={
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          disabled={r.usage_count > 0}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                        </DropdownMenuItem>
                      }
                      title={t("catalog.assets.delete")}
                      description={t("catalog.assets.deleteDesc")}
                      confirmLabel={t("common.delete")}
                      destructive
                      typeToConfirm={r.filename}
                      onConfirm={() => remove(r)}
                    />
                  </Can>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        )}
      </PageStates>

      <AssetDrawer
        asset={detail}
        onClose={() => setDetail(null)}
        onCopyUrl={copyUrl}
        onToggleShare={toggleShare}
        onDelete={remove}
        canShare={has("assets.share")}
        canDelete={has("assets.delete")}
      />
    </div>
  );
}

function Thumb({ className }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/20 ${className ?? ""}`}
    >
      <ImageIcon className="h-1/3 w-1/3 max-h-8 max-w-8 text-muted-foreground/40" />
    </div>
  );
}

function UploadDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Upload className="me-1.5 h-4 w-4" /> {t("catalog.assets.upload")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("catalog.assets.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("catalog.assets.uploadHint")}</DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-12 text-center transition hover:border-primary/40">
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <span className="text-sm font-medium">{t("catalog.assets.uploadCta")}</span>
          <input
            type="file"
            multiple
            className="sr-only"
            aria-label={t("catalog.assets.uploadAria")}
            onChange={() => {
              toast.success(t("catalog.assets.shared"));
              setOpen(false);
            }}
          />
        </label>
      </DialogContent>
    </Dialog>
  );
}

function AssetDrawer({
  asset,
  onClose,
  onCopyUrl,
  onToggleShare,
  onDelete,
  canShare,
  canDelete,
}: {
  asset: AssetRow | null;
  onClose: () => void;
  onCopyUrl: (a: AssetRow) => void;
  onToggleShare: (a: AssetRow) => void;
  onDelete: (a: AssetRow) => void;
  canShare: boolean;
  canDelete: boolean;
}) {
  const t = useT();
  return (
    <Drawer open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        {asset && (
          <>
            <DrawerHeader>
              <DrawerTitle>{asset.filename}</DrawerTitle>
              <DrawerDescription>{t("catalog.assets.detailTitle")}</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-6 px-4 pb-2 md:grid-cols-[280px_1fr]">
              <Thumb className="aspect-square w-full rounded-2xl" />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Meta
                    label={t("catalog.assets.colDimensions")}
                    value={`${asset.width}×${asset.height}`}
                  />
                  <Meta label={t("catalog.assets.colSize")} value={`${asset.size_kb} KB`} />
                  <Meta label={t("catalog.assets.fField")} value={asset.app_field} />
                  <Meta label={t("catalog.assets.colUsage")} value={String(asset.usage_count)} />
                  <Meta label={t("catalog.assets.colUploadedBy")} value={asset.uploaded_by} />
                  <Meta label={t("catalog.assets.colCreated")} value={asset.created_at} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {asset.is_enhanced && (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3" /> {t("catalog.assets.colEnhanced")}
                    </Badge>
                  )}
                  {asset.is_shared && (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" /> {t("catalog.assets.colShared")}
                    </Badge>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 font-display text-sm font-semibold">
                    {t("catalog.assets.usedBy")}
                  </h4>
                  {asset.used_by.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("catalog.assets.usedByEmpty")}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {asset.used_by.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                        >
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {u.kind}
                          </Badge>
                          <span>{u.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <DrawerFooter className="flex-row flex-wrap">
              <Button variant="outline" onClick={() => onCopyUrl(asset)}>
                <Link2 className="me-1.5 h-4 w-4" /> {t("catalog.assets.copyUrl")}
              </Button>
              {canShare && (
                <Button variant="outline" onClick={() => onToggleShare(asset)}>
                  <Share2 className="me-1.5 h-4 w-4" />{" "}
                  {asset.is_shared ? t("catalog.assets.unshare") : t("catalog.assets.share")}
                </Button>
              )}
              {canDelete && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="outline"
                      className="text-destructive"
                      disabled={asset.usage_count > 0}
                    >
                      <Trash2 className="me-1.5 h-4 w-4" /> {t("common.delete")}
                    </Button>
                  }
                  title={t("catalog.assets.delete")}
                  description={t("catalog.assets.deleteDesc")}
                  confirmLabel={t("common.delete")}
                  destructive
                  typeToConfirm={asset.filename}
                  onConfirm={() => {
                    onDelete(asset);
                    onClose();
                  }}
                />
              )}
              <DrawerClose asChild>
                <Button variant="ghost" className="ms-auto">
                  {t("common.close")}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
  allLabel,
  allValue = "all",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: [string, string][];
  allLabel: string;
  allValue?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] gap-1 border-transparent bg-muted/50">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>{allLabel}</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
