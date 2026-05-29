import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Download,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can, usePermissions } from "@/components/shared/Can";
import { PageStates, CardsSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import {
  listOrders,
  transitionOrderStatus,
  type OrderListItem,
  type OrderStatusName,
} from "@/lib/api/orders.functions";

// Frozen-UI local types (were imported from mock/sales). The §8.1 table renders
// these names; they are mapped from the BE OrderList below.
type OrderStatus = OrderStatusName;
type PaymentType = "COD" | "CC" | "QR" | "NS";
type TransferStatus = "PENDING" | "IN_WALLET" | "TRANSFERRED";
interface Order {
  id: string;
  number: string;
  customer: string;
  store: string;
  total: number;
  status: OrderStatus;
  payment: "PAID" | "PENDING" | "REFUNDED";
  items: number;
  placed: string;
}

function num(s: string | number | null | undefined): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export const Route = createFileRoute("/_panel/orders")({
  head: () => ({ meta: [{ title: "Orders — Mixlebs Admin" }] }),
  component: OrdersPage,
});

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "READY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "DECLINED",
  "DELIVERY_ISSUE",
];
const PAYMENT_TYPES: PaymentType[] = ["COD", "CC", "QR", "NS"];
const TRANSFER_STATUSES: TransferStatus[] = ["PENDING", "IN_WALLET", "TRANSFERRED"];

interface OrderRow extends Order {
  paymentType: PaymentType;
  transferStatus: TransferStatus;
  courier: string;
  subtotal: number;
  tax: number;
  delivery: number;
  hasCoupon: boolean;
  deliveredAt?: string;
}

