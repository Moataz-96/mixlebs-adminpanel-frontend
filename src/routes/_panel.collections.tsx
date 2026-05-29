import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Layers,
  Globe2,
  Store as StoreIcon,
  Power,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { COLLECTIONS_FULL, DISPLAY_STYLES, type CollectionRow } from "@/lib/mock/catalog";

export const Route = createFileRoute("/_panel/collections")({
  head: () => ({ meta: [{ title: "Collections — Mixlebs Admin" }] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const t = useT();
  const navigate = useNavigate();
  const state = usePageState();
  const { has } = usePermissions();

  const [rows, setRows] = useState<CollectionRow[]>(COLLECTIONS_FULL);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [active, setActive] = useState<string>("all");
  const [display, setDisplay] = useState<string>("all");

  const platform = rows.filter((c) => c.scope === "PLATFORM").length;
  const store = rows.filter((c) => c.scope === "STORE").length;
  const activeCount = rows.filter((c) => c.is_active).length;

  const filtered = useMemo(
    () =>
      rows.filter((c) => {
        if (q && !`${c.title} ${c.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (scope !== "all" && c.scope !== scope) return false;
        if (active !== "all" && String(c.is_active) !== active) return false;
        if (display !== "all" && c.display_style !== display) return false;
        return true;
      }),
    [rows, q, scope, active, display],
  );

  function toggleActive(row: CollectionRow) {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
    toast.success(
      row.is_active
        ? t("catalog.collections.toggledInactive")
        : t("catalog.collections.toggledActive"),
    );
  }

  function remove(row: CollectionRow) {
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast.success(t("catalog.collections.deleted"));
  }

  const columns: Column<CollectionRow>[] = [
    {
      id: "title",
      header: t("catalog.collections.colTitle"),
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <Link
            to="/collections/$id/edit"
            params={{ id: r.id }}
            className="font-medium hover:text-primary"
          >
            {r.title}
          </Link>
          <p className="truncate font-mono text-xs text-muted-foreground">{r.slug}</p>
        </div>
      ),
    },
    {
      id: "scope",
      header: t("catalog.collections.colScope"),
      sortValue: (r) => r.scope,
      cell: (r) => <StatusBadge status={r.scope === "PLATFORM" ? "PUBLISHED" : "DRAFT"} />,
    },
    {
      id: "store",
      header: t("catalog.collections.colStore"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.store ?? "—"}</span>,
    },
    {
      id: "display",
      header: t("catalog.collections.colDisplay"),
      sortValue: (r) => r.display_style,
      cell: (r) => (
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {r.display_style}
        </span>
      ),
    },
    {
      id: "products",
      header: t("catalog.collections.colProducts"),
      align: "end",
      sortValue: (r) => r.cached_product_count,
      cell: (r) => <span className="font-mono tabular-nums">{r.cached_product_count}</span>,
    },
    {
      id: "active",
      header: t("catalog.collections.colActive"),
      cell: (r) => (
        <Switch
          checked={r.is_active}
          disabled={!has("collections.update")}
          onCheckedChange={() => toggleActive(r)}
          aria-label={t("catalog.collections.toggleActive")}
        />
      ),
    },
    {
      id: "priority",
      header: t("catalog.collections.colPriority"),
      align: "end",
      sortValue: (r) => r.priority,
      cell: (r) => (
        <span className="font-mono tabular-nums text-muted-foreground">{r.priority}</span>
      ),
    },
    {
      id: "starts",
      header: t("catalog.collections.colStarts"),
      sortValue: (r) => r.starts_at ?? "",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.starts_at ?? "—"}</span>,
    },
    {
      id: "ends",
      header: t("catalog.collections.colEnds"),
      sortValue: (r) => r.ends_at ?? "",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.ends_at ?? "—"}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("catalog.collections.title")}
        description={t("catalog.collections.desc")}
        actions={
          <Can perm="collections.create">
            <Can
              perm="collections.create_platform"
              fallback={
                <Button
                  onClick={() => navigate({ to: "/collections/new" })}
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  <Plus className="me-1.5 h-4 w-4" /> {t("catalog.collections.new")}
                </Button>
              }
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                    <Plus className="me-1.5 h-4 w-4" /> {t("catalog.collections.new")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/collections/new" search={{ scope: "STORE" }}>
                      <StoreIcon className="me-2 h-4 w-4" /> {t("catalog.collections.new")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/collections/new" search={{ scope: "PLATFORM" }}>
                      <Globe2 className="me-2 h-4 w-4" /> {t("catalog.collections.newPlatform")}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label={t("catalog.collections.kpiTotal")}
          value={rows.length}
          icon={<Layers className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("catalog.collections.kpiPlatform")}
          value={platform}
          icon={<Globe2 className="h-5 w-5" />}
        />
        <KpiCard
          label={t("catalog.collections.kpiStore")}
          value={store}
          icon={<StoreIcon className="h-5 w-5" />}
        />
        <KpiCard
          label={t("catalog.collections.kpiActive")}
          value={activeCount}
          icon={<Power className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("catalog.collections.searchPh")}
          count={filtered.length}
          countLabel={t("catalog.collections.count")}
          filters={
            <>
              <FilterSelect
                value={scope}
                onChange={setScope}
                label={t("catalog.collections.fScope")}
                options={[
                  ["PLATFORM", t("catalog.collections.scopePlatform")],
                  ["STORE", t("catalog.collections.scopeStore")],
                ]}
                allLabel={t("common.all")}
              />
              <FilterSelect
                value={active}
                onChange={setActive}
                label={t("catalog.collections.fActive")}
                options={[
                  ["true", t("catalog.collections.activeYes")],
                  ["false", t("catalog.collections.activeNo")],
                ]}
                allLabel={t("common.all")}
              />
              <FilterSelect
                value={display}
                onChange={setDisplay}
                label={t("catalog.collections.fDisplay")}
                options={DISPLAY_STYLES.map((d) => [d, d] as [string, string])}
                allLabel={t("common.all")}
              />
            </>
          }
        />
      </div>

      <PageStates
        state={filtered.length === 0 && state === "populated" ? "empty" : state}
        skeleton={<TableSkeleton rows={6} cols={8} />}
        missingPerms={["collections.view"]}
        empty={
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={t("catalog.collections.emptyTitle")}
            description={t("catalog.collections.emptyDesc")}
            action={
              <Can perm="collections.create">
                <Button
                  onClick={() => navigate({ to: "/collections/new" })}
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  <Plus className="me-1.5 h-4 w-4" /> {t("catalog.collections.new")}
                </Button>
              </Can>
            }
          />
        }
      >
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          rowActions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/collections/$id/edit" params={{ id: r.id }}>
                    <Pencil className="me-2 h-4 w-4" /> {t("common.edit")}
                  </Link>
                </DropdownMenuItem>
                <Can perm="collections.update">
                  <DropdownMenuItem onClick={() => toggleActive(r)}>
                    <Power className="me-2 h-4 w-4" /> {t("catalog.collections.toggleActive")}
                  </DropdownMenuItem>
                </Can>
                <Can perm="collections.update">
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                      </DropdownMenuItem>
                    }
                    title={t("catalog.collections.delete")}
                    description={t("catalog.collections.deleteDesc")}
                    confirmLabel={t("common.delete")}
                    destructive
                    typeToConfirm={r.title}
                    onConfirm={() => remove(r)}
                  />
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </PageStates>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: [string, string][];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] gap-1 border-transparent bg-muted/50">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
