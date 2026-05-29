import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ADMIN_REGIONS, type AdminRegion } from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/locations/regions")({
  head: () => ({ meta: [{ title: "Regions — Mixlebs Admin" }] }),
  component: RegionsPage,
});

function RegionsPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();

  if (!has("locations.view")) {
    return (
      <div className="p-6">
        <PageHeader
          title={t("admin.locations.regions.title")}
          description={t("admin.locations.regions.subtitle")}
        />
        <ForbiddenState perms={["locations.view"]} />
      </div>
    );
  }

  const columns: Column<AdminRegion>[] = [
    {
      id: "name",
      header: t("admin.locations.regions.colName"),
      cell: (r) => <span className="font-medium">{r.name}</span>,
      sortValue: (r) => r.name,
    },
    {
      id: "code",
      header: t("admin.locations.regions.colCode"),
      cell: (r) => <code className="font-mono text-xs">{r.code}</code>,
      sortValue: (r) => r.code,
    },
    {
      id: "country",
      header: t("admin.locations.regions.colCountry"),
      cell: (r) => <span className="text-sm">{r.country}</span>,
      sortValue: (r) => r.country,
    },
    {
      id: "active",
      header: t("admin.locations.regions.colActive"),
      align: "center",
      cell: (r) => (
        <Badge
          variant="outline"
          className={
            r.active
              ? "border-success/30 bg-success/15 text-success"
              : "border-border bg-muted text-muted-foreground"
          }
        >
          {r.active ? t("admin.common.enabled") : t("admin.common.disabled")}
        </Badge>
      ),
      sortValue: (r) => (r.active ? 1 : 0),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("admin.locations.regions.title")}
        description={t("admin.locations.regions.subtitle")}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label={t("admin.locations.regions.title")}
          value={ADMIN_REGIONS.length}
          icon={<Map className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.locations.regions.colActive")}
          value={ADMIN_REGIONS.filter((r) => r.active).length}
        />
      </div>

      <div className="mt-6">
        <PageStates
          state={state}
          missingPerms={["locations.view"]}
          empty={
            <div className="rounded-2xl border border-dashed bg-muted/30 p-16 text-center text-sm text-muted-foreground">
              {t("admin.locations.regions.emptyTitle")}
            </div>
          }
        >
          <DataTable
            data={ADMIN_REGIONS}
            columns={columns}
            getRowId={(r) => r.id}
            paginate={false}
          />
        </PageStates>
      </div>
    </div>
  );
}
