import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Undo2, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/components/shared/Can";
import { PageStates, CardsSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RETURNS } from "@/lib/mock-data";
import { returnDetail } from "@/lib/mock/sales";
import { useApp } from "@/lib/app-context";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_panel/returns")({
  head: () => ({ meta: [{ title: "Returns — Mixlebs Admin" }] }),
  component: ReturnsPage,
});

const RETURN_STATUSES = [
  "PENDING",
  "CHECKING",
  "APPROVED",
  "RETURNED",
  "DECLINED",
  "DELIVERY_ISSUE",
  "BLOCKED",
] as const;
const REASONS = ["Damaged on arrival", "Wrong item", "Quality issue", "Changed mind"];

type ReturnRow = (typeof RETURNS)[number] & {
  qty: number;
  handlingFees: number;
  courier: string;
  item: string;
};

function ReturnsPage() {
  const t = useT();
  const navigate = useNavigate();
  const state = usePageState();
  const { role, stores } = useApp();
  const showStore = role !== "store";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [reason, setReason] = useState<string>("ALL");
  const [courier, setCourier] = useState<string>("ALL");
  const [storeId, setStoreId] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const rows: ReturnRow[] = useMemo(
    () =>
      RETURNS.map((r) => {
        const d = returnDetail({ value: r.value, status: r.status });
        return { ...r, qty: d.qty, handlingFees: d.handlingFees, courier: d.courier, item: d.name };
      }),
    [],
  );

  const courierOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.courier))), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "ALL" && r.status !== status) return false;
        if (reason !== "ALL" && r.reason !== reason) return false;
        if (courier !== "ALL" && r.courier !== courier) return false;
        if (dateFrom && r.opened < dateFrom) return false;
        if (dateTo && r.opened > dateTo) return false;
        if (
          search &&
          !`${r.id} ${r.order} ${r.customer}`.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
        // storeId filter is illustrative; the mock RETURNS have no store field.
      }),
    [rows, status, reason, courier, dateFrom, dateTo, search],
  );

  // KPI counts (mock RETURNS uses REJECTED in place of DECLINED).
  const open = rows.filter((r) => r.status === "CHECKING" || r.status === "PENDING").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const returned = rows.filter((r) => r.status === "RETURNED").length;
  const declined = rows.filter((r) => r.status === "REJECTED" || r.status === "DECLINED").length;

  const columns: Column<ReturnRow>[] = [
    {
      id: "id",
      header: t("sales.returns.colReturn"),
      sortValue: (r) => r.id,
      cell: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>,
    },
    {
      id: "order",
      header: t("sales.returns.colOrder"),
      sortValue: (r) => r.order,
      cell: (r) => <span className="font-mono text-sm">{r.order}</span>,
    },
    {
      id: "item",
      header: t("sales.returns.colItem"),
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted font-mono text-[10px]">
            IMG
          </div>
          <span className="text-sm">{r.item}</span>
        </div>
      ),
    },
    {
      id: "qty",
      header: t("sales.returns.colQty"),
      align: "end" as const,
      cell: (r) => <span className="font-mono tabular-nums">{r.qty}</span>,
    },
    {
      id: "reason",
      header: t("sales.returns.colReason"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.reason}</span>,
    },
    {
      id: "status",
      header: t("sales.returns.colStatus"),
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      id: "courier",
      header: t("sales.returns.colCourier"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.courier}</span>,
    },
    {
      id: "subtotal",
      header: t("sales.returns.colSubtotal"),
      align: "end" as const,
      sortValue: (r) => r.value,
      cell: (r) => <span className="font-mono tabular-nums">${r.value.toFixed(2)}</span>,
    },
    {
      id: "handling",
      header: t("sales.returns.colHandling"),
      align: "end" as const,
      cell: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          ${r.handlingFees.toFixed(2)}
        </span>
      ),
    },
    {
      id: "opened",
      header: t("sales.returns.colRequested"),
      align: "end" as const,
      sortValue: (r) => r.opened,
      cell: (r) => <span className="text-xs text-muted-foreground">{r.opened}</span>,
    },
  ];

  const filters = (
    <>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("sales.returns.filterStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.returns.allStatuses")}</SelectItem>
          {RETURN_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder={t("sales.returns.filterReason")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.returns.allReasons")}</SelectItem>
          {REASONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={courier} onValueChange={setCourier}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("sales.returns.filterCourier")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.returns.filterCourier")}</SelectItem>
          {courierOptions.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStore && (
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder={t("sales.returns.filterStore")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("sales.returns.filterStore")}</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Input
        dir="ltr"
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        aria-label={t("sales.returns.colRequested")}
        className="h-9 w-[150px]"
      />
      <Input
        dir="ltr"
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        aria-label={t("sales.returns.colRequested")}
        className="h-9 w-[150px]"
      />
    </>
  );

  return (
    <div className="p-6">
      <PageHeader title={t("sales.returns.title")} description={t("sales.returns.description")} />

      <PageStates state={state} skeleton={<CardsSkeleton />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("sales.returns.kpiOpen")}
            value={open}
            icon={<Clock className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("sales.returns.kpiApproved")}
            value={approved}
            icon={<Check className="h-5 w-5" />}
          />
          <KpiCard
            label={t("sales.returns.kpiReturned")}
            value={returned}
            icon={<Undo2 className="h-5 w-5" />}
          />
          <KpiCard
            label={t("sales.returns.kpiDeclined")}
            value={declined}
            icon={<X className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("sales.returns.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("sales.returns.count")}
            filters={filters}
          />

          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate({ to: "/returns/$id", params: { id: r.id } })}
            emptyState={
              <div className="grid h-40 place-items-center text-center">
                <div>
                  <p className="font-display text-base font-semibold">
                    {t("sales.returns.emptyTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("sales.returns.emptyDesc")}
                  </p>
                </div>
              </div>
            }
            rowActions={(r) =>
              r.status === "PENDING" || r.status === "CHECKING" ? (
                <div className="flex justify-end gap-1">
                  <Can perm="returns.reject">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(t("sales.returns.toastRejected"));
                      }}
                    >
                      {t("sales.returns.reject")}
                    </Button>
                  </Can>
                  <Can perm="returns.approve">
                    <Button
                      size="sm"
                      className="h-7 bg-gradient-primary text-xs text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(t("sales.returns.toastApproved"));
                      }}
                    >
                      {t("sales.returns.approve")}
                    </Button>
                  </Can>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => navigate({ to: "/returns/$id", params: { id: r.id } })}
                >
                  {t("sales.returns.view")}
                </Button>
              )
            }
          />
        </div>
      </PageStates>
    </div>
  );
}
