import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Users, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import {
  PRODUCT_VISITS,
  STORE_VISITS,
  type ProductVisits,
  type StoreVisits,
} from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/visitors")({
  head: () => ({ meta: [{ title: "Visitors analytics — Mixlebs Admin" }] }),
  component: VisitorsPage,
});

function VisitorsPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();
  const { stores } = useApp();
  const [storeFilter, setStoreFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  if (!has("visitors.view")) {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.visitors.title")} description={t("admin.visitors.subtitle")} />
        <ForbiddenState perms={["visitors.view"]} />
      </div>
    );
  }

  const storeRows =
    storeFilter === "all" ? STORE_VISITS : STORE_VISITS.filter((s) => s.id === storeFilter);
  const totalVisits = PRODUCT_VISITS.reduce((a, p) => a + p.total_visits, 0);
  const uniqueVisitors = PRODUCT_VISITS.reduce((a, p) => a + p.unique_users, 0);
  const avgConv = (
    PRODUCT_VISITS.reduce((a, p) => a + p.conversion, 0) / Math.max(1, PRODUCT_VISITS.length)
  ).toFixed(1);

  const fmt = (n: number) => n.toLocaleString();

  const productCols: Column<ProductVisits>[] = [
    {
      id: "product",
      header: t("admin.visitors.colProduct"),
      cell: (r) => <span className="font-medium">{r.product}</span>,
      sortValue: (r) => r.product,
    },
    {
      id: "total_visits",
      header: t("admin.visitors.colTotalVisits"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.total_visits)}</span>,
      sortValue: (r) => r.total_visits,
    },
    {
      id: "unique_users",
      header: t("admin.visitors.colUnique"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.unique_users)}</span>,
      sortValue: (r) => r.unique_users,
    },
    {
      id: "anonymous",
      header: t("admin.visitors.colAnonymous"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.anonymous)}</span>,
      sortValue: (r) => r.anonymous,
    },
    {
      id: "last_visit",
      header: t("admin.visitors.colLastVisit"),
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.last_visit}</span>,
      sortValue: (r) => r.last_visit,
    },
    {
      id: "conversion",
      header: t("admin.visitors.colConversion"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{r.conversion.toFixed(1)}%</span>,
      sortValue: (r) => r.conversion,
    },
  ];

  const storeCols: Column<StoreVisits>[] = [
    {
      id: "store",
      header: t("admin.visitors.colStore"),
      cell: (r) => <span className="font-medium">{r.store}</span>,
      sortValue: (r) => r.store,
    },
    {
      id: "total_visits",
      header: t("admin.visitors.colTotalVisits"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.total_visits)}</span>,
      sortValue: (r) => r.total_visits,
    },
    {
      id: "unique_users",
      header: t("admin.visitors.colUnique"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.unique_users)}</span>,
      sortValue: (r) => r.unique_users,
    },
    {
      id: "anonymous",
      header: t("admin.visitors.colAnonymous"),
      align: "end",
      cell: (r) => <span className="font-mono tabular-nums">{fmt(r.anonymous)}</span>,
      sortValue: (r) => r.anonymous,
    },
    {
      id: "last_visit",
      header: t("admin.visitors.colLastVisit"),
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.last_visit}</span>,
      sortValue: (r) => r.last_visit,
    },
    {
      id: "subscriber_conversion",
      header: t("admin.visitors.colSubConversion"),
      align: "end",
      cell: (r) => (
        <span className="font-mono tabular-nums">{r.subscriber_conversion.toFixed(1)}%</span>
      ),
      sortValue: (r) => r.subscriber_conversion,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("admin.visitors.title")} description={t("admin.visitors.subtitle")} />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.visitors.kTotalVisits")}
          value={fmt(totalVisits)}
          icon={<Eye className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.visitors.kUnique")}
          value={fmt(uniqueVisitors)}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.visitors.kAvgConversion")}
          value={`${avgConv}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-df" className="text-xs">
              {t("admin.visitors.fDateFrom")}
            </Label>
            <Input
              id="f-df"
              type="date"
              dir="ltr"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-dt" className="text-xs">
              {t("admin.visitors.fDateTo")}
            </Label>
            <Input
              id="f-dt"
              type="date"
              dir="ltr"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admin.visitors.fStore")}</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.common.all")}</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">{t("admin.visitors.tabProducts")}</TabsTrigger>
            <TabsTrigger value="stores">{t("admin.visitors.tabStores")}</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="mt-4">
            <PageStates state={state} missingPerms={["visitors.view"]}>
              <DataTable data={PRODUCT_VISITS} columns={productCols} getRowId={(r) => r.id} />
            </PageStates>
          </TabsContent>
          <TabsContent value="stores" className="mt-4">
            <PageStates state={state} missingPerms={["visitors.view"]}>
              <DataTable data={storeRows} columns={storeCols} getRowId={(r) => r.id} />
            </PageStates>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
