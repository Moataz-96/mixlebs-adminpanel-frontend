import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { TAGS_FULL, type TagRow } from "@/lib/mock/catalog";

export const Route = createFileRoute("/_panel/tags")({
  head: () => ({ meta: [{ title: "Tags — Mixlebs Admin" }] }),
  component: TagsPage,
});

function TagsPage() {
  const t = useT();
  const state = usePageState();
  const { role } = usePermissions();
  const canSeeStore = role === "admin" || role === "staff";

  const [rows, setRows] = useState<TagRow[]>(TAGS_FULL);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const mostUsed = useMemo(() => [...rows].sort((a, b) => b.products - a.products)[0], [rows]);

  function add() {
    const name = draft.trim().toLowerCase();
    if (!name || rows.some((r) => r.name === name)) return;
    setRows((rs) => [
      {
        id: `tg_${Date.now()}`,
        name,
        products: 0,
        store: null,
        created_at: new Date().toISOString().slice(0, 10),
      },
      ...rs,
    ]);
    setDraft("");
    toast.success(t("catalog.tags.added"));
  }

  function remove(row: TagRow) {
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast.success(t("catalog.tags.deleted"));
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
