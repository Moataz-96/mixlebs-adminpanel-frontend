import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FaqEditor } from "./_panel.help.faq.new";
import { NotFoundState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/PageHeader";
import { useT } from "@/lib/i18n";
import { getResource, toResourceEntry } from "@/lib/api/content.functions";

export const Route = createFileRoute("/_panel/help/faq/$id/edit")({
  head: () => ({ meta: [{ title: "Edit FAQ — Mixlebs Admin" }] }),
  component: EditFaq,
});

function EditFaq() {
  const t = useT();
  const { id } = Route.useParams();
  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => getResource({ data: { id: Number(id) } }),
    retry: false,
  });

  if (resourceQuery.isPending) {
    return (
      <>
        <PageHeader title={t("content.faqEditor.editTitle")} />
        <div className="p-6 pt-0">
          <TableSkeleton rows={4} cols={2} />
        </div>
      </>
    );
  }

  const v = resourceQuery.data ? toResourceEntry(resourceQuery.data) : undefined;
  if (!v) {
    return (
      <>
        <PageHeader title={t("content.faqEditor.editTitle")} />
        <div className="p-6 pt-0">
          <NotFoundState />
        </div>
      </>
    );
  }
  return <FaqEditor mode="edit" value={v} />;
}
