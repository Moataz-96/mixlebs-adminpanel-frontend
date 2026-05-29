import { createFileRoute } from "@tanstack/react-router";
import { PaymentMethodEditor } from "./_panel.payment-methods.new";
import { PAYMENT_METHOD_ROWS } from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/payment-methods/$id/edit")({
  head: () => ({ meta: [{ title: "Edit payment method — Mixlebs Admin" }] }),
  component: EditPaymentMethod,
});

function EditPaymentMethod() {
  const { id } = Route.useParams();
  const value = PAYMENT_METHOD_ROWS.find((p) => p.id === id) ?? PAYMENT_METHOD_ROWS[0];
  return <PaymentMethodEditor mode="edit" value={value} />;
}
