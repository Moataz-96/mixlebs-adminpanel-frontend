import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Truck, MapPin, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can, usePermissions } from "@/components/shared/Can";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { COURIER_ROWS, type CourierRow } from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/couriers")({
  head: () => ({ meta: [{ title: "Couriers — Mixlebs Admin" }] }),
  component: CouriersPage,
});

function CouriersPage() {
  const t = useT();
  const navigate = useNavigate();
  const state = usePageState();
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => COURIER_ROWS.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const activeCount = COURIER_ROWS.filter((c) => c.is_active).length;
  const totalAreas = COURIER_ROWS.reduce((a, c) => a + c.regions, 0);
  const avgEta = (COURIER_ROWS.reduce((a, c) => a + c.eta_days, 0) / COURIER_ROWS.length).toFixed(
    1,
  );

  const columns: Column<CourierRow>[] = [
    {
      id: "logo",
      header: t("finance.couriers.colLogo"),
      width: "56px",
      cell: (c) => (
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-[11px] font-bold text-primary-foreground shadow-glow">
          {c.logo}
        </div>
      ),
    },
    {
      id: "name",
      header: t("finance.couriers.colName"),
      sortValue: (c) => c.name,
      cell: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      id: "rank",
      header: t("finance.couriers.colRank"),
      align: "end",
      sortValue: (c) => c.rank,
      cell: (c) => <span className="font-mono tabular-nums">{c.rank}</span>,
    },
    {
      id: "eta",
      header: t("finance.couriers.colEta"),
      align: "end",
      sortValue: (c) => c.eta_days,
      cell: (c) => <Badge variant="outline">{t("finance.couriers.days", { n: c.eta_days })}</Badge>,
    },
    {
      id: "baseFee",
      header: t("finance.couriers.colBaseFee"),
      align: "end",
      sortValue: (c) => c.base_fee,
      cell: (c) => <span className="font-mono tabular-nums">${c.base_fee.toFixed(2)}</span>,
    },
    {
      id: "regions",
      header: t("finance.couriers.colRegions"),
      align: "end",
      sortValue: (c) => c.regions,
      cell: (c) => (
        <span className="text-sm text-muted-foreground">
          {t("finance.couriers.regionsCount", { n: c.regions })}
        </span>
      ),
    },
    {
      id: "active",
      header: t("finance.couriers.colActive"),
      align: "center",
      sortValue: (c) => (c.is_active ? 1 : 0),
      cell: (c) =>
        c.is_active ? (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/15 text-success font-mono text-[10px] uppercase tracking-wider"
          >
            {t("finance.couriers.active")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-border bg-muted text-muted-foreground font-mono text-[10px] uppercase tracking-wider"
          >
            {t("finance.couriers.inactive")}
          </Badge>
        ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("finance.couriers.title")}
        description={t("finance.couriers.description")}
        actions={
          <Can perm="couriers.update">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => navigate({ to: "/couriers/$id/edit", params: { id: "new" } })}
            >
              <Plus className="me-1.5 h-4 w-4" /> {t("finance.couriers.newCourier")}
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("finance.couriers.kpiActive")}
          value={activeCount}
          icon={<Truck className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("finance.couriers.kpiAreas")}
          value={totalAreas}
          icon={<MapPin className="h-5 w-5" />}
        />
        <KpiCard
          label={t("finance.couriers.kpiEta")}
          value={t("finance.couriers.days", { n: avgEta })}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("finance.couriers.searchPlaceholder")}
          count={filtered.length}
          countLabel={t("finance.couriers.countLabel")}
        />
        <PageStates
          state={state}
          skeleton={<TableSkeleton rows={4} cols={6} />}
          empty={<EmptyCouriers />}
          missingPerms={["couriers.view"]}
        >
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(c) => c.id}
            emptyState={<EmptyCouriers />}
            rowActions={(c) => <CourierRowActions courier={c} />}
          />
        </PageStates>
      </div>
    </div>
  );
}

function CourierRowActions({ courier }: { courier: CourierRow }) {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  // couriers.update is admin-only; STORE/STAFF see read-only list with no menu.
  if (!has("couriers.update")) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 opacity-60 group-hover:opacity-100"
          aria-label={t("common.actions")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => navigate({ to: "/couriers/$id/edit", params: { id: courier.id } })}
        >
          <Pencil className="me-2 h-3.5 w-3.5" /> {t("finance.couriers.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
              <Trash2 className="me-2 h-3.5 w-3.5" /> {t("finance.couriers.delete")}
            </DropdownMenuItem>
          }
          title={t("finance.couriers.deleteConfirmTitle")}
          destructive
          typeToConfirm={courier.name}
          confirmLabel={t("finance.couriers.delete")}
          onConfirm={() => toast.success(t("finance.couriers.deleted", { name: courier.name }))}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyCouriers() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <Truck className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {t("finance.couriers.emptyTitle")}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("finance.couriers.emptyDesc")}
      </p>
      <Can perm="couriers.update">
        <Button
          className="mt-5 bg-gradient-primary text-primary-foreground shadow-glow"
          onClick={() => navigate({ to: "/couriers/$id/edit", params: { id: "new" } })}
        >
          <Plus className="me-1.5 h-4 w-4" /> {t("finance.couriers.newCourier")}
        </Button>
      </Can>
    </div>
  );
}
