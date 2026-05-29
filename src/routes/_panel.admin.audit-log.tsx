import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ScrollText, AlertTriangle, Timer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import {
  listAuditLog,
  RESOURCE_METHODS,
  type AuditEntry,
  type ResourceMethod,
} from "@/lib/api/audit.functions";

export const Route = createFileRoute("/_panel/admin/audit-log")({
  head: () => ({ meta: [{ title: "Audit log — Mixlebs Admin" }] }),
  component: AuditLogPage,
});

const METHOD_STYLE: Record<ResourceMethod, string> = {
  GET: "border-info/30 bg-info/15 text-info",
  POST: "border-success/30 bg-success/15 text-success",
  PATCH: "border-warning/30 bg-warning/15 text-warning",
  PUT: "border-warning/30 bg-warning/15 text-warning",
  DELETE: "border-destructive/30 bg-destructive/15 text-destructive",
};

function statusClass(s: number) {
  if (s >= 500) return "border-destructive/30 bg-destructive/15 text-destructive";
  if (s >= 400) return "border-warning/30 bg-warning/15 text-warning";
  return "border-success/30 bg-success/15 text-success";
}

function AuditLogPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const [q, setQ] = useState("");
  const [user, setUser] = useState("");
  const [method, setMethod] = useState<string>("all");
  const [url, setUrl] = useState("");
  const [statusFrom, setStatusFrom] = useState("");
  const [statusTo, setStatusTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [requestId, setRequestId] = useState("");

  // ENTRY 012 — no DB-backed endpoint-logging model; the endpoint returns an
  // empty paginated envelope, so the screen renders an empty state.
  const auditQuery = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => listAuditLog(),
    enabled: has("audit_log.view"),
    retry: false,
  });
  const entries: AuditEntry[] = auditQuery.data?.results ?? [];

  const rows = useMemo(() => {
    return entries.filter((e) => {
      if (q && !`${e.url} ${e.user}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (user && !e.user.toLowerCase().includes(user.toLowerCase())) return false;
      if (method !== "all" && e.method !== method) return false;
      if (url && !e.url.toLowerCase().includes(url.toLowerCase())) return false;
      if (statusFrom && e.status < Number(statusFrom)) return false;
      if (statusTo && e.status > Number(statusTo)) return false;
      if (dateFrom && e.timestamp.slice(0, 10) < dateFrom) return false;
      if (dateTo && e.timestamp.slice(0, 10) > dateTo) return false;
      if (requestId && !e.request_id.includes(requestId)) return false;
      return true;
    });
  }, [q, user, method, url, statusFrom, statusTo, dateFrom, dateTo, requestId]);

  if (!has("audit_log.view")) {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.auditLog.title")} description={t("admin.auditLog.subtitle")} />
        <ForbiddenState perms={["audit_log.view"]} />
      </div>
    );
  }

  const avgLatency = Math.round(
    entries.reduce((a, e) => a + e.latency_ms, 0) / Math.max(1, entries.length),
  );
  const errors = entries.filter((e) => e.status >= 500).length;

  const columns: Column<AuditEntry>[] = [
    {
      id: "timestamp",
      header: t("admin.auditLog.colTimestamp"),
      cell: (e) => <span className="font-mono text-xs">{e.timestamp}</span>,
      sortValue: (e) => e.timestamp,
    },
    {
      id: "request_id",
      header: t("admin.auditLog.colRequestId"),
      cell: (e) => (
        <code className="font-mono text-[11px] text-muted-foreground">{e.request_id}</code>
      ),
    },
    {
      id: "user",
      header: t("admin.auditLog.colUser"),
      cell: (e) => <span className="text-sm">{e.user}</span>,
      sortValue: (e) => e.user,
    },
    {
      id: "method",
      header: t("admin.auditLog.colMethod"),
      cell: (e) => (
        <Badge variant="outline" className={`font-mono text-[10px] ${METHOD_STYLE[e.method]}`}>
          {e.method}
        </Badge>
      ),
      sortValue: (e) => e.method,
    },
    {
      id: "url",
      header: t("admin.auditLog.colUrl"),
      cell: (e) => <code className="font-mono text-[11px] text-muted-foreground">{e.url}</code>,
    },
    {
      id: "status",
      header: t("admin.auditLog.colStatus"),
      align: "center",
      cell: (e) => (
        <Badge variant="outline" className={`font-mono text-[10px] ${statusClass(e.status)}`}>
          {e.status}
        </Badge>
      ),
      sortValue: (e) => e.status,
    },
    {
      id: "latency_ms",
      header: t("admin.auditLog.colLatency"),
      align: "end",
      cell: (e) => <span className="font-mono tabular-nums text-xs">{e.latency_ms} ms</span>,
      sortValue: (e) => e.latency_ms,
    },
    {
      id: "ip",
      header: t("admin.auditLog.colIp"),
      cell: (e) => <code className="font-mono text-[11px] text-muted-foreground">{e.ip}</code>,
    },
    {
      id: "user_agent",
      header: t("admin.auditLog.colUserAgent"),
      cell: (e) => (
        <span className="block max-w-[180px] truncate text-xs text-muted-foreground">
          {e.user_agent}
        </span>
      ),
    },
    {
      id: "payload_size",
      header: t("admin.auditLog.colPayload"),
      align: "end",
      cell: (e) => <span className="font-mono tabular-nums text-xs">{e.payload_size} B</span>,
      sortValue: (e) => e.payload_size,
    },
    {
      id: "response_size",
      header: t("admin.auditLog.colResponse"),
      align: "end",
      cell: (e) => <span className="font-mono tabular-nums text-xs">{e.response_size} B</span>,
      sortValue: (e) => e.response_size,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("admin.auditLog.title")} description={t("admin.auditLog.subtitle")} />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.auditLog.kTotal")}
          value={entries.length}
          icon={<ScrollText className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.auditLog.kErrors")}
          value={errors}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={errors > 0 ? "down" : "flat"}
        />
        <KpiCard
          label={t("admin.auditLog.kAvgLatency")}
          value={`${avgLatency} ms`}
          icon={<Timer className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="q" className="text-xs">
              {t("admin.common.search")}
            </Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("admin.auditLog.searchPlaceholder")}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-user" className="text-xs">
              {t("admin.auditLog.fUser")}
            </Label>
            <Input
              id="f-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admin.auditLog.fMethod")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.common.all")}</SelectItem>
                {RESOURCE_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-url" className="text-xs">
              {t("admin.auditLog.fUrl")}
            </Label>
            <Input
              id="f-url"
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-sf" className="text-xs">
              {t("admin.auditLog.fStatusFrom")}
            </Label>
            <Input
              id="f-sf"
              dir="ltr"
              inputMode="numeric"
              value={statusFrom}
              onChange={(e) => setStatusFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-st" className="text-xs">
              {t("admin.auditLog.fStatusTo")}
            </Label>
            <Input
              id="f-st"
              dir="ltr"
              inputMode="numeric"
              value={statusTo}
              onChange={(e) => setStatusTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-df" className="text-xs">
              {t("admin.auditLog.fDateFrom")}
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
              {t("admin.auditLog.fDateTo")}
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
            <Label htmlFor="f-rid" className="text-xs">
              {t("admin.auditLog.fRequestId")}
            </Label>
            <Input
              id="f-rid"
              dir="ltr"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="h-9 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <PageStates
          state={state}
          missingPerms={["audit_log.view"]}
          empty={
            <div className="rounded-2xl border border-dashed bg-muted/30 p-16 text-center text-sm text-muted-foreground">
              {t("admin.auditLog.emptyDesc")}
            </div>
          }
        >
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(e) => e.id}
            onRowClick={setSelected}
          />
        </PageStates>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{t("admin.auditLog.drawerTitle")}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selected.request_id}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 py-6">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("admin.auditLog.meta")}
                  </p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">{t("admin.auditLog.colMethod")}</dt>
                    <dd>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] ${METHOD_STYLE[selected.method]}`}
                      >
                        {selected.method}
                      </Badge>
                    </dd>
                    <dt className="text-muted-foreground">{t("admin.auditLog.colStatus")}</dt>
                    <dd>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] ${statusClass(selected.status)}`}
                      >
                        {selected.status}
                      </Badge>
                    </dd>
                    <dt className="text-muted-foreground">{t("admin.auditLog.colUrl")}</dt>
                    <dd className="break-all font-mono text-xs">{selected.url}</dd>
                    <dt className="text-muted-foreground">{t("admin.auditLog.colUser")}</dt>
                    <dd>{selected.user}</dd>
                    <dt className="text-muted-foreground">{t("admin.auditLog.colLatency")}</dt>
                    <dd className="font-mono tabular-nums">{selected.latency_ms} ms</dd>
                    <dt className="text-muted-foreground">{t("admin.auditLog.colIp")}</dt>
                    <dd className="font-mono text-xs">{selected.ip}</dd>
                  </dl>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("admin.auditLog.request")}
                  </p>
                  <pre
                    dir="ltr"
                    className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-[11px]"
                  >
                    {selected.request_body}
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("admin.auditLog.response")}
                  </p>
                  <pre
                    dir="ltr"
                    className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-[11px]"
                  >
                    {selected.response_body}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
