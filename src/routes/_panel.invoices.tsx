import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Download, Eye, Mail } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can } from "@/components/shared/Can";
import { PageStates, CardsSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVOICES } from "@/lib/mock-data";
import type { InvoiceType } from "@/lib/mock/sales";
import { useApp } from "@/lib/app-context";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_panel/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Mixlebs Admin" }] }),
  component: InvoicesPage,
});

type InvoiceRow = (typeof INVOICES)[number] & { type: InvoiceType };

function InvoicesPage() {
  const t = useT();
  const navigate = useNavigate();
  const state = usePageState();
  const { role, stores } = useApp();
  const showStore = role !== "store";

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"ALL" | InvoiceType>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [storeId, setStoreId] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Mock INVOICES are all ORDER invoices; mark one as a RETURN for variety.
  const rows: InvoiceRow[] = useMemo(
    () => INVOICES.map((i, idx) => ({ ...i, type: idx % 3 === 1 ? "RETURN" : "ORDER" })),
    [],
  );

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status))), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((i) => {
        if (type !== "ALL" && i.type !== type) return false;
        if (status !== "ALL" && i.status !== status) return false;
        if (dateFrom && i.issued < dateFrom) return false;
        if (dateTo && i.issued > dateTo) return false;
        if (
          search &&
          !`${i.id} ${i.order} ${i.customer}`.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [rows, type, status, dateFrom, dateTo, search],
  );

  const total = rows.reduce((a, i) => a + i.amount, 0);

  const columns: Column<InvoiceRow>[] = [
    {
      id: "id",
      header: t("sales.invoices.colInvoice"),
      sortValue: (i) => i.id,
      cell: (i) => <span className="font-mono text-xs font-semibold text-primary">{i.id}</span>,
    },
    {
      id: "type",
      header: t("sales.invoices.colType"),
      cell: (i) => (
        <span className="font-mono text-xs">
          {i.type === "ORDER" ? t("sales.invoices.typeOrder") : t("sales.invoices.typeReturn")}
        </span>
      ),
    },
    {
      id: "related",
      header: t("sales.invoices.colRelated"),
      sortValue: (i) => i.order,
      cell: (i) => <span className="font-mono text-sm">{i.order}</span>,
    },
    {
      id: "customer",
      header: t("sales.invoices.colCustomer"),
      sortValue: (i) => i.customer,
      cell: (i) => <span className="text-sm">{i.customer}</span>,
    },
    {
      id: "amount",
      header: t("sales.invoices.colTotal"),
      align: "end" as const,
      sortValue: (i) => i.amount,
      cell: (i) => (
        <span className="font-mono font-semibold tabular-nums">${i.amount.toFixed(2)}</span>
      ),
    },
    {
      id: "status",
      header: t("sales.invoices.colStatus"),
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge status={i.status} />,
    },
    {
      id: "issued",
      header: t("sales.invoices.colDate"),
      align: "end" as const,
      sortValue: (i) => i.issued,
      cell: (i) => <span className="text-sm text-muted-foreground">{i.issued}</span>,
    },
  ];

  const filters = (
    <>
      <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder={t("sales.invoices.filterType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.invoices.allTypes")}</SelectItem>
          <SelectItem value="ORDER">{t("sales.invoices.typeOrder")}</SelectItem>
          <SelectItem value="RETURN">{t("sales.invoices.typeReturn")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("sales.invoices.filterStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.invoices.allStatuses")}</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStore && (
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder={t("sales.invoices.filterStore")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("sales.invoices.filterStore")}</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <input
        type="date"
        dir="ltr"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        aria-label={t("sales.invoices.colDate")}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      />
      <input
        type="date"
        dir="ltr"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        aria-label={t("sales.invoices.colDate")}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      />
    </>
  );

  return (
    <div className="p-6">
      <PageHeader title={t("sales.invoices.title")} description={t("sales.invoices.description")} />

      <PageStates state={state} skeleton={<CardsSkeleton count={3} />}>
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label={t("sales.invoices.kpiIssued")}
            value={`$${total.toFixed(2)}`}
            icon={<FileText className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("sales.invoices.kpiDocuments")}
            value={rows.length}
            icon={<FileText className="h-5 w-5" />}
          />
          <KpiCard
            label={t("sales.invoices.kpiThisMonth")}
            value={rows.length}
            delta={t("sales.invoices.kpiThisMonthDelta")}
            icon={<FileText className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("sales.invoices.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("sales.invoices.count")}
            filters={filters}
          />

          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(i) => i.id}
            onRowClick={(i) => navigate({ to: "/invoices/$id", params: { id: i.id } })}
            emptyState={
              <div className="grid h-40 place-items-center text-center">
                <div>
                  <p className="font-display text-base font-semibold">
                    {t("sales.invoices.emptyTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("sales.invoices.emptyDesc")}
                  </p>
                </div>
              </div>
            }
            rowActions={(i) => (
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  aria-label={t("sales.invoices.view")}
                  onClick={() => navigate({ to: "/invoices/$id", params: { id: i.id } })}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Can perm="invoices.download">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    aria-label={t("sales.invoices.download")}
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success(t("sales.invoice.downloadToast"));
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </Can>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  aria-label={t("sales.invoices.email")}
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success(t("sales.invoices.emailToast"));
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        </div>
      </PageStates>
    </div>
  );
}
