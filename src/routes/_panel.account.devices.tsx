import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Monitor, Apple, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import { listDevices, revokeDevice, type AdminDeviceToken } from "@/lib/api/account.functions";

export const Route = createFileRoute("/_panel/account/devices")({
  head: () => ({ meta: [{ title: "Devices — Mixlebs Admin" }] }),
  component: DevicesPage,
});

// Frozen-UI local row shape (was mock DeviceTokenRow). Mapped from the BE
// DeviceToken; `label`/`created_at` are not on the schema (ENTRY 030).
type DeviceType = "IOS" | "ANDROID" | "WEB";
interface DeviceTokenRow {
  id: string;
  device_type: DeviceType;
  label: string;
  is_valid: boolean;
  created_at: string;
}

const TYPE_ICON = { IOS: Apple, ANDROID: Smartphone, WEB: Monitor } as const;

function normType(ty: string | null): DeviceType {
  const v = (ty ?? "").toUpperCase();
  return v === "IOS" || v === "ANDROID" || v === "WEB" ? (v as DeviceType) : "WEB";
}

function mapDevice(d: AdminDeviceToken): DeviceTokenRow {
  return {
    id: String(d.id),
    device_type: normType(d.device_type),
    label: d.token,
    is_valid: d.is_valid,
    created_at: "",
  };
}

function DevicesPage() {
  const t = useT();
  const previewState = usePageState();
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({
    queryKey: ["account-devices"],
    queryFn: () => listDevices(),
    staleTime: 30 * 1000,
  });
  const ACCOUNT_DEVICES: DeviceTokenRow[] = useMemo(
    () => (devicesQuery.data?.results ?? []).map(mapDevice),
    [devicesQuery.data],
  );

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : devicesQuery.isLoading
        ? "loading"
        : devicesQuery.isError
          ? "error"
          : "populated";

  const revokeMutation = useMutation({
    mutationFn: (rowId: string) => revokeDevice({ data: { id: Number(rowId) } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-devices"] });
      toast.success(t("account.deviceRevoked"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const typeLabel = (ty: DeviceTokenRow["device_type"]) =>
    ty === "IOS"
      ? t("account.typeIos")
      : ty === "ANDROID"
        ? t("account.typeAndroid")
        : t("account.typeWeb");

  const columns: Column<DeviceTokenRow>[] = [
    {
      id: "device_type",
      header: t("account.colDeviceType"),
      sortValue: (r) => r.device_type,
      cell: (r) => {
        const Icon = TYPE_ICON[r.device_type];
        return (
          <span className="flex items-center gap-2 font-medium">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            {typeLabel(r.device_type)}
          </span>
        );
      },
    },
    {
      id: "label",
      header: t("account.colLabel"),
      sortValue: (r) => r.label,
      cell: (r) => <span className="text-sm text-muted-foreground">{r.label}</span>,
    },
    {
      id: "is_valid",
      header: t("account.colValid"),
      sortValue: (r) => (r.is_valid ? 1 : 0),
      cell: (r) => (
        <Badge
          variant="outline"
          className={
            r.is_valid
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }
        >
          {r.is_valid ? t("account.valid") : t("account.invalid")}
        </Badge>
      ),
    },
    {
      id: "created_at",
      header: t("account.colCreated"),
      sortValue: (r) => r.created_at,
      align: "end",
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.created_at}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("account.devTitle")} description={t("account.devSubtitle")} />
      <PageStates state={state} skeleton={<TableSkeleton rows={4} cols={4} />}>
        <KpiCard
          label={t("account.devActive")}
          value={ACCOUNT_DEVICES.filter((d) => d.is_valid).length}
          accent
          icon={<Monitor className="h-5 w-5" />}
        />
        <div className="mt-6">
          <DataTable
            data={ACCOUNT_DEVICES}
            columns={columns}
            getRowId={(r) => r.id}
            paginate={false}
            rowActions={(r) => (
              <ConfirmDialog
                title={t("account.revokeDeviceTitle")}
                description={t("account.revokeDeviceDesc")}
                confirmLabel={t("account.revokeDevice")}
                destructive
                onConfirm={() => revokeMutation.mutate(r.id)}
                trigger={
                  <Button size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="me-1.5 h-3.5 w-3.5" /> {t("account.revokeDevice")}
                  </Button>
                }
              />
            )}
          />
        </div>
      </PageStates>
    </div>
  );
}
