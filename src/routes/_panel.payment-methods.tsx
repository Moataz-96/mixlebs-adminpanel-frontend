import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CreditCard, Star, MoreHorizontal, Pencil, Trash2, Store } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can, usePermissions } from "@/components/shared/Can";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { parseServerError } from "@/lib/api/error";
import {
  listPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
} from "@/lib/api/payment_methods.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_panel/payment-methods")({
  head: () => ({ meta: [{ title: "Payment methods — Mixlebs Admin" }] }),
  component: PaymentMethodsPage,
});

// Frozen-UI row shape (was imported from mock/finance). Mapped from the BE
// PaymentMethod; `store` columns are not rendered by §9.4 (per-store scope).
interface PaymentMethodRow {
  id: string;
  brand: "Visa" | "Mastercard" | "Other";
  holder_name: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

function mapMethod(p: PaymentMethod): PaymentMethodRow {
  return {
    id: p.id,
    brand: (p.brand as PaymentMethodRow["brand"]) ?? "Other",
    holder_name: p.holder_name,
    last4: p.last4 ?? "",
    exp_month: p.exp_month,
    exp_year: p.exp_year,
    is_default: p.is_default,
    created_at: p.created_at ? p.created_at.slice(0, 10) : "",
  };
}

const BRAND_TINT: Record<string, string> = {
  Visa: "border-info/30 bg-info/10 text-info",
  Mastercard: "border-warning/30 bg-warning/10 text-warning",
  Other: "border-border bg-muted text-muted-foreground",
};

function maskCard(last4: string) {
  return last4 ? `•••• ${last4}` : "—";
}

function PaymentMethodsPage() {
  const t = useT();
  const navigate = useNavigate();
  const previewState = usePageState();
  const { role } = usePermissions();
  const { currentStoreId, stores } = useApp();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  // STORE is implicitly scoped; STAFF/ADMIN must pick a store before the list
  // loads. The picker defaults to the topbar store (currentStoreId) when set.
  const isStore = role === "store";
  const [storeFilter, setStoreFilter] = useState<string>(isStore ? "" : (currentStoreId ?? ""));

  // store_id is omitted for STORE (BE auto-scopes); STAFF/ADMIN scope by picker.
  const effectiveStoreId = isStore ? null : storeFilter || null;
  const needsStore = !isStore && !storeFilter;

  const methodsQuery = useQuery({
    queryKey: ["payment-methods", effectiveStoreId, isStore],
    queryFn: () => listPaymentMethods({ data: { store_id: effectiveStoreId, page_size: 200 } }),
    enabled: isStore || !!storeFilter,
    staleTime: 30 * 1000,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => updatePaymentMethod({ data: { id, is_default: true } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod({ data: { id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const scoped = useMemo(
    () => (methodsQuery.data?.results ?? []).map(mapMethod),
    [methodsQuery.data],
  );

  const filtered = useMemo(
    () =>
      scoped.filter(
        (p) => !q || `${p.holder_name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [scoped, q],
  );

  const active = scoped.length;
  const defaultMethod = scoped.find((p) => p.is_default);

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : methodsQuery.isLoading
        ? "loading"
        : methodsQuery.isError
          ? "error"
          : "populated";

  const columns: Column<PaymentMethodRow>[] = [
    {
      id: "brand",
      header: t("finance.payments.colBrand"),
      sortValue: (p) => p.brand,
      cell: (p) => (
        <Badge variant="outline" className={BRAND_TINT[p.brand]}>
          {p.brand}
        </Badge>
      ),
    },
    {
      id: "holder",
      header: t("finance.payments.colHolder"),
      sortValue: (p) => p.holder_name,
      cell: (p) => <span className="font-medium">{p.holder_name}</span>,
    },
    {
      id: "card",
      header: t("finance.payments.colCard"),
      cell: (p) => <span className="font-mono text-sm tabular-nums">{maskCard(p.last4)}</span>,
    },
    {
      id: "expiry",
      header: t("finance.payments.colExpiry"),
      align: "center",
      sortValue: (p) => p.exp_year * 100 + p.exp_month,
      cell: (p) => (
        <span className="font-mono text-sm tabular-nums">
          {String(p.exp_month).padStart(2, "0")}/{p.exp_year}
        </span>
      ),
    },
    {
      id: "default",
      header: t("finance.payments.colDefault"),
      align: "center",
      sortValue: (p) => (p.is_default ? 1 : 0),
      cell: (p) =>
        p.is_default ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            <Star className="me-1 h-3 w-3" /> {t("finance.payments.isDefault")}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "created",
      header: t("finance.payments.colCreated"),
      align: "end",
      sortValue: (p) => p.created_at,
      cell: (p) => <span className="text-xs text-muted-foreground">{p.created_at}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("finance.payments.title")}
        description={t("finance.payments.description")}
        actions={
          <Can perm="payment_methods.update">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={needsStore}
              onClick={() =>
                navigate({
                  to: "/payment-methods/new",
                  search: { store_id: effectiveStoreId ?? undefined },
                })
              }
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("finance.payments.addMethod")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("finance.payments.kpiConfigured")}
          value={scoped.length}
          icon={<CreditCard className="h-5 w-5" />}
          accent
        />
        <KpiCard label={t("finance.payments.kpiActive")} value={active} />
        <KpiCard
          label={t("finance.payments.kpiDefault")}
          value={
            defaultMethod
              ? `${defaultMethod.brand} ${maskCard(defaultMethod.last4)}`
              : t("finance.payments.none")
          }
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("finance.payments.searchPlaceholder")}
          count={filtered.length}
          countLabel={t("finance.payments.countLabel")}
          filters={
            !isStore ? (
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder={t("finance.payments.storeFilter")} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        />

        {needsStore ? (
          <Card className="flex flex-col items-center justify-center border-0 bg-muted/30 px-6 py-16 text-center shadow-soft">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background text-primary shadow-soft">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">
              {t("finance.payments.pickStoreTitle")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("finance.payments.pickStoreDesc")}
            </p>
          </Card>
        ) : (
          <PageStates
            state={state}
            skeleton={<TableSkeleton rows={4} cols={6} />}
            empty={<EmptyPayments />}
            missingPerms={["payment_methods.view"]}
          >
            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(p) => p.id}
              emptyState={<EmptyPayments />}
              rowActions={(p) => (
                <PaymentRowActions
                  method={p}
                  onSetDefault={() => setDefaultMutation.mutate(p.id)}
                  onDelete={() => removeMutation.mutate(p.id)}
                />
              )}
            />
          </PageStates>
        )}
      </div>
    </div>
  );
}

function PaymentRowActions({
  method,
  onSetDefault,
  onDelete,
}: {
  method: PaymentMethodRow;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  if (!has("payment_methods.update")) return null;
  return (
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
        {!method.is_default && (
          <DropdownMenuItem onClick={onSetDefault}>
            <Star className="me-2 h-3.5 w-3.5" /> {t("finance.payments.setDefault")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => navigate({ to: "/payment-methods/$id/edit", params: { id: method.id } })}
        >
          <Pencil className="me-2 h-3.5 w-3.5" /> {t("finance.payments.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
              <Trash2 className="me-2 h-3.5 w-3.5" /> {t("finance.payments.delete")}
            </DropdownMenuItem>
          }
          title={t("finance.payments.deleteConfirmTitle")}
          destructive
          typeToConfirm={method.last4 || method.brand}
          confirmLabel={t("finance.payments.delete")}
          onConfirm={onDelete}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyPayments() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <CreditCard className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {t("finance.payments.emptyTitle")}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("finance.payments.emptyDesc")}
      </p>
      <Can perm="payment_methods.update">
        <Button
          className="mt-5 bg-gradient-primary text-primary-foreground shadow-glow"
          onClick={() => navigate({ to: "/payment-methods/new", search: { store_id: undefined } })}
        >
          <Plus className="me-1.5 h-4 w-4" /> {t("finance.payments.addMethod")}
        </Button>
      </Can>
    </div>
  );
}
