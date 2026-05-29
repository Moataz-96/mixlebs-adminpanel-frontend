import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
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
import { WALLET_TX_ROWS, WALLET_SUMMARY, type WalletTxRow } from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Mixlebs Admin" }] }),
  component: WalletPage,
});

function WalletPage() {
  const t = useT();
  const state = usePageState();
  const { has } = usePermissions();
  const canAdjust = has("wallet.view_any"); // adjustments are an admin-only surface
  const [type, setType] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [label, setLabel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      WALLET_TX_ROWS.filter((tx) => {
        if (type !== "ALL" && tx.type !== type) return false;
        if (label && !tx.label.toLowerCase().includes(label.toLowerCase())) return false;
        if (from && tx.date.slice(0, 10) < from) return false;
        if (to && tx.date.slice(0, 10) > to) return false;
        return true;
      }),
    [type, label, from, to],
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
          value={`$${WALLET_SUMMARY.balance.toFixed(2)}`}
          delta={t("finance.wallet.readyToWithdraw")}
          icon={<WalletIcon className="h-5 w-5" />}
          accent
        />
        <KpiCard label={t("finance.wallet.currency")} value={WALLET_SUMMARY.currency} />
        <KpiCard
          label={t("finance.wallet.lastCredited")}
          value={WALLET_SUMMARY.last_credited_at}
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
        <KpiCard
          label={t("finance.wallet.lastDebited")}
          value={WALLET_SUMMARY.last_debited_at}
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
                <AdjustmentForm />
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

function AdjustmentForm() {
  const t = useT();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<AdjValues>({
    resolver: zodResolver(adjSchema),
    defaultValues: { amount: 0, label: "" },
  });

  function credit() {
    handleSubmit((v) =>
      toast.success(t("finance.wallet.adjCredited", { amount: `$${Number(v.amount).toFixed(2)}` })),
    )();
  }
  function debit() {
    handleSubmit((v) =>
      toast.success(t("finance.wallet.adjDebited", { amount: `$${Number(v.amount).toFixed(2)}` })),
    )();
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
