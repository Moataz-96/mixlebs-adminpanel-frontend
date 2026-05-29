import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/editors/ProductEditor";
import { PRODUCT_ROWS } from "@/lib/mock/products";

export const Route = createFileRoute("/_panel/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit product — Mixlebs Admin" }] }),
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const product = PRODUCT_ROWS.find((p) => p.id === id) ?? PRODUCT_ROWS[0];
  return <ProductEditor mode="edit" product={product} />;
}