function OrdersPage() {
  const t = useT();
  const navigate = useNavigate();
  const previewState = usePageState();
  const { role, stores, currentStoreId } = useApp();
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const showStore = role !== "store";

  // Live orders. STAFF/ADMIN scope to the topbar store picker (null = all);
  // STORE users are auto-scoped on the BE.
  const ordersQuery = useQuery({
    queryKey: ["orders", currentStoreId],
    queryFn: () => listOrders({ data: { store_id: currentStoreId, page_size: 200 } }),
    staleTime: 30 * 1000,
  });

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stores]);

  // Bulk status transition. Each selected order is transitioned independently;
  // the BE rejects illegal/unpermitted edges per row (surfaced via toast).
  const bulkTransition = useMutation({
    mutationFn: async (v: { ids: string[]; status: OrderStatusName }) => {
      await Promise.all(
        v.ids.map((id) => transitionOrderStatus({ data: { id, status: v.status } })),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => transitionOrderStatus({ data: { id, status: "CANCELLED" } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["orders"] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");
  const [payment, setPayment] = useState<"ALL" | PaymentType>("ALL");
  const [transfer, setTransfer] = useState<"ALL" | TransferStatus>("ALL");
  const [storeId, setStoreId] = useState<"ALL" | string>("ALL");
  const [courier, setCourier] = useState<"ALL" | string>("ALL");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [hasCoupon, setHasCoupon] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Map the BE OrderList page into the frozen-UI OrderRow shape (§8.1).
  const rows: OrderRow[] = useMemo(
    () =>
      (ordersQuery.data?.results ?? []).map((o: OrderListItem): OrderRow => {
        const transfer = (o.transfer_status as TransferStatus) ?? "PENDING";
        // `payment` (PAID/PENDING/REFUNDED) drives the revenue KPI only; derive
        // it from transfer_status / order_status since the BE has no such field.
        const payment: Order["payment"] =
          o.order_status === "CANCELLED"
            ? "REFUNDED"
            : transfer === "TRANSFERRED" || transfer === "IN_WALLET"
              ? "PAID"
              : "PENDING";
        return {
          id: String(o.id),
          number: o.order_number,
          customer: o.customer_name,
          store: o.store ? (storeNameById.get(o.store) ?? o.store_name ?? o.store) : (o.store_name ?? ""),
          total: num(o.total),
          status: o.order_status,
          payment,
          items: o.items_count,
          placed: o.created_at ? o.created_at.slice(0, 16).replace("T", " ") : "",
          paymentType: (o.payment_type as PaymentType) ?? "COD",
          transferStatus: transfer,
          courier: o.courier_name ?? "",
          subtotal: num(o.subtotal),
          tax: num(o.tax),
          delivery: num(o.delivery_fees),
          hasCoupon: o.has_coupon,
          deliveredAt: o.delivered_at ? o.delivered_at.slice(0, 16).replace("T", " ") : undefined,
        };
      }),
    [ordersQuery.data, storeNameById],
  );

  // Drive the page state from the live query (preview override still honoured).
  const state: PageState =
    previewState !== "populated"
      ? previewState
      : ordersQuery.isLoading
        ? "loading"
        : ordersQuery.isError
          ? "error"
          : "populated";

  const courierOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.courier))), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((o) => {
      if (status !== "ALL" && o.status !== status) return false;
      if (payment !== "ALL" && o.paymentType !== payment) return false;
      if (transfer !== "ALL" && o.transferStatus !== transfer) return false;
      if (showStore && storeId !== "ALL" && o.store !== storeId) return false;
      if (courier !== "ALL" && o.courier !== courier) return false;
      if (hasCoupon && !o.hasCoupon) return false;
      if (minTotal && o.total < Number(minTotal)) return false;
      if (maxTotal && o.total > Number(maxTotal)) return false;
      if (dateFrom && o.placed < dateFrom) return false;
      if (dateTo && o.placed > `${dateTo} 23:59`) return false;
      if (
        search &&
        !`${o.number} ${o.customer} ${o.store}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    rows,
    status,
    payment,
    transfer,
    storeId,
    courier,
    hasCoupon,
    minTotal,
    maxTotal,
    dateFrom,
    dateTo,
    search,
    showStore,
  ]);

  const revenue = rows.reduce((a, o) => a + (o.payment === "PAID" ? o.total : 0), 0);
  const pending = rows.filter((o) => o.status === "PENDING").length;
  const issues = rows.filter(
    (o) => o.status === "DELIVERY_ISSUE" || o.status === "DECLINED",
  ).length;
  const fulfilled = rows.filter((o) => o.status === "DELIVERED").length;

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("");

  const columns: Column<OrderRow>[] = [
    {
      id: "number",
      header: t("sales.orders.colOrder"),
      sortValue: (o) => o.number,
      cell: (o) => (
        <div>
          <div className="font-mono text-sm font-semibold text-primary">{o.number}</div>
          <div className="text-xs text-muted-foreground">{o.id}</div>
        </div>
      ),
    },
    {
      id: "customer",
      header: t("sales.orders.colCustomer"),
      sortValue: (o) => o.customer,
      cell: (o) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-xs">{initials(o.customer)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{o.customer}</span>
        </div>
      ),
    },
    ...(showStore
      ? [
          {
            id: "store",
            header: t("sales.orders.colStore"),
            sortValue: (o: OrderRow) => o.store,
            cell: (o: OrderRow) => <span className="text-sm">{o.store}</span>,
          },
        ]
      : []),
    {
      id: "items",
      header: t("sales.orders.colItems"),
      align: "end" as const,
      sortValue: (o) => o.items,
      cell: (o) => <span className="text-sm text-muted-foreground tabular-nums">{o.items}</span>,
    },
    {
      id: "subtotal",
      header: t("sales.orders.colSubtotal"),
      align: "end" as const,
      sortValue: (o) => o.subtotal,
      cell: (o) => <span className="font-mono text-sm tabular-nums">${o.subtotal.toFixed(2)}</span>,
    },
    {
      id: "tax",
      header: t("sales.orders.colTax"),
      align: "end" as const,
      sortValue: (o) => o.tax,
      cell: (o) => <span className="font-mono text-sm tabular-nums">${o.tax.toFixed(2)}</span>,
    },
    {
      id: "delivery",
      header: t("sales.orders.colDelivery"),
      align: "end" as const,
      sortValue: (o) => o.delivery,
      cell: (o) => <span className="font-mono text-sm tabular-nums">${o.delivery.toFixed(2)}</span>,
    },
    {
      id: "total",
      header: t("sales.orders.colTotal"),
      align: "end" as const,
      sortValue: (o) => o.total,
      cell: (o) => (
        <span className="font-mono font-semibold tabular-nums">${o.total.toFixed(2)}</span>
      ),
    },
    {
      id: "paymentType",
      header: t("sales.orders.colPayment"),
      cell: (o) => <span className="font-mono text-xs">{o.paymentType}</span>,
    },
    {
      id: "status",
      header: t("sales.orders.colStatus"),
      sortValue: (o) => o.status,
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      id: "transferStatus",
      header: t("sales.orders.colTransfer"),
      cell: (o) => <StatusBadge status={o.transferStatus} />,
    },
    {
      id: "courier",
      header: t("sales.orders.colCourier"),
      cell: (o) => <span className="text-sm text-muted-foreground">{o.courier}</span>,
    },
    {
      id: "placed",
      header: t("sales.orders.colPlaced"),
      align: "end" as const,
      sortValue: (o) => o.placed,
      cell: (o) => <span className="text-xs text-muted-foreground">{o.placed}</span>,
    },
    {
      id: "delivered",
      header: t("sales.orders.colDelivered"),
      align: "end" as const,
      cell: (o) => <span className="text-xs text-muted-foreground">{o.deliveredAt ?? "—"}</span>,
    },
  ];

  const filters = (
    <>
      <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("sales.orders.filterStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.orders.allStatuses")}</SelectItem>
          {ORDER_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={payment} onValueChange={(v) => setPayment(v as typeof payment)}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder={t("sales.orders.filterPayment")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.orders.allPayments")}</SelectItem>
          {PAYMENT_TYPES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={transfer} onValueChange={(v) => setTransfer(v as typeof transfer)}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder={t("sales.orders.filterTransfer")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.orders.allTransfers")}</SelectItem>
          {TRANSFER_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStore && (
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder={t("sales.orders.filterStore")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("sales.orders.allStores")}</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={courier} onValueChange={setCourier}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={t("sales.orders.filterCourier")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("sales.orders.allCouriers")}</SelectItem>
          {courierOptions.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        dir="ltr"
        inputMode="decimal"
        value={minTotal}
        onChange={(e) => setMinTotal(e.target.value)}
        placeholder={t("sales.orders.filterMinTotal")}
        className="h-9 w-[110px]"
      />
      <Input
        dir="ltr"
        inputMode="decimal"
        value={maxTotal}
        onChange={(e) => setMaxTotal(e.target.value)}
        placeholder={t("sales.orders.filterMaxTotal")}
        className="h-9 w-[110px]"
      />
      <Input
        dir="ltr"
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        aria-label={t("sales.orders.filterDateFrom")}
        className="h-9 w-[150px]"
      />
      <Input
        dir="ltr"
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        aria-label={t("sales.orders.filterDateTo")}
        className="h-9 w-[150px]"
      />
      <div className="flex items-center gap-2">
        <Switch id="has-coupon" checked={hasCoupon} onCheckedChange={setHasCoupon} />
        <Label htmlFor="has-coupon" className="whitespace-nowrap text-sm font-normal">
          {t("sales.orders.filterHasCoupon")}
        </Label>
      </div>
    </>
  );

  return (
    <div className="p-6">
      <PageHeader
        title={t("sales.orders.title")}
        description={t("sales.orders.description")}
        actions={
          <>
            <Can perm="orders.export">
              <Button variant="outline" onClick={() => toast.success(t("sales.orders.export"))}>
                <Download className="me-1.5 h-4 w-4" /> {t("sales.orders.export")}
              </Button>
            </Can>
            <Can perm="orders.transition_status">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => toast.info(t("sales.orders.bulkTransition"))}
              >
                <ArrowLeftRight className="me-1.5 h-4 w-4" /> {t("sales.orders.bulkTransition")}
              </Button>
            </Can>
          </>
        }
      />

      <PageStates state={state} skeleton={<CardsSkeleton />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("sales.orders.kpiRevenue")}
            value={`$${revenue.toFixed(2)}`}
            delta={t("sales.orders.kpiRevenueDelta")}
            trend="up"
            icon={<ShoppingCart className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("sales.orders.kpiPending")}
            value={pending}
            delta={t("sales.orders.kpiPendingDelta")}
            trend="flat"
            icon={<Clock className="h-5 w-5" />}
          />
          <KpiCard
            label={t("sales.orders.kpiDelivered")}
            value={fulfilled}
            delta={t("sales.orders.kpiDeliveredDelta")}
            trend="up"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <KpiCard
            label={t("sales.orders.kpiIssues")}
            value={issues}
            delta={t("sales.orders.kpiIssuesDelta")}
            trend="down"
            icon={<AlertCircle className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("sales.orders.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("sales.orders.count")}
            filters={filters}
          />

          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(o) => o.id}
            onRowClick={(o) => navigate({ to: "/orders/$id", params: { id: o.id } })}
            bulkActions={
              has("orders.transition_status")
                ? [
                    {
                      label: t("sales.orders.bulkTransition"),
                      onClick: (ids) => bulkTransition.mutate({ ids, status: "READY" }),
                    },
                  ]
                : undefined
            }
            emptyState={
              <div className="grid h-40 place-items-center text-center">
                <div>
                  <p className="font-display text-base font-semibold">
                    {t("sales.orders.emptyTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("sales.orders.emptyDesc")}
                  </p>
                </div>
              </div>
            }
            rowActions={(o) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-60 group-hover:opacity-100"
                    aria-label={t("common.actions")}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/orders/$id", params: { id: o.id } })}
                  >
                    {t("sales.orders.view")}
                  </DropdownMenuItem>
                  <Can perm="invoices.download">
                    <DropdownMenuItem onClick={() => toast.success(t("sales.orders.printInvoice"))}>
                      {t("sales.orders.printInvoice")}
                    </DropdownMenuItem>
                  </Can>
                  <DropdownMenuItem onClick={() => navigate({ to: "/chat" })}>
                    {t("sales.orders.contactCustomer")}
                  </DropdownMenuItem>
                  <Can perm="orders.cancel">
                    {(o.status === "PENDING" || o.status === "READY") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            cancelMutation.mutate(o.id, {
                              onSuccess: () => toast.success(t("sales.order.toastCancelled")),
                            })
                          }
                        >
                          {t("sales.orders.cancel")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </Can>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </div>
      </PageStates>
    </div>
  );
}
