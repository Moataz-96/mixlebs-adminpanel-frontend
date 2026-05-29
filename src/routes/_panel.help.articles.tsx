import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, FileEdit, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { ForbiddenState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Can, usePermissions } from "@/components/shared/Can";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";
import { RESOURCES, type ResourceEntry, type ResourceSection } from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/help/articles")({
  head: () => ({ meta: [{ title: "Articles — Mixlebs Admin" }] }),
  component: () => (
    <SectionEditor
      section="Article"
      titleKey="content.section.articlesTitle"
      subtitleKey="content.section.articlesSubtitle"
      newKey="content.section.newArticle"
      icon={<FileEdit className="h-5 w-5" />}
    />
  ),
});

/**
 * Reusable simple section editor (§13.1 articles / privacy / terms). Shows a
 * list of resource entries filtered to one section on the left and an inline
 * per-language editor on the right. Reuses the FAQ resource shape.
 */
export function SectionEditor({
  section,
  titleKey,
  subtitleKey,
  newKey,
  icon,
}: {
  section: ResourceSection;
  titleKey: string;
  subtitleKey: string;
  newKey?: string;
  icon: React.ReactNode;
}) {
  const t = useT();
  const { locale } = useApp();
  const { has } = usePermissions();
  const canView = has("resources.view");
  const canEdit = has("resources.update");

  const entries = useMemo(() => RESOURCES.filter((r) => r.section === section), [section]);
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const selected = entries.find((e) => e.id === selectedId) ?? null;

  function title(r: ResourceEntry) {
    return (r.translations.find((tr) => tr.lang === locale) ?? r.translations[0])?.title ?? r.slug;
  }

  if (!canView) {
    return (
      <>
        <PageHeader title={t(titleKey)} description={t(subtitleKey)} />
        <div className="p-6 pt-0">
          <ForbiddenState perms={["resources.view"]} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t(titleKey)}
        description={t(subtitleKey)}
        actions={
          newKey ? (
            <Can perm="resources.update">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => toast.success(t("content.section.saved"))}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t(newKey)}
              </Button>
            </Can>
          ) : undefined
        }
      />
      <div className="p-6 pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label={t("content.section.kpiEntries")}
            value={entries.length}
            icon={icon}
            accent
          />
          <KpiCard
            label={t("content.faq.kpiPublished")}
            value={entries.filter((e) => e.published).length}
          />
          <KpiCard
            label={t("content.section.kpiPublished")}
            value={entries[0]?.updated_at ?? t("content.none")}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="overflow-hidden border-0 shadow-soft">
            <div className="border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("content.section.listHeading")}
            </div>
            {entries.length === 0 ? (
              <div className="grid h-32 place-items-center px-4 text-center text-sm text-muted-foreground">
                {t("content.section.emptyTitle")}
              </div>
            ) : (
              <div className="divide-y">
                {entries.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-3 text-start transition hover:bg-muted/30",
                      selectedId === e.id && "bg-primary/5",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{title(e)}</span>
                    {e.published ? (
                      <Badge
                        variant="outline"
                        className="border-success/30 bg-success/10 text-success text-[9px]"
                      >
                        {t("content.faq.published")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        {t("content.faq.draft")}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-0 bg-card p-6 shadow-soft">
            {selected ? (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-semibold">
                    {t("content.section.editorHeading")}
                  </h3>
                  <Can perm="resources.update">
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground shadow-glow"
                      onClick={() => toast.success(t("content.section.saved"))}
                    >
                      <Save className="me-1.5 h-4 w-4" /> {t("content.save")}
                    </Button>
                  </Can>
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {selected.slug}
                  </code>
                  <span className="ms-auto flex items-center gap-2 text-sm text-muted-foreground">
                    {t("content.faq.published")}
                    <Switch defaultChecked={selected.published} disabled={!canEdit} />
                  </span>
                </div>
                <Tabs defaultValue="en">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="en">{t("content.langEn")}</TabsTrigger>
                    <TabsTrigger value="ar">{t("content.langAr")}</TabsTrigger>
                  </TabsList>
                  {(["en", "ar"] as const).map((l) => {
                    const tr = selected.translations.find((x) => x.lang === l);
                    return (
                      <TabsContent key={l} value={l} className="mt-5 space-y-4">
                        <div>
                          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t("content.faqEditor.fTitle")}
                          </Label>
                          <Input
                            dir={l === "ar" ? "rtl" : "ltr"}
                            defaultValue={tr?.title ?? ""}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t("content.faqEditor.fContent")}
                          </Label>
                          <Textarea
                            rows={12}
                            dir={l === "ar" ? "rtl" : "ltr"}
                            defaultValue={tr?.content ?? ""}
                            disabled={!canEdit}
                          />
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </>
            ) : (
              <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                {t("content.section.selectHint")}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
