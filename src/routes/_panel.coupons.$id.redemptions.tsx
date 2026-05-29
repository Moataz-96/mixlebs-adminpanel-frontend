import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Ticket } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCoupon,
  listRedemptions,
  type CouponRedemption,
} from "@/lib/api/coupons.functions";

export const Route = createFileRoute("/_panel/coupons/$id/redemptions")({
  head: () => ({ meta: [{ title: "Coupon redemptions — Mixlebs Admin" }] }),
  component: Redemptions,
});

// Frozen-UI row shape (was a fabricated mock). Mapped from CouponRedemption.
interface Redemption {
  id: string;
  redeemed_at: string;
  user: string;
  order: string;
  amount: number;
}

function num(s: string | number | null | undefined): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function Redemptions() {
  const t = useT();
  const previewState = usePageState();
  const { id } = Route.useParams();
  const { currentStoreId } = useApp();

  const couponQuery = useQuery({
    queryKey: ["coupon", id],
    queryFn: () => getCoupon({ data: { id } }),
  });
  const redemptionsQuery = useQuery({
    queryKey: ["coupon-redemptions", id, currentStoreId],
    queryFn: () =>
      listRedemptions({ data: { id, store_id: currentStoreId, page_size: 200 } }),
  });

  const c = couponQuery.data;
  const discountValue = num(c?.discount_value);
  const discountLabel =
    c?.discount_type === "PERCENTAGE" ? `${discountValue}%` : `$${discountValue.toFixed(2)}`;

  const rows: Redemption[] = useMemo(
    () =>
      (redemptionsQuery.data?.results ?? []).map((r: CouponRedemption): Redemption => ({
        id: String(r.id),
        redeemed_at: r.created_at ? r.created_at.slice(0, 16).replace("T", " ") : "",
        user: r.user_email || r.user_phone || "—",
        order: "—",
        // The BE redemption row carries no per-redemption discount amount; show
        // the coupon's nominal value as the line amount for MONETARY coupons.
        amount: c?.discount_type === "MONETARY" ? discountValue : 0,
      })),
    [redemptionsQuery.data, c?.discount_type, discountValue],
  );

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : couponQuery.isLoading || redemptionsQuery.isLoading
        ? "loading"
        : couponQuery.isError || redemptionsQuery.isError
          ? "error"
          : "populated";

  const timesUsed = redemptionsQuery.data?.count ?? rows.length;
  const totalDiscount = rows.reduce((a, r) => a + r.amount, 0);

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
        title={t("finance.redemptions.title", { code: c?.code ?? "" })}
        description={
          c?.scope === "PLATFORM"
            ? t("finance.redemptions.subtitlePlatform")
            : t("finance.redemptions.subtitle", {
                store: c?.store_name ?? "",
                discount: discountLabel,
              })
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
        <KpiCard label={t("finance.coupons.kpiRedemptions")} value={timesUsed} accent />
        <KpiCard
          label={t("finance.coupons.colMaxUses")}
          value={!c || c.max_uses === 0 ? "∞" : c.max_uses}
          delta={
            !c || c.max_uses === 0 ? undefined : `${Math.round((timesUsed / c.max_uses) * 100)}%`
          }
        />
        <KpiCard
          label={t("finance.redemptions.footTotalDiscount")}
          value={`$${totalDiscount.toFixed(2)}`}
        />
        <KpiCard
          label={t("finance.coupons.colValidity")}
          value={c?.is_valid ? t("finance.coupons.fValid") : t("finance.coupons.fInvalid")}
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
