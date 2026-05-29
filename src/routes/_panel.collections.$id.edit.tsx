import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CollectionEditor } from "./_panel.collections.new";
import { getCollection, mapCollection } from "@/lib/api/collections.functions";

export const Route = createFileRoute("/_panel/collections/$id/edit")({
  head: () => ({ meta: [{ title: "Edit collection — Mixlebs Admin" }] }),
  component: EditCollection,
});

function EditCollection() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => getCollection({ data: { id: Number(id) } }),
  });
  const value = data ? mapCollection(data) : undefined;
  return <CollectionEditor mode="edit" value={value} />;
}
