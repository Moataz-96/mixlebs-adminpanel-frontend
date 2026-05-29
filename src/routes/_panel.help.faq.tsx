import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  HelpCircle,
  FileText,
  Layers,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ArrowUpDown,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates, EmptyState, ForbiddenState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Can, usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/app-context";
import { parseServerError } from "@/lib/api/error";
import {
  listResources,
  deleteResource,
  updateResource,
  toResourceEntry,
  type ResourceEntry,
  type ResourceSection,
} from "@/lib/api/content.functions";

export const Route = createFileRoute("/_panel/help/faq")({
  head: () => ({ meta: [{ title: "Help center — Mixlebs Admin" }] }),
  component: FaqPage,
});

const SECTIONS: ResourceSection[] = ["FAQ", "Privacy Policy", "Terms", "Article"];
const TAB_LABELS: Record<string, string> = {
  FAQ: "content.faq.tabFaq",
  "Privacy Policy": "content.faq.tabPrivacy",
  Terms: "content.faq.tabTerms",
  Article: "content.faq.tabArticle",
};

function FaqPage() {
  const t = useT();
  const state = usePageState();
  const navigate = useNavigate();
  const { locale } = useApp();
  const { has } = usePermissions();
  const canView = has("resources.view");
  const canEdit = has("resources.update");

  const queryClient = useQueryClient();
  const resourcesQuery = useQuery({
    queryKey: ["resources"],
    queryFn: () => listResources({ data: {} }),
    enabled: canView,
    retry: false,
  });

  const [tab, setTab] = useState<ResourceSection>("FAQ");
  const [search, setSearch] = useState("");
  const [reorder, setReorder] = useState(false);
  const [rows, setRows] = useState<ResourceEntry[]>([]);

  useEffect(() => {
    if (resourcesQuery.data) {
      setRows((resourcesQuery.data.results ?? []).map(toResourceEntry));
    }
  }, [resourcesQuery.data]);

  const title = useCallback(
    (r: ResourceEntry) =>
      (r.translations.find((tr) => tr.lang === locale) ?? r.translations[0])?.title ?? r.slug,
    [locale],
  );

  const inSection = useMemo(
    () => rows.filter((r) => r.section === tab).sort((a, b) => a.order - b.order),
    [rows, tab],
  );
  const filtered = useMemo(
    () =>
      inSection.filter(
        (r) => !search || `${r.slug} ${title(r)}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [inSection, search, title],
  );

  function setPublished(id: string, published: boolean) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, published } : r)));
    toast.success(published ? t("content.faq.publishedToast") : t("content.faq.unpublishedToast"));
  }
  async function remove(id: string) {
    try {
      await deleteResource({ data: { id: Number(id) } });
      setRows((rs) => rs.filter((r) => r.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success(t("content.faq.deleted"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }
  function move(id: string, dir: -1 | 1) {
    const list = [...inSection];
    const idx = list.findIndex((r) => r.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const a = list[idx],
      b = list[swap];
    setRows((rs) =>
      rs.map((r) =>
        r.id === a.id ? { ...r, order: b.order } : r.id === b.id ? { ...r, order: a.order } : r,
      ),
    );
  }

  const columns: Column<ResourceEntry>[] = [
    ...(reorder
      ? [
          {
            id: "drag",
            header: "",
            width: "40px",
            cell: () => <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />,
          } as Column<ResourceEntry>,
        ]
      : []),
    {
      id: "slug",
      header: t("content.faq.colSlug"),
      sortValue: (r) => r.slug,
      cell: (r) => (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.slug}</code>
      ),
    },
    {
      id: "title",
      header: t("content.faq.colTitle"),
      sortValue: title,
      cell: (r) => <span className="font-medium">{title(r)}</span>,
    },
    {
      id: "section",
      header: t("content.faq.colSection"),
      cell: (r) => (
        <Badge variant="outline" className="text-[10px]">
          {t(TAB_LABELS[r.section])}
        </Badge>
      ),
    },
    {
      id: "type",
      header: t("content.faq.colContentType"),
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.content_type === "QA" ? "Q & A" : t("content.faqEditor.typeArticle")}
        </span>
      ),
    },
    {
      id: "order",
      header: t("content.faq.colOrder"),
      sortValue: (r) => r.order,
      align: "center",
      cell: (r) =>
        reorder ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => move(r.id, -1)}
              aria-label="Move up"
            >
              <ArrowUpDown className="h-3 w-3 rotate-180" />
            </Button>
            <span className="font-mono text-xs tabular-nums">{r.order}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => move(r.id, 1)}
              aria-label="Move down"
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="font-mono text-xs tabular-nums">{r.order}</span>
        ),
    },
    {
      id: "audiences",
      header: t("content.faq.colAudiences"),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.audiences.map((a) => (
            <Badge key={a} variant="outline" className="text-[9px] uppercase tracking-wider">
              {a}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "published",
      header: t("content.faq.colPublished"),
      cell: (r) =>
        r.published ? (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success text-[10px]"
          >
            {t("content.faq.published")}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {t("content.faq.draft")}
          </Badge>
        ),
    },
    {
      id: "updated",
      header: t("content.faq.colUpdated"),
      sortValue: (r) => r.updated_at,
      cell: (r) => <span className="text-xs text-muted-foreground">{r.updated_at}</span>,
    },
  ];

  function rowActions(r: ResourceEntry) {
    if (!canEdit || reorder) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-60 group-hover:opacity-100"
            aria-label="Row actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => navigate({ to: "/help/faq/$id/edit", params: { id: r.id } })}
          >
            <Pencil className="me-2 h-4 w-4" /> {t("content.faq.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.success(t("content.faq.duplicated"))}>
            <Copy className="me-2 h-4 w-4" /> {t("content.faq.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPublished(r.id, !r.published)}>
            {r.published ? t("content.faq.draft") : t("content.faq.published")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmDialog
            trigger={
              <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                <Trash2 className="me-2 h-4 w-4" /> {t("content.faq.delete")}
              </DropdownMenuItem>
            }
            title={t("content.faq.deleteTitle")}
            description={t("content.faq.deleteDesc")}
            confirmLabel={t("content.faq.delete")}
            destructive
            typeToConfirm={r.slug}
            onConfirm={() => remove(r.id)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title={t("content.faq.title")} description={t("content.faq.subtitle")} />
        <div className="p-6 pt-0">
          <ForbiddenState perms={["resources.view"]} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("content.faq.title")}
        description={t("content.faq.subtitle")}
        actions={
          <>
            <Can perm="resources.update">
              <Button
                variant="outline"
                onClick={() => {
                  setReorder((v) => {
                    if (v) {
                      // Persist the reordered `order` values for this section.
                      void Promise.all(
                        inSection.map((r) =>
                          updateResource({ data: { id: Number(r.id), body: { order: r.order } } }),
                        ),
                      )
                        .then(() => queryClient.invalidateQueries({ queryKey: ["resources"] }))
                        .then(() => toast.success(t("content.faq.reorderSaved")))
                        .catch((err) => toast.error(parseServerError(err).message));
                    }
                    return !v;
                  });
                }}
              >
                <ArrowUpDown className="me-1.5 h-4 w-4" />{" "}
                {reorder ? t("content.faq.reorderDone") : t("content.faq.reorder")}
              </Button>
            </Can>
            <Can perm="resources.update">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => navigate({ to: "/help/faq/new" })}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t("content.faq.newEntry")}
              </Button>
            </Can>
          </>
        }
      />
      <div className="p-6 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("content.faq.kpiTotal")}
            value={rows.length}
            icon={<FileText className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("content.faq.kpiPublished")}
            value={rows.filter((r) => r.published).length}
            icon={<HelpCircle className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.faq.kpiSections")}
            value={new Set(rows.map((r) => r.section)).size}
            icon={<Layers className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.faq.kpiUpdated")}
            value={rows.filter((r) => r.updated_at >= "2026-05-01").length}
          />
        </div>

        <div className="mt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as ResourceSection)}>
            <TabsList className="mb-4 bg-muted/50">
              {SECTIONS.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {t(TAB_LABELS[s])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {reorder && (
            <p className="mb-3 text-xs text-muted-foreground">{t("content.faq.reorderHint")}</p>
          )}

          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("content.faq.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("content.faq.countLabel")}
          />

          <PageStates
            state={state}
            empty={
              <EmptyState
                title={t("content.faq.emptyTitle")}
                description={t("content.faq.emptyDesc")}
                icon={<HelpCircle className="h-6 w-6" />}
                action={
                  canEdit ? (
                    <Button
                      className="bg-gradient-primary text-primary-foreground shadow-glow"
                      onClick={() => navigate({ to: "/help/faq/new" })}
                    >
                      <Plus className="me-1.5 h-4 w-4" /> {t("content.faq.newEntry")}
                    </Button>
                  ) : undefined
                }
              />
            }
          >
            {filtered.length === 0 ? (
              <Card className="border-0 shadow-soft">
                <EmptyState
                  title={t("content.faq.emptyTitle")}
                  description={t("content.faq.emptyDesc")}
                  icon={<HelpCircle className="h-6 w-6" />}
                />
              </Card>
            ) : (
              <DataTable
                data={filtered}
                columns={columns}
                getRowId={(r) => r.id}
                rowActions={canEdit && !reorder ? rowActions : undefined}
                paginate={!reorder}
              />
            )}
          </PageStates>
        </div>
      </div>
    </>
  );
}
