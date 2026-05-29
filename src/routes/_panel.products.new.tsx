import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/editors/ProductEditor";

export const Route = createFileRoute("/_panel/products/new")({
  head: () => ({ meta: [{ title: "New product — Mixlebs Admin" }] }),
  component: () => <ProductEditor mode="create" />,
});
