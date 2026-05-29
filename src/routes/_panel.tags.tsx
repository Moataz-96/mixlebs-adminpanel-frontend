import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags as TagsIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import { usePageState } from "@/lib/page-state";
import {
  listTags,
  createTag,
  renameTag,
  deleteTag,
  type Page,
  type TagItem,
} from "@/lib/api/catalog.functions";

// Row shape the §7.9 table consumes (was mock/catalog TagRow). The global
// /tags/ list now aggregates distinct tag NAMES with a per-name product count
// (ENTRY 018) and, for STAFF/admin, the owning store column.
interface TagRow {
  id: string;
  name: string;
  products: number;
  store: string | null;
  created_at: string;
}

function unpage<T>(p: Page<T> | T[] | undefined): T[] {
  if (!p) return [];
  return Array.isArray(p) ? p : p.results;
}

function mapTag(t: TagItem): TagRow {
  // The aggregated endpoint keys on (name[, store]); use that as the row id.
  return {
    id: t.store_id ? `${t.name}::${t.store_id}` : t.name,
    name: t.name,
    products: t.product_count,
    store: t.store_name,
    created_at: t.created_at ? t.created_at.slice(0, 10) : "",
  };
}

export const Route = createFileRoute("/_panel/tags")({
  head: () => ({ meta: [{ title: "Tags — Mixlebs Admin" }] }),
  component: TagsPage,
});

function TagsPage() {
  const t = useT();
  const state = usePageState();
  const { role } = usePermissions();
  const canSeeStore = role === "admin" || role === "staff";

  const queryClient = useQueryClient();
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
    staleTime: 60 * 1000,
  });
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  // Live aggregated /tags/ rows (name + product count + store column).
  const rows = useMemo<TagRow[]>(() => unpage(tagsQuery.data).map(mapTag), [tagsQuery.data]);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const mostUsed = useMemo(() => [...rows].sort((a, b) => b.products - a.products)[0], [rows]);

  // Global tag-name CRUD wired to the BE (ENTRY 018), gated by tags.update.
  const createMutation = useMutation({
    mutationFn: (name: string) => createTag({ data: { name } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success(t("catalog.tags.added"));
    },
    onError: () => toast.error(t("catalog.tags.added")),
  });
  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteTag({ data: { name } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success(t("catalog.tags.deleted"));
    },
    onError: () => toast.error(t("catalog.tags.deleted")),
  });
  // renameTag is exported for callers that surface inline rename; kept wired so
  // the BE rename endpoint has a typed client even though the frozen UI has no
  // rename control yet.
  void renameTag;

  function add() {
    const name = draft.trim().toLowerCase();
    if (!name || rows.some((r) => r.name === name)) return;
    setDraft("");
    createMutation.mutate(name);
  }

  function remove(row: TagRow) {
    deleteMutation.mutate(row.name);
  }

  const columns: Column<TagRow>[] = [
    {
      id: "name",
      header: t("catalog.tags.colName"),
      sortValue: (r) => r.name,
      cell: (r) => (
        <Badge variant="outline" className="rounded-full px-3 text-sm">
          {r.name}
        </Badge>
      ),
    },
    {
      id: "products",
      header: t("catalog.tags.colProducts"),
      align: "end",
      sortValue: (r) => r.products,
      cell: (r) => <span className="font-mono tabular-nums">{r.products}</span>,
    },
    ...(canSeeStore
      ? [
          {
            id: "store",
            header: t("catalog.tags.colStore"),
            cell: (r: TagRow) => (
              <span className="text-sm text-muted-foreground">{r.store ?? "—"}</span>
            ),
          } as Column<TagRow>,
        ]
      : []),
    {
      id: "created",
      header: t("catalog.tags.colCreated"),
      sortValue: (r) => r.created_at,
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.created_at}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("catalog.tags.title")} description={t("catalog.tags.desc")} />

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label={t("catalog.tags.kpiTotal")}
          value={rows.length}
          icon={<TagsIcon className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("catalog.tags.kpiMostUsed")}
          value={mostUsed?.name ?? "—"}
          delta={
            mostUsed
              ? `${mostUsed.products} ${t("catalog.tags.colProducts").toLowerCase()}`
              : undefined
          }
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("catalog.tags.searchPh")}
          count={filtered.length}
          countLabel={t("catalog.tags.count")}
          actions={
            <Can perm="tags.update">
              <div className="flex gap-1.5">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder={t("catalog.tags.addPh")}
                  className="h-9 w-40"
                />
                <Button
                  className="h-9 bg-gradient-primary text-primary-foreground shadow-glow"
                  onClick={add}
                >
                  <Plus className="me-1 h-3.5 w-3.5" /> {t("catalog.tags.add")}
                </Button>
              </div>
            </Can>
          }
        />
      </div>

      <PageStates
        state={filtered.length === 0 && state === "populated" ? "empty" : state}
        skeleton={<TableSkeleton rows={5} cols={4} />}
        missingPerms={["tags.view"]}
        empty={
          <EmptyState
            icon={<TagsIcon className="h-6 w-6" />}
            title={t("catalog.tags.emptyTitle")}
            description={t("catalog.tags.emptyDesc")}
          />
        }
      >
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          rowActions={(r) => (
            <Can perm="tags.update">
              <ConfirmDialog
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    aria-label={t("catalog.tags.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title={t("catalog.tags.delete")}
                confirmLabel={t("common.delete")}
                destructive
                typeToConfirm={r.name}
                onConfirm={() => remove(r)}
              />
            </Can>
          )}
        />
      </PageStates>
    </div>
  );
}
