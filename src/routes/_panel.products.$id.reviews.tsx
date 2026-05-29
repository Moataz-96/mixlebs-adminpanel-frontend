import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star, EyeOff, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { PRODUCT_ROWS, PRODUCT_REVIEWS, type ProductReview } from "@/lib/mock/products";

export const Route = createFileRoute("/_panel/products/$id/reviews")({
  head: () => ({ meta: [{ title: "Product reviews — Mixlebs Admin" }] }),
  component: ProductReviewsPage,
});

function ProductReviewsPage() {
  const t = useT();
  const state = usePageState();
  const { id } = Route.useParams();
  const product = PRODUCT_ROWS.find((p) => p.id === id) ?? PRODUCT_ROWS[0];

  const [rating, setRating] = useState("ANY");
  const [purchased, setPurchased] = useState("ANY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return PRODUCT_REVIEWS.filter((r) => {
      if (rating !== "ANY" && r.rating !== Number(rating)) return false;
      if (purchased === "YES" && !r.isPurchased) return false;
      if (purchased === "NO" && r.isPurchased) return false;
      if (from && r.createdAt < from) return false;
      if (to && r.createdAt > to) return false;
      return true;
    });
  }, [rating, purchased, from, to]);

  const avg = (
    PRODUCT_REVIEWS.reduce((a, r) => a + r.rating, 0) / Math.max(PRODUCT_REVIEWS.length, 1)
  ).toFixed(1);
  const hidden = PRODUCT_REVIEWS.filter((r) => r.hidden).length;

  const columns: Column<ProductReview>[] = [
    {
      id: "customer",
      header: t("products.colCustomer"),
      sortValue: (r) => r.customer,
      cell: (r) => <span className="font-medium">{r.customer}</span>,
    },
    {
      id: "rating",
      header: t("products.colReviewRating"),
      sortValue: (r) => r.rating,
      cell: (r) => (
        <div className="inline-flex items-center gap-0.5 text-brand">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "opacity-30"}`}
            />
          ))}
        </div>
      ),
    },
    {
      id: "comment",
      header: t("products.colComment"),
      cell: (r) => (
        <span className="block max-w-sm truncate text-sm text-muted-foreground">{r.comment}</span>
      ),
    },
    {
      id: "purchased",
      header: t("products.colPurchased"),
      sortValue: (r) => (r.isPurchased ? 1 : 0),
      cell: (r) =>
        r.isPurchased ? (
          <Badge variant="outline" className="border-success/30 text-success">
            {t("products.purchasedYes")}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "created",
      header: t("products.colPosted"),
      align: "end",
      sortValue: (r) => r.createdAt,
      cell: (r) => <span className="text-xs text-muted-foreground">{r.createdAt}</span>,
    },
    {
      id: "status",
      header: t("products.colReviewStatus"),
      sortValue: (r) => (r.hidden ? 1 : 0),
      cell: (r) => <StatusBadge status={r.hidden ? "HIDDEN" : "AVAILABLE"} />,
    },
  ];

  const rowActions = (r: ProductReview) => (
    <div className="flex justify-end gap-1">
      <Can perm="reviews.moderate">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            toast.success(
              r.hidden ? t("products.reviewShownToast") : t("products.reviewHiddenToast"),
            )
          }
        >
          {r.hidden ? (
            <Eye className="me-1 h-3.5 w-3.5" />
          ) : (
            <EyeOff className="me-1 h-3.5 w-3.5" />
          )}
          {r.hidden ? t("products.reviewUnhide") : t("products.reviewHide")}
        </Button>
      </Can>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => toast.message(t("products.reviewReplyToast"))}
      >
        <MessageSquare className="me-1 h-3.5 w-3.5" /> {t("products.reviewReply")}
      </Button>
    </div>
  );

  return (
    <div className="p-6">
      <PageHeader
        title={t("products.reviewsTitle", { name: product.name })}
        description={t("products.reviewsSubtitle", { sku: product.sku, store: product.store })}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/products/$id/edit" params={{ id: product.id }}>
              <ArrowLeft className="me-1.5 h-4 w-4" /> {t("products.backToProduct")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("products.reviewsKpiCount")}
          value={PRODUCT_REVIEWS.length}
          icon={<Star className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("products.reviewsKpiAvg")}
          value={avg}
          icon={<Star className="h-5 w-5" />}
        />
        <KpiCard
          label={t("products.reviewsKpiHidden")}
          value={hidden}
          icon={<EyeOff className="h-5 w-5" />}
        />
      </div>

      {/* Filters: rating bucket, is_purchased, date range */}
      <div className="mt-6 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-soft">
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder={t("products.filterRating")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">{t("products.anyRating")}</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {t("products.ratingStars", { n })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={purchased} onValueChange={setPurchased}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder={t("products.filterPurchased")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">{t("products.anyPurchase")}</SelectItem>
            <SelectItem value="YES">{t("products.purchasedOnly")}</SelectItem>
            <SelectItem value="NO">{t("products.notPurchased")}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 w-[150px]"
          aria-label={t("products.dateFrom")}
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 w-[150px]"
          aria-label={t("products.dateTo")}
        />
        <span className="ms-auto px-1 text-xs text-muted-foreground">
          {filtered.length} {t("products.reviewsKpiCount")}
        </span>
      </div>

      <PageStates state={state} skeleton={<TableSkeleton cols={6} />}>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          rowActions={rowActions}
          emptyState={
            <div className="grid h-32 place-items-center text-sm text-muted-foreground">
              {t("products.reviewsEmpty")}
            </div>
          }
        />
      </PageStates>
    </div>
  );
}
