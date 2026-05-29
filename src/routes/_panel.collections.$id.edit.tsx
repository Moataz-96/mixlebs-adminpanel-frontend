import { createFileRoute } from "@tanstack/react-router";
import { CollectionEditor } from "./_panel.collections.new";
import { COLLECTIONS_FULL } from "@/lib/mock/catalog";

export const Route = createFileRoute("/_panel/collections/$id/edit")({
  head: () => ({ meta: [{ title: "Edit collection — Mixlebs Admin" }] }),
  component: EditCollection,
});

function EditCollection() {
  const { id } = Route.useParams();
  const value = COLLECTIONS_FULL.find((c) => c.id === id) ?? COLLECTIONS_FULL[0];
  return <CollectionEditor mode="edit" value={value} />;
}
