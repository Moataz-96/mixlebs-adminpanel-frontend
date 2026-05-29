import { createFileRoute } from "@tanstack/react-router";
import { CouponEditor } from "@/components/editors/CouponEditor";

export const Route = createFileRoute("/_panel/coupons/new")({
  head: () => ({ meta: [{ title: "New coupon — Mixlebs Admin" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    scope: s.scope === "PLATFORM" ? "PLATFORM" : undefined,
  }),
  component: NewCoupon,
});

function NewCoupon() {
  const { scope } = Route.useSearch();
  return <CouponEditor mode="create" defaultScope={scope as "PLATFORM" | undefined} />;
}
