import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Hash, SearchX } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { listSearchHistory, type SearchTerm } from "@/lib/api/search_history.functions";

export const Route = createFileRoute("/_panel/admin/search-history")({
  head: () => ({ meta: [{ title: "Search history — Mixlebs Admin" }] }),
  component: SearchHistoryPage,
});

function SearchHistoryPage() {
  const t = useT();
  const { role } = usePermissions();
  const state = usePageState();
  const [q, setQ] = useState("");
  const [withResults, setWithResults] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ENTRY 014 — search query strings are not persisted; the endpoint returns an
  // empty paginated envelope, so the screen renders an empty state.
  const searchQuery = useQuery({
    queryKey: ["search-history"],
    queryFn: () => listSearchHistory(),
    enabled: role === "admin",
    retry: false,
  });
  const terms: SearchTerm[] = searchQuery.data?.results ?? [];

  const rows = useMemo(
    () =>
      terms.filter((s) => {
        if (q && !s.query.toLowerCase().includes(q.toLowerCase())) return false;
        if (withResults && s.avg_results === 0) return false;
        if (dateFrom && s.last_searched.slice(0, 10) < dateFrom) return false;
        if (dateTo && s.last_searched.slice(0, 10) > dateTo) return false;
        return true;
      }),
    [terms, q, withResults, dateFrom, dateTo],
  );

  if (role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.searchHistory.title")}
          description={t("admin.searchHistory.subtitle")}
        />
        <ForbiddenState perms={["search_history.view"]} />
      </div>
    );
  }

  const totalSearches = terms.reduce((a, s) => a + s.count, 0);
  const zeroResults = terms.filter((s) => s.avg_results === 0).length;
  const fmt = (n: number) => n.toLocaleString();

  const columns: Column<SearchTerm>[] = [
    {
      id: "query",
      header: t("admin.searchHistory.colQuery"),
      cell: (s) => <span className="font-medium">{s.query}</span>,
      sortValue: (s) => s.query,
    },
    {
      id: "count",
      header: t("admin.searchHistory.colCount"),
      align: "end",
      cell: (s) => <span className="font-mono tabular-nums">{fmt(s.count)}</span>,
      sortValue: (s) => s.count,
    },
    {
      id: "unique_users",
      header: t("admin.searchHistory.colUnique"),
      align: "end",
      cell: (s) => <span className="font-mono tabular-nums">{fmt(s.unique_users)}</span>,
      sortValue: (s) => s.unique_users,
    },
    {
      id: "avg_results",
      header: t("admin.searchHistory.colAvgResults"),
      align: "end",
      cell: (s) => (
        <span className={`font-mono tabular-nums ${s.avg_results === 0 ? "text-destructive" : ""}`}>
          {s.avg_results}
        </span>
      ),
      sortValue: (s) => s.avg_results,
    },
    {
      id: "last_searched",
      header: t("admin.searchHistory.colLastSearched"),
      cell: (s) => (
        <span className="font-mono text-xs text-muted-foreground">{s.last_searched}</span>
      ),
      sortValue: (s) => s.last_searched,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.searchHistory.title")}
        description={t("admin.searchHistory.subtitle")}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.searchHistory.kTotalSearches")}
          value={fmt(totalSearches)}
          icon={<Search className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.searchHistory.kUniqueQueries")}
          value={terms.length}
          icon={<Hash className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.searchHistory.kZeroResults")}
          value={zeroResults}
          icon={<SearchX className="h-5 w-5" />}
          trend={zeroResults > 0 ? "down" : "flat"}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="q" className="text-xs">
              {t("admin.common.search")}
            </Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("admin.searchHistory.searchPlaceholder")}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-df" className="text-xs">
              {t("admin.searchHistory.fDateFrom")}
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
              {t("admin.searchHistory.fDateTo")}
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
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
            <Switch id="with-results" checked={withResults} onCheckedChange={setWithResults} />
            <Label htmlFor="with-results" className="font-normal">
              {t("admin.searchHistory.withResults")}
            </Label>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <PageStates
          state={state}
          missingPerms={["search_history.view"]}
          empty={
            <div className="rounded-2xl border border-dashed bg-muted/30 p-16 text-center text-sm text-muted-foreground">
              {t("admin.searchHistory.emptyDesc")}
            </div>
          }
        >
          <DataTable data={rows} columns={columns} getRowId={(s) => s.id} />
        </PageStates>
      </div>
    </div>
  );
}
