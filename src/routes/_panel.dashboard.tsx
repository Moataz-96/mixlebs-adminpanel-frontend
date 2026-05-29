import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
  Star,
  Truck,
  RotateCcw,
  Percent,
  Wallet,
  ArrowDownRight,
  AlertTriangle,
  FileWarning,
  MessageSquare,
  Activity,
  Calendar,
  Link2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageStates, CardsSkeleton, EmptyState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageState } from "@/lib/page-state";
import { useT, type TFunction } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import {
  getOverview,
  getTimeseries,
  getFunnel,
  getWallet,
  type FunnelPayload,
  type TimeseriesPoint,
} from "@/lib/api/dashboard.functions";

export const Route = createFileRoute("/_panel/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mixlebs Admin" },
      {
        name: "description",
        content:
          "Revenue, orders, conversion, returns and inventory — across all your stores in one place.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const t = useT();
  const { has, role } = usePermissions();
  const state = usePageState();
  // Live store list (topbar/dashboard share the same source — see app-context).
  const { stores, currentStoreId } = useApp();

  const canAllStores = has("dashboard.view_all_stores");
  const canIdentityReview = has("stores.review_identity");
  const canViewAnyWallet = has("wallet.view_any");

  const RANGES = [
    { value: "30d", label: t("dashboard.range30d") },
    { value: "today", label: t("dashboard.rangeToday") },
    { value: "7d", label: t("dashboard.range7d") },
    { value: "90d", label: t("dashboard.range90d") },
    { value: "custom", label: t("dashboard.rangeCustom") },
  ];

  const [range, setRange] = useState("30d");
  const [compare, setCompare] = useState("prev");
  // STORE users never see the store picker — pinned to their own store id.
  // STAFF/ADMIN default to "all" only when they may view across stores; the
  // first available store otherwise.
  const [store, setStore] = useState<string>(() => {
    if (role === "store") return currentStoreId ?? "";
    return canAllStores ? "all" : (currentStoreId ?? "");
  });
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  // Resolve the selected range to ISO date bounds the BE expects. "custom" has
  // no inline date pickers in the frozen UI, so it falls back to the 30d window.
  const { dateFrom, dateTo } = useMemo(() => rangeToDates(range), [range]);
  const compareTo = compare === "year" ? "prev_year" : "prev_period";
  // null store_id => cross-store aggregate (needs dashboard.view_all_stores).
  const storeId = store && store !== "all" ? store : null;

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", { dateFrom, dateTo, storeId, compareTo }],
    queryFn: () =>
      getOverview({
        data: { date_from: dateFrom, date_to: dateTo, store_id: storeId, compare_to: compareTo },
      }),
  });
  const revenueSeriesQuery = useQuery({
    queryKey: ["dashboard", "timeseries", "revenue", { dateFrom, dateTo, storeId, granularity }],
    queryFn: () =>
      getTimeseries({
        data: {
          metric: "revenue",
          granularity,
          date_from: dateFrom,
          date_to: dateTo,
          store_id: storeId,
        },
      }),
  });
  const ordersSeriesQuery = useQuery({
    queryKey: ["dashboard", "timeseries", "orders", { dateFrom, dateTo, storeId, granularity }],
    queryFn: () =>
      getTimeseries({
        data: {
          metric: "orders",
          granularity,
          date_from: dateFrom,
          date_to: dateTo,
          store_id: storeId,
        },
      }),
  });
  const funnelQuery = useQuery({
    queryKey: ["dashboard", "funnel", { dateFrom, dateTo, storeId }],
    queryFn: () => getFunnel({ data: { date_from: dateFrom, date_to: dateTo, store_id: storeId } }),
  });
  const walletQuery = useQuery({
    queryKey: ["dashboard", "wallet", { dateFrom, dateTo, storeId }],
    queryFn: () => getWallet({ data: { date_from: dateFrom, date_to: dateTo, store_id: storeId } }),
  });

  const o = overviewQuery.data;

  // Sparklines: real timeseries values when present, else an empty baseline.
  const revSpark = useMemo(() => seriesToPoints(revenueSeriesQuery.data?.series), [
    revenueSeriesQuery.data,
  ]);
  const ordersSpark = useMemo(() => seriesToPoints(ordersSeriesQuery.data?.series), [
    ordersSeriesQuery.data,
  ]);

  // The page is "loading" until the headline overview resolves; an error there
  // surfaces the error state. The forced ?state= preview still wins.
  const effState =
    state !== "populated"
      ? state
      : overviewQuery.isPending
        ? "loading"
        : overviewQuery.isError
          ? "error"
          : "populated";

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? "";
  const storeLabel =
    store === "all"
      ? t("dashboard.allStores")
      : (stores.find((s) => s.id === store)?.name ?? store);
  const compareLabel = compare === "prev" ? t("dashboard.comparePrev") : t("dashboard.compareYear");

  // Map the live recent-orders payload (order_number / customer / total / status
  // / created_at, ENTRY 017) into the frozen row shape the markup consumes. The
  // dashboard contract carries no per-order store/item-count, so `store` reuses
  // the active store label and `items` is omitted (0).
  const recentOrderRows = useMemo(
    () =>
      (o?.recent_orders ?? []).map((row) => ({
        id: row.order_id,
        number: row.order_number,
        customer: row.customer || "—",
        store: storeLabel,
        total: Number(row.total) || 0,
        status: row.status,
        items: 0,
        placed: fmtRelative(row.created_at),
      })),
    [o?.recent_orders, storeLabel],
  );

  return (
    <div className="p-6">
      <PageHeader
        title={`${t("dashboard.greeting")}, Karim`}
        description={t("dashboard.subtitle")}
        actions={
          <>
            <Button variant="outline">{t("dashboard.export")}</Button>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              <ArrowUpRight className="me-1.5 h-4 w-4" /> {t("dashboard.newOrder")}
            </Button>
          </>
        }
      />

      {/* Topbar controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/50 p-3 shadow-soft">
        {/* Store picker — STAFF/ADMIN only (STORE never sees it). "All stores" needs dashboard.view_all_stores. */}
        {role !== "store" && (
          <Select value={store} onValueChange={setStore}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {canAllStores && <SelectItem value="all">{t("dashboard.allStores")}</SelectItem>}
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="me-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={compare} onValueChange={setCompare}>
          <SelectTrigger className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prev">{t("dashboard.comparePrev")}</SelectItem>
            <SelectItem value="year">{t("dashboard.compareYear")}</SelectItem>
          </SelectContent>
        </Select>

        <span className="ms-auto text-xs text-muted-foreground">
          {t("dashboard.updatedAgo", { time: "2 min" })}
        </span>
      </div>

      <PageStates
        state={effState}
        skeleton={
          <div className="mt-4 space-y-6">
            <CardsSkeleton count={8} />
            <CardsSkeleton count={8} />
          </div>
        }
        empty={<DashboardEmpty t={t} />}
      >
        {/* 16 KPI cards */}
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("dashboard.kpiRevenueGross")}
            value={fmtMoney(o?.revenue_gross)}
            {...deltaProps(o?.deltas?.revenue_gross)}
            icon={<DollarSign className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("dashboard.kpiRevenueNet")}
            value={fmtMoney(o?.revenue_net)}
            {...deltaProps(o?.deltas?.revenue_net)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiOrders")}
            value={fmtNum(o?.orders_count)}
            {...deltaProps(o?.deltas?.orders_count)}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiAov")}
            value={fmtMoney(o?.average_order_value)}
            {...deltaProps(o?.deltas?.average_order_value)}
            icon={<Activity className="h-5 w-5" />}
          />

          <KpiCard
            label={t("dashboard.kpiNewCustomers")}
            value={fmtNum(o?.new_customers)}
            {...deltaProps(o?.deltas?.new_customers)}
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiReturningCustomers")}
            value={fmtNum(o?.returning_customers)}
            {...deltaProps(o?.deltas?.returning_customers)}
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiConversion")}
            value={fmtPct(o?.conversion_rate)}
            icon={<Percent className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiReturnsRate")}
            value={fmtPct(o?.returns_rate)}
            icon={<RotateCcw className="h-5 w-5" />}
          />

          <KpiCard
            label={t("dashboard.kpiAbandoned")}
            value={fmtNum(o?.abandoned_carts)}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiActiveProducts")}
            value={fmtNum(o?.active_products)}
            delta={t("dashboard.kpiLowStockDelta", { n: o?.out_of_stock_products ?? 0 })}
            trend="flat"
            icon={<Package className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiOutOfStock")}
            value={fmtNum(o?.out_of_stock_products)}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiProductRating")}
            value={fmtRating(o?.avg_product_rating)}
            icon={<Star className="h-5 w-5" />}
          />

          {/* Cross-store viewers see platform rating; single-store sees store rating. */}
          <KpiCard
            label={
              canAllStores && store === "all"
                ? t("dashboard.kpiPlatformRating")
                : t("dashboard.kpiStoreRating")
            }
            value={fmtRating(o?.avg_store_rating)}
            icon={<Star className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiWalletInflow")}
            value={fmtMoney(o?.wallet_inflow)}
            icon={<Wallet className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiWalletOutflow")}
            value={fmtMoney(o?.wallet_outflow)}
            icon={<ArrowDownRight className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiCoupons")}
            value={fmtNum(o?.coupon_redemptions)}
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        {/* Charts row */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 overflow-hidden border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {t("dashboard.revenueTitle", { range: rangeLabel })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.revenueSub", { store: storeLabel, compare: compareLabel })}
                </p>
              </div>
              <div className="flex gap-1">
                {(["day", "week", "month"] as const).map((g) => (
                  <Button
                    key={g}
                    variant={g === granularity ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setGranularity(g)}
                  >
                    {t(`dashboard.gran${g[0].toUpperCase()}${g.slice(1)}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <Sparkline points={revSpark} />
            </div>
          </Card>

          <Card className="overflow-hidden border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <h3 className="font-display text-lg font-semibold">{t("dashboard.ordersTitle")}</h3>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-5">
              <Sparkline points={ordersSpark} />
            </div>
          </Card>
        </div>

        {/* Funnel */}
        <Card className="mt-6 border-0 bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">{t("dashboard.funnelTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("dashboard.funnelSub")}</p>
            </div>
            <Badge variant="outline">{rangeLabel}</Badge>
          </div>
          <Funnel t={t} data={funnelQuery.data} />
        </Card>

        {/* Tables row */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <h3 className="font-display text-lg font-semibold">{t("dashboard.topProducts")}</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products">{t("dashboard.viewAll")} →</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">{t("dashboard.colRank")}</TableHead>
                  <TableHead>{t("dashboard.colProduct")}</TableHead>
                  <TableHead>{t("dashboard.colSku")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colUnits")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colRevenue")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colConversion")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(o?.top_products ?? []).slice(0, 5).map((p, i) => (
                  <TableRow key={p.product_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-xs font-mono">
                          {p.product_id.slice(0, 3).toUpperCase()}
                        </div>
                        {/* Display name from ProductInfo (active language), id fallback (ENTRY 015). */}
                        <span className="text-sm font-medium font-mono">
                          {p.product_name || p.product_id}
                        </span>
                      </div>
                    </TableCell>
                    {/* SKU / model_number from the product's variant (ENTRY 015). */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.sku || "—"}
                    </TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      {fmtNum(p.units_sold)}
                    </TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      {fmtMoney(p.revenue)}
                    </TableCell>
                    {/* Per-product conversion: orders-with-product ÷ visits (ENTRY 015). */}
                    <TableCell className="text-end text-muted-foreground">
                      {fmtPct(p.conversion_rate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <h3 className="font-display text-lg font-semibold">{t("dashboard.topCategories")}</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/categories">{t("dashboard.manage")} →</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">{t("dashboard.colRank")}</TableHead>
                  <TableHead>{t("dashboard.colCategory")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colUnits")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colRevenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(o?.top_categories ?? []).slice(0, 5).map((c, i) => (
                  <TableRow key={c.category_id ?? `uncat-${i}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    {/* Display name from CategoryTranslation (active language), id fallback (ENTRY 015). */}
                    <TableCell className="text-sm font-medium font-mono">
                      {c.category_name || (c.category_id != null ? `#${c.category_id}` : "—")}
                    </TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      {fmtNum(c.units_sold)}
                    </TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      {fmtMoney(c.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Stock alerts */}
          <Card className="lg:col-span-2 border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <h3 className="font-display text-lg font-semibold">{t("dashboard.stockAlerts")}</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products">{t("dashboard.allProducts")} →</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{t("dashboard.colProduct")}</TableHead>
                  <TableHead>{t("dashboard.colSku")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colStock")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colThreshold")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colLastSold")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(o?.stock_alerts ?? []).slice(0, 5).map((a) => (
                  <TableRow key={a.variant_id}>
                    {/* Display name from ProductInfo (active language), id fallback (ENTRY 015). */}
                    <TableCell className="text-sm font-medium font-mono">
                      {a.product_name || a.product_id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.sku}</TableCell>
                    <TableCell
                      className={`text-end font-mono tabular-nums ${a.current_stock === 0 ? "text-destructive" : "text-warning"}`}
                    >
                      {a.current_stock}
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground">{a.threshold}</TableCell>
                    {/* Latest OrderItems order created_at for this variant (ENTRY 015). */}
                    <TableCell className="text-end text-xs text-muted-foreground">
                      {fmtRelative(a.last_sold_at)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/products/$id/edit" params={{ id: a.product_id }}>
                          {t("dashboard.restock")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Right rail */}
          <div className="space-y-4">
            <Card className="border-0 bg-card p-5 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{t("dashboard.wallet")}</h3>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              {/* Current wallet balance for the scope (ENTRY 016). */}
              <p className="font-display text-3xl font-bold tabular-nums">
                {fmtMoney(walletQuery.data?.wallet_balance ?? o?.wallet_balance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.walletBalance")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-background/40 p-2.5">
                  <p className="text-muted-foreground">{t("dashboard.inflow")}</p>
                  <p className="mt-0.5 font-mono font-semibold text-success">
                    +{fmtMoney(walletQuery.data?.wallet_inflow ?? o?.wallet_inflow)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background/40 p-2.5">
                  <p className="text-muted-foreground">{t("dashboard.outflow")}</p>
                  <p className="mt-0.5 font-mono font-semibold text-destructive">
                    -{fmtMoney(walletQuery.data?.wallet_outflow ?? o?.wallet_outflow)}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                <Link to="/wallet">{t("dashboard.openWallet")}</Link>
              </Button>
              {/* Other users' wallet snapshot — wallet.view_any only. */}
              {canViewAnyWallet && (
                <Button variant="ghost" size="sm" className="mt-2 w-full text-primary" asChild>
                  <Link to="/wallet">
                    <Link2 className="me-1.5 h-3.5 w-3.5" /> {t("dashboard.otherWallets")}
                  </Link>
                </Button>
              )}
            </Card>

            <Card className="border-0 bg-card p-5 shadow-soft">
              <h3 className="mb-3 font-display text-base font-semibold">
                {t("dashboard.attentionTitle")}
              </h3>
              <ul className="space-y-2 text-sm">
                <AttentionItem
                  icon={RotateCcw}
                  label={t("dashboard.attnReturns")}
                  count={o?.attention?.pending_returns_count ?? o?.returns_count ?? 0}
                  to="/returns"
                />
                <AttentionItem
                  icon={AlertTriangle}
                  label={t("dashboard.attnLowStock")}
                  count={o?.attention?.low_stock_count ?? o?.stock_alerts?.length ?? 0}
                  to="/products"
                />
                {/* Support sessions awaiting a staff reply (ENTRY 017). */}
                <AttentionItem
                  icon={MessageSquare}
                  label={t("dashboard.attnSupport")}
                  count={o?.attention?.support_awaiting_count ?? 0}
                  to="/support"
                />
                {/* Identity reviews pending — hidden for STORE; needs stores.review_identity.
                    Count present only for reviewers (ENTRY 017). */}
                {canIdentityReview && (
                  <AttentionItem
                    icon={FileWarning}
                    label={t("dashboard.attnIdentity")}
                    count={o?.attention?.identity_review_pending_count ?? 0}
                    to="/stores"
                  />
                )}
              </ul>
            </Card>

            <Card className="border-0 bg-card p-5 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">
                  {t("dashboard.topCouriers")}
                </h3>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
              {/* Top couriers by delivered-order volume, with fee / ETA / success
                  metric (ENTRY 017). */}
              <ul className="space-y-2.5 text-sm">
                {(o?.top_couriers ?? []).map((c) => (
                  <li
                    key={c.courier_id}
                    className="flex items-center justify-between rounded-lg border bg-background/40 p-2.5"
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {fmtMoney(c.base_fee)} · {c.eta}d
                      {c.success_rate != null ? ` · ${fmtPct(c.success_rate)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Recent orders + pending returns */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <h3 className="font-display text-lg font-semibold">{t("dashboard.recentOrders")}</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/orders">{t("dashboard.viewAll")} →</Link>
              </Button>
            </div>
            {/* Live recent orders for the scope (last 10), mapped to the frozen
                row shape (ENTRY 017). */}
            <div className="divide-y">
              {recentOrderRows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-muted text-xs">
                      {row.customer
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.customer}{" "}
                      <span className="ms-2 font-mono text-xs text-muted-foreground">
                        {row.number}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.store} · {row.items} {t("dashboard.colItem").toLowerCase()} · {row.placed}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    ${row.total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-0 bg-card shadow-soft">
            <div className="flex items-center justify-between border-b p-5">
              <h3 className="font-display text-lg font-semibold">
                {t("dashboard.pendingReturns")}
              </h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/returns">{t("dashboard.viewAll")} →</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{t("dashboard.colReturnNo")}</TableHead>
                  <TableHead>{t("dashboard.colOrderNo")}</TableHead>
                  <TableHead>{t("dashboard.colItem")}</TableHead>
                  <TableHead>{t("dashboard.colReason")}</TableHead>
                  <TableHead className="text-end">{t("dashboard.colRequested")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              {/* Live pending (in-flight) returns for the scope (ENTRY 017). */}
              <TableBody>
                {(o?.pending_returns ?? []).map((r) => (
                  <TableRow key={r.return_id}>
                    <TableCell className="font-mono text-xs">{r.return_number}</TableCell>
                    <TableCell className="font-mono text-xs">{r.order_number}</TableCell>
                    <TableCell className="text-sm">{r.item}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
                    <TableCell className="text-end text-xs text-muted-foreground">
                      {fmtRelative(r.requested_at)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/returns">{t("dashboard.review")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </PageStates>
    </div>
  );
}

// --- formatting helpers (decimal money fields arrive as strings) ---

function fmtMoney(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "$0.00";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "$0.00";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "0";
  return v.toLocaleString();
}

// conversion_rate / returns_rate are floats. Assume a 0–1 fraction → percent;
// values already >1 are treated as already-percent.
function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "0%";
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(2)}%`;
}

function fmtRating(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(1);
}

// Compact relative time for ISO datetimes ("3h ago", "2d ago"); "—" when null.
function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Convert a fractional period-over-period delta (e.g. 0.182 = +18.2%) into the
// KpiCard {delta, trend} props. Null deltas render no delta line.
function deltaProps(v: number | null | undefined): { delta?: string; trend: "up" | "down" | "flat" } {
  if (v === null || v === undefined) return { trend: "flat" };
  const pct = v * 100;
  const sign = pct > 0 ? "+" : "";
  const trend = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { delta: `${sign}${pct.toFixed(1)}%`, trend };
}

// Map the selected range preset to ISO date bounds (YYYY-MM-DD). "custom" has no
// inline pickers in the frozen UI, so it falls back to the 30d window.
function rangeToDates(range: string): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  switch (range) {
    case "today":
      break;
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "90d":
      from.setDate(from.getDate() - 89);
      break;
    case "30d":
    case "custom":
    default:
      from.setDate(from.getDate() - 29);
      break;
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: iso(from), dateTo: iso(to) };
}

// Timeseries values are decimal strings; Sparkline wants number[]. Empty series
// renders a flat baseline so the chart still draws.
function seriesToPoints(series: TimeseriesPoint[] | undefined): number[] {
  if (!series || series.length === 0) return [0, 0];
  return series.map((p) => Number(p.value) || 0);
}

function DashboardEmpty({ t }: { t: TFunction }) {
  return (
    <div className="mt-6">
      <EmptyState
        title={t("dashboard.emptyTitle")}
        description={t("dashboard.emptyDesc")}
        icon={<Activity className="h-6 w-6" />}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow" asChild>
              <Link to="/products/new">
                <Package className="me-1.5 h-4 w-4" /> {t("dashboard.emptyAddProduct")}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => toast.success(t("dashboard.shareLinkToast"))}>
              <Link2 className="me-1.5 h-4 w-4" /> {t("dashboard.emptyShareLink")}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/stores">
                <Clock className="me-1.5 h-4 w-4" /> {t("dashboard.emptyHours")}
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}

function AttentionItem({
  icon: Icon,
  label,
  count,
  to,
}: {
  icon: typeof RotateCcw;
  label: string;
  count: number;
  to: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between rounded-lg border bg-background/40 p-2.5 transition hover:bg-background/80"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </span>
        <Badge className={count > 0 ? "bg-primary/15 text-primary border border-primary/30" : ""}>
          {count}
        </Badge>
      </Link>
    </li>
  );
}

function Funnel({ t, data }: { t: TFunction; data?: FunnelPayload }) {
  const stages = [
    { label: t("dashboard.funnelVisits"), value: data?.visits ?? 0 },
    { label: t("dashboard.funnelViews"), value: data?.product_views ?? 0 },
    { label: t("dashboard.funnelCart"), value: data?.adds_to_cart ?? 0 },
    { label: t("dashboard.funnelCheckouts"), value: data?.checkouts ?? 0 },
    { label: t("dashboard.funnelOrders"), value: data?.orders ?? 0 },
  ];
  const max = stages[0].value || 1;
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prev = stages[i - 1]?.value ?? 0;
        const conv = i === 0 ? 100 : prev > 0 ? (s.value / prev) * 100 : 0;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-32 text-sm font-medium">{s.label}</span>
            <div className="relative h-9 flex-1 rounded-lg bg-muted/40">
              <div
                className="h-full rounded-lg bg-gradient-to-r from-primary/70 to-primary"
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-primary-foreground mix-blend-difference">
                {s.value.toLocaleString()}
              </span>
            </div>
            <span className="w-20 text-end font-mono text-xs text-muted-foreground">
              {i === 0 ? "—" : `${conv.toFixed(1)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 700,
    h = 160,
    pad = 8;
  const max = Math.max(...points),
    min = Math.min(...points);
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const ys = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(p)}`).join(" ");
  const area = `${d} L${xs(points.length - 1)},${h} L${xs(0)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
      <defs>
        <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ga)" />
      <path
        d={d}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
