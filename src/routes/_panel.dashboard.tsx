import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { ORDERS, PRODUCTS } from "@/lib/mock-data";

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
  // STORE users never see the store picker — default to their own store.
  const [store, setStore] = useState(canAllStores ? "all" : "str_01");
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  const revSpark = useMemo(() => generateSpark(28, 22, 96), []);
  const ordersSpark = useMemo(() => generateSpark(28, 18, 74), []);

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? "";
  const storeLabel = store === "all" ? t("dashboard.allStores") : (STORE_NAMES[store] ?? store);
  const compareLabel = compare === "prev" ? t("dashboard.comparePrev") : t("dashboard.compareYear");

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
              {Object.entries(STORE_NAMES).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
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
        state={state}
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
            value="$12,486"
            delta="+18.2%"
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("dashboard.kpiRevenueNet")}
            value="$11,902"
            delta="+16.1%"
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiOrders")}
            value="84"
            delta="+12"
            trend="up"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiAov")}
            value="$48.20"
            delta="+3.4%"
            trend="up"
            icon={<Activity className="h-5 w-5" />}
          />

          <KpiCard
            label={t("dashboard.kpiNewCustomers")}
            value="36"
            delta="-4"
            trend="down"
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiReturningCustomers")}
            value="58"
            delta="+9"
            trend="up"
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiConversion")}
            value="3.42%"
            delta="+0.31pp"
            trend="up"
            icon={<Percent className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiReturnsRate")}
            value="0.8%"
            delta="-0.2pp"
            trend="up"
            icon={<RotateCcw className="h-5 w-5" />}
          />

          <KpiCard
            label={t("dashboard.kpiAbandoned")}
            value="42"
            delta="+6"
            trend="down"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiActiveProducts")}
            value="1,284"
            delta={t("dashboard.kpiLowStockDelta", { n: 22 })}
            trend="flat"
            icon={<Package className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiOutOfStock")}
            value="22"
            delta="+3"
            trend="down"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiProductRating")}
            value="4.6"
            delta="+0.1"
            trend="up"
            icon={<Star className="h-5 w-5" />}
          />

          {/* Cross-store viewers see platform rating; single-store sees store rating. */}
          <KpiCard
            label={
              canAllStores && store === "all"
                ? t("dashboard.kpiPlatformRating")
                : t("dashboard.kpiStoreRating")
            }
            value="4.8"
            delta={t("dashboard.kpiStable")}
            trend="flat"
            icon={<Star className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiWalletInflow")}
            value="$8,450"
            delta="+22%"
            trend="up"
            icon={<Wallet className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiWalletOutflow")}
            value="$2,120"
            delta="+5%"
            trend="down"
            icon={<ArrowDownRight className="h-5 w-5" />}
          />
          <KpiCard
            label={t("dashboard.kpiCoupons")}
            value="48"
            delta="+15"
            trend="up"
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
          <Funnel t={t} />
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
                {PRODUCTS.slice(0, 5).map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-xs font-mono">
                          {p.sku.slice(0, 3)}
                        </div>
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      {120 - i * 14}
                    </TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      ${((120 - i * 14) * p.price) | 0}
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground">
                      {(4.2 - i * 0.4).toFixed(1)}%
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
                {[
                  { name: "Spices", u: 412, r: 8240 },
                  { name: "Pantry", u: 308, r: 6180 },
                  { name: "Sweets", u: 198, r: 4250 },
                  { name: "Beverages", u: 142, r: 1860 },
                  { name: "Bakery", u: 96, r: 1240 },
                ].map((c, i) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{c.name}</TableCell>
                    <TableCell className="text-end font-mono tabular-nums">{c.u}</TableCell>
                    <TableCell className="text-end font-mono tabular-nums">
                      ${c.r.toLocaleString()}
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
                {PRODUCTS.filter((p) => p.stock < 40)
                  .slice(0, 5)
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell
                        className={`text-end font-mono tabular-nums ${p.stock === 0 ? "text-destructive" : "text-warning"}`}
                      >
                        {p.stock}
                      </TableCell>
                      <TableCell className="text-end text-muted-foreground">10</TableCell>
                      <TableCell className="text-end text-xs text-muted-foreground">
                        {p.updated}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/products/$id/edit" params={{ id: p.id }}>
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
              <p className="font-display text-3xl font-bold tabular-nums">$6,330</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.walletBalance")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-background/40 p-2.5">
                  <p className="text-muted-foreground">{t("dashboard.inflow")}</p>
                  <p className="mt-0.5 font-mono font-semibold text-success">+$8,450</p>
                </div>
                <div className="rounded-lg border bg-background/40 p-2.5">
                  <p className="text-muted-foreground">{t("dashboard.outflow")}</p>
                  <p className="mt-0.5 font-mono font-semibold text-destructive">-$2,120</p>
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
                  count={4}
                  to="/returns"
                />
                <AttentionItem
                  icon={AlertTriangle}
                  label={t("dashboard.attnLowStock")}
                  count={22}
                  to="/products"
                />
                <AttentionItem
                  icon={MessageSquare}
                  label={t("dashboard.attnSupport")}
                  count={2}
                  to="/support"
                />
                {/* Identity reviews pending — hidden for STORE; needs stores.review_identity. */}
                {canIdentityReview && (
                  <AttentionItem
                    icon={FileWarning}
                    label={t("dashboard.attnIdentity")}
                    count={1}
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
              <ul className="space-y-2.5 text-sm">
                {[
                  { name: "Aramex", fee: "$4.20", eta: "2d", rate: "98%" },
                  { name: "Bosta", fee: "$3.80", eta: "1d", rate: "96%" },
                  { name: "Wakilni", fee: "$5.10", eta: "1d", rate: "94%" },
                ].map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between rounded-lg border bg-background/40 p-2.5"
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.fee} · {c.eta} · {c.rate}
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
            <div className="divide-y">
              {ORDERS.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-muted text-xs">
                      {o.customer
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {o.customer}{" "}
                      <span className="ms-2 font-mono text-xs text-muted-foreground">
                        {o.number}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.store} · {o.items} {t("dashboard.colItem").toLowerCase()} · {o.placed}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    ${o.total.toFixed(2)}
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
              <TableBody>
                {[
                  {
                    rn: "RT-201",
                    on: "MX-4488",
                    item: "Saffron Threads",
                    reason: "Damaged",
                    at: "1h ago",
                  },
                  {
                    rn: "RT-200",
                    on: "MX-4475",
                    item: "Olive Oil 1L",
                    reason: "Wrong item",
                    at: "4h ago",
                  },
                  {
                    rn: "RT-199",
                    on: "MX-4462",
                    item: "Pistachio Halva",
                    reason: "Late delivery",
                    at: "1d ago",
                  },
                  {
                    rn: "RT-198",
                    on: "MX-4458",
                    item: "Sumac Powder",
                    reason: "Customer changed mind",
                    at: "2d ago",
                  },
                ].map((r) => (
                  <TableRow key={r.rn}>
                    <TableCell className="font-mono text-xs">{r.rn}</TableCell>
                    <TableCell className="font-mono text-xs">{r.on}</TableCell>
                    <TableCell className="text-sm">{r.item}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
                    <TableCell className="text-end text-xs text-muted-foreground">{r.at}</TableCell>
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

const STORE_NAMES: Record<string, string> = {
  str_01: "Beirut Pantry",
  str_02: "Saida Sweets",
  str_03: "Tripoli Spices",
  str_04: "Cedar Goods Co.",
  str_05: "Zahle Olive Press",
};

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

function Funnel({ t }: { t: TFunction }) {
  const stages = [
    { label: t("dashboard.funnelVisits"), value: 24800 },
    { label: t("dashboard.funnelViews"), value: 12400 },
    { label: t("dashboard.funnelCart"), value: 4200 },
    { label: t("dashboard.funnelCheckouts"), value: 1480 },
    { label: t("dashboard.funnelOrders"), value: 848 },
  ];
  const max = stages[0].value;
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = i === 0 ? 100 : (s.value / stages[i - 1].value) * 100;
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

function generateSpark(n: number, min: number, max: number) {
  let v = (min + max) / 2;
  return Array.from({ length: n }).map(() => {
    v += (Math.random() - 0.45) * (max - min) * 0.18;
    v = Math.max(min, Math.min(max, v));
    return v;
  });
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
