import { createFileRoute } from "@tanstack/react-router";
import { FaqEditor } from "./_panel.help.faq.new";
import { NotFoundState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/PageHeader";
import { useT } from "@/lib/i18n";
import { RESOURCES } from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/help/faq/$id/edit")({
  head: () => ({ meta: [{ title: "Edit FAQ — Mixlebs Admin" }] }),
  component: EditFaq,
});

function EditFaq() {
  const t = useT();
  const { id } = Route.useParams();
  const v = RESOURCES.find((f) => f.id === id);
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
