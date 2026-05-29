import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { SectionEditor } from "./_panel.help.articles";

export const Route = createFileRoute("/_panel/help/terms")({
  head: () => ({ meta: [{ title: "Terms of service — Mixlebs Admin" }] }),
  component: () => (
    <SectionEditor
      section="Terms"
      titleKey="content.section.termsTitle"
      subtitleKey="content.section.termsSubtitle"
      icon={<ScrollText className="h-5 w-5" />}
    />
  ),
});
