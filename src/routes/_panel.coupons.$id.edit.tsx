import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CouponEditor } from "@/components/editors/CouponEditor";
import { getCoupon } from "@/lib/api/coupons.functions";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState, type PageState } from "@/lib/page-state";

export const Route = createFileRoute("/_panel/coupons/$id/edit")({
  head: () => ({ meta: [{ title: "Edit coupon — Mixlebs Admin" }] }),
  component: EditCoupon,
});

function EditCoupon() {
  const { id } = Route.useParams();
  const previewState = usePageState();
  const couponQuery = useQuery({
    queryKey: ["coupon", id],
    queryFn: () => getCoupon({ data: { id } }),
  });

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : couponQuery.isLoading
        ? "loading"
        : couponQuery.isError
          ? "error"
          : "populated";

  return (
    <PageStates
      state={state}
      skeleton={<TableSkeleton rows={6} cols={2} />}
      missingPerms={["coupons.update"]}
    >
      {couponQuery.data && <CouponEditor mode="edit" coupon={couponQuery.data} />}
    </PageStates>
  );
}
