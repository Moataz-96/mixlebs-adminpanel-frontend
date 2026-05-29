import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductEditor, type Product } from "@/components/editors/ProductEditor";
import { getProduct, type ProductDetail } from "@/lib/api/catalog.functions";

export const Route = createFileRoute("/_panel/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit product — Mixlebs Admin" }] }),
  component: EditProduct,
});

function num(s: string | number | null | undefined): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function mapProduct(p: ProductDetail): Product {
  return {
    id: String(p.id),
    name: p.name,
    sku: String(p.id),
    store: p.store_id,
    // category id as a string — the editor resolves name|id to the numeric id.
    category: String(p.category_id),
    price: num(p.list_price),
    stock: num(p.stock),
    status: p.status,
    variants: num(p.variants_count),
    updated: p.updated_at ? p.updated_at.slice(0, 10) : "",
  };
}

function EditProduct() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct({ data: { id: Number(id) } }),
  });
  const product = data ? mapProduct(data) : undefined;
  return <ProductEditor mode="edit" product={product} />;
}
