import { createFileRoute } from "@tanstack/react-router";
import { CouponEditor } from "@/components/editors/CouponEditor";
import { COUPON_ROWS } from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/coupons/$id/edit")({
  head: () => ({ meta: [{ title: "Edit coupon — Mixlebs Admin" }] }),
  component: EditCoupon,
});

function EditCoupon() {
  const { id } = Route.useParams();
  const coupon = COUPON_ROWS.find((c) => c.code === id) ?? COUPON_ROWS[0];
  return <CouponEditor mode="edit" coupon={coupon} />;
}
