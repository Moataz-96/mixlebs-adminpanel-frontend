import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Star, EyeOff, Eye, MessageCircleReply, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates, EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/components/shared/Can";
import { ForbiddenState } from "@/components/shared/states";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { PRODUCT_REVIEWS, type ProductReview } from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/reviews/product")({
  head: () => ({ meta: [{ title: "Product reviews — Mixlebs Admin" }] }),
  component: ProductReviewsPage,
});

const STORES = Array.from(new Set(PRODUCT_REVIEWS.map((r) => r.store)));
const PRODUCTS = Array.from(new Set(PRODUCT_REVIEWS.map((r) => r.product)));

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ProductReviewsPage() {
  const t = useT();
  const state = usePageState();
  const { has, role } = usePermissions();
  const canModerate = has("reviews.moderate");
  // STORE tier cannot bypass the negative-review guard.
  const canHideNegative = role === "admin";

  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("any");
  const [purchased, setPurchased] = useState("any");
  const [store, setStore] = useState("all");
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<ProductReview[]>(PRODUCT_REVIEWS);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (
          search &&
          !`${r.product} ${r.customer} ${r.comment}`.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (rating !== "any" && r.rating !== Number(rating)) return false;
        if (purchased === "yes" && !r.is_purchased) return false;
        if (purchased === "no" && r.is_purchased) return false;
        if (store !== "all" && r.store !== store) return false;
        if (product !== "all" && r.product !== product) return false;
        if (status === "visible" && r.hidden) return false;
        if (status === "hidden" && !r.hidden) return false;
        return true;
      }),
    [rows, search, rating, purchased, store, product, status],
  );

  const avg = (PRODUCT_REVIEWS.reduce((a, r) => a + r.rating, 0) / PRODUCT_REVIEWS.length).toFixed(
    2,
  );
  const hiddenCount = rows.filter((r) => r.hidden).length;
  const negative = rows.filter((r) => r.rating <= 2).length;

  function setHidden(id: string, hidden: boolean) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, hidden } : r)));
    toast.success(hidden ? t("content.reviews.hiddenToast") : t("content.reviews.unhiddenToast"));
  }

  const columns: Column<ProductReview>[] = [
    {
      id: "product",
      header: t("content.reviews.colProduct"),
      sortValue: (r) => r.product,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.product}</p>
          <Badge variant="outline" className="mt-0.5 text-[10px]">
            {r.store}
          </Badge>
        </div>
      ),
    },
    {
      id: "rating",
      header: t("content.reviews.colRating"),
      sortValue: (r) => r.rating,
      cell: (r) => <Stars rating={r.rating} />,
    },
    {
      id: "comment",
      header: t("content.reviews.colComment"),
      cell: (r) => <p className="max-w-xs truncate text-sm text-muted-foreground">{r.comment}</p>,
    },
    {
      id: "customer",
      header: t("content.reviews.colCustomer"),
      sortValue: (r) => r.customer,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-muted text-[10px]">
              {r.customer
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{r.customer}</span>
        </div>
      ),
    },
    {
      id: "purchased",
      header: t("content.reviews.colPurchased"),
      cell: (r) =>
        r.is_purchased ? (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success text-[10px]"
          >
            {t("content.reviews.verified")}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t("content.reviews.unverified")}</span>
        ),
    },
    {
      id: "created",
      header: t("content.reviews.colCreated"),
      sortValue: (r) => r.created_at,
      cell: (r) => <span className="text-xs text-muted-foreground">{r.created_at}</span>,
    },
    {
      id: "status",
      header: t("content.reviews.colStatus"),
      cell: (r) =>
        r.hidden ? (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]"
          >
            {t("content.reviews.hidden")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success text-[10px]"
          >
            {t("content.reviews.visible")}
          </Badge>
        ),
    },
  ];

  function rowActions(r: ProductReview) {
    if (!canModerate) return null;
    if (r.hidden) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5"
          onClick={() => setHidden(r.id, false)}
        >
          <Eye className="h-3.5 w-3.5" /> {t("content.reviews.unhide")}
        </Button>
      );
    }
    const negative = r.rating <= 2;
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5"
          onClick={() => toast.info(t("content.reviews.replyToast"))}
        >
          <MessageCircleReply className="h-3.5 w-3.5" /> {t("content.reviews.reply")}
        </Button>
        {negative && !canHideNegative ? (
          // STORE without bypass: blocked dialog.
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> {t("content.reviews.hide")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-warning" />{" "}
                  {t("content.reviews.blockedTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>{t("content.reviews.blockedDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction>{t("content.cancel")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline" className="h-7 gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> {t("content.reviews.hide")}
              </Button>
            }
            title={
              negative ? t("content.reviews.hideNegativeTitle") : t("content.reviews.hideTitle")
            }
            description={
              negative
                ? t("content.reviews.hideNegativeDesc", { n: r.rating })
                : t("content.reviews.hideDesc")
            }
            confirmLabel={t("content.reviews.hide")}
            destructive
            onConfirm={() => setHidden(r.id, true)}
          />
        )}
      </div>
    );
  }

  if (!canModerate) {
    return (
      <>
        <PageHeader
          title={t("content.reviews.productTitle")}
          description={t("content.reviews.productSubtitle")}
        />
        <div className="p-6 pt-0">
          <ForbiddenState perms={["reviews.moderate"]} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("content.reviews.productTitle")}
        description={t("content.reviews.productSubtitle")}
      />
      <div className="p-6 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("content.reviews.kpiAvg")}
            value={`${avg} ★`}
            icon={<Star className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("content.reviews.kpiTotal")}
            value={PRODUCT_REVIEWS.length}
            icon={<Star className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.reviews.kpiNegative")}
            value={negative}
            delta={t("content.reviews.negativeDelta")}
            trend="down"
            icon={<Star className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.reviews.kpiHidden")}
            value={hiddenCount}
            icon={<EyeOff className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("content.reviews.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("content.reviews.countLabel")}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder={t("content.reviews.filterRating")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("content.anyRating")}</SelectItem>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t("content.ratingStars", { n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={purchased} onValueChange={setPurchased}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder={t("content.reviews.filterPurchased")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t("content.reviews.anyPurchase")}</SelectItem>
                    <SelectItem value="yes">{t("content.reviews.purchasedOnly")}</SelectItem>
                    <SelectItem value="no">{t("content.reviews.notPurchased")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={store} onValueChange={setStore}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder={t("content.reviews.filterStore")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("content.reviews.allStores")}</SelectItem>
                    {STORES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder={t("content.reviews.filterProduct")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("content.reviews.allProducts")}</SelectItem>
                    {PRODUCTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder={t("content.reviews.filterStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("content.all")}</SelectItem>
                    <SelectItem value="visible">{t("content.reviews.statusVisible")}</SelectItem>
                    <SelectItem value="hidden">{t("content.reviews.statusHidden")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />

          <PageStates
            state={state}
            empty={
              <EmptyState
                title={t("content.reviews.emptyTitle")}
                description={t("content.reviews.emptyDesc")}
                icon={<Star className="h-6 w-6" />}
              />
            }
          >
            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(r) => r.id}
              rowActions={rowActions}
              emptyState={
                <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                  {t("content.reviews.emptyTitle")}
                </div>
              }
            />
          </PageStates>
        </div>
      </div>
    </>
  );
}
