import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Ticket } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COUPON_ROWS } from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/coupons/$id/redemptions")({
  head: () => ({ meta: [{ title: "Coupon redemptions — Mixlebs Admin" }] }),
  component: Redemptions,
});

interface Redemption {
  id: string;
  redeemed_at: string;
  user: string;
  order: string;
  amount: number;
}

function Redemptions() {
  const t = useT();
  const state = usePageState();
  const { id } = Route.useParams();
  const c = COUPON_ROWS.find((x) => x.code === id) ?? COUPON_ROWS[0];

  const rows: Redemption[] = useMemo(
    () =>
      Array.from({ length: Math.min(8, Math.max(1, c.times_used)) }).map((_, i) => ({
        id: `red_${i}`,
        redeemed_at: `2026-05-${20 + i} 1${i}:${String((i * 7) % 60).padStart(2, "0")}`,
        user: [
          "Layla Haddad",
          "Omar Khoury",
          "Nour Saade",
          "Rami Geagea",
          "Aya Mansour",
          "Hadi Nasr",
          "Maya Fares",
          "Ziad Khalil",
        ][i],
        order: `MX-${4500 - i}`,
        amount:
          c.discount_type === "PERCENTAGE"
            ? Number((((40 + i * 12) * c.discount_value) / 100).toFixed(2))
            : c.discount_value,
      })),
    [c],
  );

  const totalDiscount = rows.reduce((a, r) => a + r.amount, 0);
  const discountLabel =
    c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : `$${c.discount_value.toFixed(2)}`;

  const columns: Column<Redemption>[] = [
    {
      id: "redeemedAt",
      header: t("finance.redemptions.colRedeemedAt"),
      sortValue: (r) => r.redeemed_at,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.redeemed_at}</span>,
    },
    {
      id: "user",
      header: t("finance.redemptions.colUser"),
      sortValue: (r) => r.user,
      cell: (r) => <span className="font-medium">{r.user}</span>,
    },
    {
      id: "order",
      header: t("finance.redemptions.colOrder"),
      cell: (r) => <span className="font-mono text-xs">{r.order}</span>,
    },
    {
      id: "amount",
      header: t("finance.redemptions.colAmount"),
      align: "end",
      sortValue: (r) => r.amount,
      cell: (r) => <span className="font-mono tabular-nums">${r.amount.toFixed(2)}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("finance.redemptions.title", { code: c.code })}
        description={
          c.scope === "PLATFORM"
            ? t("finance.redemptions.subtitlePlatform")
            : t("finance.redemptions.subtitle", { store: c.store ?? "", discount: discountLabel })
        }
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/coupons">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("finance.redemptions.backToCoupons")}
              </Link>
            </Button>
            <Button variant="outline">
              <Download className="me-1.5 h-4 w-4" /> {t("finance.redemptions.exportCsv")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("finance.coupons.kpiRedemptions")} value={c.times_used} accent />
        <KpiCard
          label={t("finance.coupons.colMaxUses")}
          value={c.max_uses === 0 ? "∞" : c.max_uses}
          delta={c.max_uses === 0 ? undefined : `${Math.round((c.times_used / c.max_uses) * 100)}%`}
        />
        <KpiCard
          label={t("finance.redemptions.footTotalDiscount")}
          value={`$${totalDiscount.toFixed(2)}`}
        />
        <KpiCard
          label={t("finance.coupons.colValidity")}
          value={c.is_valid ? t("finance.coupons.fValid") : t("finance.coupons.fInvalid")}
        />
      </div>

      <div className="mt-6">
        <PageStates
          state={state}
          skeleton={<TableSkeleton rows={6} cols={4} />}
          empty={<EmptyRedemptions />}
          missingPerms={["coupons.view"]}
        >
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            emptyState={<EmptyRedemptions />}
          />
          <Card className="mt-3 flex flex-wrap items-center justify-between gap-4 border-0 bg-muted/40 px-5 py-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("finance.redemptions.footTotalRedemptions")}
              </span>
              <span className="font-display text-lg font-bold">{rows.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("finance.redemptions.footTotalDiscount")}
              </span>
              <span className="font-display text-lg font-bold text-primary">
                ${totalDiscount.toFixed(2)}
              </span>
            </div>
          </Card>
        </PageStates>
      </div>
    </div>
  );
}

function EmptyRedemptions() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <Ticket className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {t("finance.redemptions.emptyTitle")}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("finance.redemptions.emptyDesc")}
      </p>
    </div>
  );
}
