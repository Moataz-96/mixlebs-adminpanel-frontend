import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { SectionEditor } from "./_panel.help.articles";

export const Route = createFileRoute("/_panel/help/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy — Mixlebs Admin" }] }),
  component: () => (
    <SectionEditor
      section="Privacy Policy"
      titleKey="content.section.privacyTitle"
      subtitleKey="content.section.privacySubtitle"
      icon={<ScrollText className="h-5 w-5" />}
    />
  ),
});
