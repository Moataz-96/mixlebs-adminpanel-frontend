import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PaymentMethodEditor } from "./_panel.payment-methods.new";
import { getPaymentMethod } from "@/lib/api/payment_methods.functions";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState, type PageState } from "@/lib/page-state";

export const Route = createFileRoute("/_panel/payment-methods/$id/edit")({
  head: () => ({ meta: [{ title: "Edit payment method — Mixlebs Admin" }] }),
  component: EditPaymentMethod,
});

function EditPaymentMethod() {
  const { id } = Route.useParams();
  const previewState = usePageState();
  const methodQuery = useQuery({
    queryKey: ["payment-method", id],
    queryFn: () => getPaymentMethod({ data: { id } }),
  });

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : methodQuery.isLoading
        ? "loading"
        : methodQuery.isError
          ? "error"
          : "populated";

  return (
    <PageStates
      state={state}
      skeleton={<TableSkeleton rows={5} cols={2} />}
      missingPerms={["payment_methods.update"]}
    >
      {methodQuery.data && <PaymentMethodEditor mode="edit" value={methodQuery.data} />}
    </PageStates>
  );
}
