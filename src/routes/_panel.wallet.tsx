import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Plus,
  Minus,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Can, usePermissions } from "@/components/shared/Can";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import {
  adjustWallet,
  getWalletSummary,
  listWalletTransactions,
  type WalletTransaction,
} from "@/lib/api/wallet.functions";
import { parseServerError } from "@/lib/api/error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_panel/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Mixlebs Admin" }] }),
  component: WalletPage,
});

// Frozen-UI row shape (was imported from mock/finance). Mapped from the BE
// WalletTransaction. ENTRY 023: the BE now computes a per-row `balance_after`
// (running balance); the related-order/return ref still has no BE source so
// that column renders a static placeholder.
interface WalletTxRow {
  id: string;
  date: string;
  type: "CREDIT" | "DEBIT";
  label: string;
  amount: number;
  balance_after: number;
  related_kind?: "order" | "return";
  related_ref?: string;
}

function num(s: string | number | null | undefined): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function mapTx(tx: WalletTransaction): WalletTxRow {
  return {
    id: tx.id,
    date: tx.created_at ? tx.created_at.slice(0, 16).replace("T", " ") : "",
    type: tx.type === "credit" ? "CREDIT" : "DEBIT",
    label: tx.label,
    amount: num(tx.amount),
    balance_after: num(tx.balance_after), // ENTRY 023: computed running balance.
  };
}

function WalletPage() {
  const t = useT();
  const previewState = usePageState();
  const { has } = usePermissions();
  const canAdjust = has("wallet.view_any"); // adjustments are an admin-only surface
  const [type, setType] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [label, setLabel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Own wallet (user_id omitted -> caller's own; wallet.view_own).
  const summaryQuery = useQuery({
    queryKey: ["wallet", "summary"],
    queryFn: () => getWalletSummary({ data: {} }),
    staleTime: 30 * 1000,
  });
  const txQuery = useQuery({
    queryKey: ["wallet", "transactions", type, from, to],
    queryFn: () =>
      listWalletTransactions({
        data: {
          type: type === "ALL" ? undefined : type.toLowerCase(),
          date_from: from || undefined,
          date_to: to || undefined,
          page_size: 200,
        },
      }),
    staleTime: 30 * 1000,
  });

  const summary = summaryQuery.data;
  const rows = useMemo(() => (txQuery.data?.results ?? []).map(mapTx), [txQuery.data]);

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : summaryQuery.isLoading || txQuery.isLoading
        ? "loading"
        : summaryQuery.isError || txQuery.isError
          ? "error"
          : "populated";

  // label is filtered client-side (the BE `q` filter is also available but the
  // toolbar search box is debounced into this local state).
  const filtered = useMemo(
    () =>
      rows.filter((tx) => {
        if (label && !tx.label.toLowerCase().includes(label.toLowerCase())) return false;
        return true;
      }),
    [rows, label],
  );

  const columns: Column<WalletTxRow>[] = [
    {
      id: "date",
      header: t("finance.wallet.colDate"),
      sortValue: (tx) => tx.date,
      cell: (tx) => <span className="text-sm text-muted-foreground">{tx.date}</span>,
    },
    {
      id: "type",
      header: t("finance.wallet.colType"),
      sortValue: (tx) => tx.type,
      cell: (tx) => (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-xs ${tx.type === "CREDIT" ? "text-success" : "text-destructive"}`}
        >
          {tx.type === "CREDIT" ? (
            <ArrowDownLeft className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
          {tx.type === "CREDIT" ? t("finance.wallet.typeCredit") : t("finance.wallet.typeDebit")}
        </span>
      ),
    },
    {
      id: "label",
      header: t("finance.wallet.colLabel"),
      cell: (tx) => <span className="text-sm">{tx.label}</span>,
    },
    {
      id: "amount",
      header: t("finance.wallet.colAmount"),
      align: "end",
      sortValue: (tx) => tx.amount,
      cell: (tx) => (
        <span
          className={`font-mono tabular-nums ${tx.type === "CREDIT" ? "text-success" : "text-destructive"}`}
        >
          {tx.type === "CREDIT" ? "+" : "−"}${tx.amount.toFixed(2)}
        </span>
      ),
    },
    {
      id: "balanceAfter",
      header: t("finance.wallet.colBalanceAfter"),
      align: "end",
      sortValue: (tx) => tx.balance_after,
      cell: (tx) => <span className="font-mono tabular-nums">${tx.balance_after.toFixed(2)}</span>,
    },
    {
      id: "related",
      header: t("finance.wallet.colRelated"),
      align: "end",
      cell: (tx) =>
        tx.related_ref ? (
          <a
            href={tx.related_kind === "return" ? "/returns" : "/orders"}
            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
          >
            {tx.related_ref} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("finance.wallet.title")}
        description={t("finance.wallet.description")}
        actions={
          <Button variant="outline">
            <Download className="me-1.5 h-4 w-4" /> {t("finance.wallet.exportCsv")}
          </Button>
        }
      />

      {/* Summary card */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("finance.wallet.balance")}
          value={`$${num(summary?.balance).toFixed(2)}`}
          delta={t("finance.wallet.readyToWithdraw")}
          icon={<WalletIcon className="h-5 w-5" />}
          accent
        />
        <KpiCard label={t("finance.wallet.currency")} value={summary?.currency ?? "—"} />
        <KpiCard
          label={t("finance.wallet.lastCredited")}
          value={summary?.last_credited_at ? summary.last_credited_at.slice(0, 16).replace("T", " ") : "—"}
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
        <KpiCard
          label={t("finance.wallet.lastDebited")}
          value={summary?.last_debited_at ? summary.last_debited_at.slice(0, 16).replace("T", " ") : "—"}
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        <Tabs defaultValue="transactions">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="transactions">{t("finance.wallet.tabTransactions")}</TabsTrigger>
            {canAdjust && (
              <TabsTrigger value="adjustments">{t("finance.wallet.tabAdjustments")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="transactions" className="mt-5">
            <DataToolbar
              search={label}
              onSearch={setLabel}
              placeholder={t("finance.wallet.fLabelPlaceholder")}
              count={filtered.length}
              countLabel={t("finance.wallet.countLabel")}
              filters={
                <>
                  <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("finance.wallet.fAllTypes")}</SelectItem>
                      <SelectItem value="CREDIT">{t("finance.wallet.typeCredit")}</SelectItem>
                      <SelectItem value="DEBIT">{t("finance.wallet.typeDebit")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 w-[150px]"
                    aria-label={t("finance.wallet.fFrom")}
                    title={t("finance.wallet.fFrom")}
                  />
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 w-[150px]"
                    aria-label={t("finance.wallet.fTo")}
                    title={t("finance.wallet.fTo")}
                  />
                </>
              }
            />
            <PageStates
              state={state}
              skeleton={<TableSkeleton rows={5} cols={6} />}
              empty={<EmptyTx />}
              missingPerms={["wallet.view_own"]}
            >
              <DataTable
                data={filtered}
                columns={columns}
                getRowId={(tx) => tx.id}
                emptyState={<EmptyTx />}
              />
            </PageStates>
          </TabsContent>

          {canAdjust && (
            <TabsContent value="adjustments" className="mt-5">
              <Can perm="wallet.view_any" fallback={null}>
                <AdjustmentForm userId={summary?.user_id} />
              </Can>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

const adjSchema = z.object({
  amount: z.coerce.number().positive(),
  label: z.string().min(1).max(255),
});
type AdjValues = z.infer<typeof adjSchema>;

function AdjustmentForm({ userId }: { userId?: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<AdjValues>({
    resolver: zodResolver(adjSchema),
    defaultValues: { amount: 0, label: "" },
  });

  const mutation = useMutation({
    mutationFn: (vars: { type: "credit" | "debit"; amount: number; label: string }) =>
      adjustWallet({
        data: { user_id: userId!, type: vars.type, amount: vars.amount, label: vars.label },
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      const key =
        vars.type === "credit" ? "finance.wallet.adjCredited" : "finance.wallet.adjDebited";
      toast.success(t(key, { amount: `$${vars.amount.toFixed(2)}` }));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  function submit(type: "credit" | "debit") {
    if (!userId) return;
    handleSubmit((v) => mutation.mutate({ type, amount: Number(v.amount), label: v.label }))();
  }
  function credit() {
    submit("credit");
  }
  function debit() {
    submit("debit");
  }

  return (
    <Card className="border-0 bg-card p-6 shadow-soft">
      <h3 className="font-display text-base font-semibold">{t("finance.wallet.adjTitle")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("finance.wallet.adjDesc")}</p>
      <form
        className="mt-5 grid gap-5 md:grid-cols-2"
        onSubmit={(e) => e.preventDefault()}
        noValidate
      >
        <div>
          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("finance.wallet.adjAmount")}
          </Label>
          <Input
            dir="ltr"
            type="number"
            step="0.01"
            className="font-mono"
            aria-invalid={!!errors.amount}
            {...register("amount")}
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("finance.wallet.adjLabel")}
          </Label>
          <Input
            placeholder={t("finance.wallet.adjLabelPlaceholder")}
            aria-invalid={!!errors.label}
            {...register("label")}
          />
          {errors.label && <p className="mt-1 text-xs text-destructive">{errors.label.message}</p>}
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button
            type="button"
            onClick={credit}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Plus className="me-1.5 h-4 w-4" /> {t("finance.wallet.addCredit")}
          </Button>
          <Button type="button" variant="outline" onClick={debit} className="text-destructive">
            <Minus className="me-1.5 h-4 w-4" /> {t("finance.wallet.addDebit")}
          </Button>
          {/* getValues kept referenced for wire-up parity */}
          <span className="hidden">{String(getValues().label)}</span>
        </div>
      </form>
    </Card>
  );
}

function EmptyTx() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <WalletIcon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{t("finance.wallet.emptyTitle")}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("finance.wallet.emptyDesc")}</p>
    </div>
  );
}
