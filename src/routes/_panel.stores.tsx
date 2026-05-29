import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Store as StoreIcon,
  ShieldCheck,
  ShieldAlert,
  Ban,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Pause,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column, type BulkAction } from "@/components/shared/DataTable";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePageState } from "@/lib/page-state";
import { useT, type TFunction } from "@/lib/i18n";
import {
  STORES,
  VENDORS,
  type StoreRow,
  type StoreStatus,
  type AccountType,
} from "@/lib/mock/people";

// StatusBadge's map doesn't carry the StoreStatusEnum keys, so render the badge
// inline with the same visual language (matching shared/StatusBadge classes).
const STORE_STATUS_CLASS: Record<StoreStatus, string> = {
  VERIFIED: "bg-success/15 text-success border-success/30",
  PENDING_VERIFICATION: "bg-warning/15 text-warning border-warning/30",
  PENDING_PAYMENT: "bg-info/15 text-info border-info/30",
  UNVERIFIED: "bg-muted text-muted-foreground border-border",
  BLOCKED: "bg-destructive/15 text-destructive border-destructive/30",
};

function storeStatusBadge(status: StoreStatus, t: TFunction) {
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[10px] uppercase tracking-wider", STORE_STATUS_CLASS[status])}
    >
      {t(`people.storeStatus.${status}`)}
    </Badge>
  );
}

export const Route = createFileRoute("/_panel/stores")({
  head: () => ({ meta: [{ title: "Stores — Mixlebs Admin" }] }),
  component: StoresPage,
});

const STATUSES: StoreStatus[] = [
  "UNVERIFIED",
  "PENDING_VERIFICATION",
  "PENDING_PAYMENT",
  "VERIFIED",
  "BLOCKED",
];
const ACCOUNT_TYPES: AccountType[] = ["INDIVIDUAL", "COMPANY"];
const YES_NO = ["any", "yes", "no"] as const;
type YesNo = (typeof YES_NO)[number];

function matchToggle(filter: YesNo, value: boolean) {
  return filter === "any" || (filter === "yes" ? value : !value);
}

function StoresPage() {
  const t = useT();
  const navigate = useNavigate();
  const perms = usePermissions();
  const state = usePageState();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StoreStatus | "all">("all");
  const [accountType, setAccountType] = useState<AccountType | "all">("all");
  const [orderOnline, setOrderOnline] = useState<YesNo>("any");
  const [returns, setReturns] = useState<YesNo>("any");
  const [chat, setChat] = useState<YesNo>("any");
  const [vendor, setVendor] = useState<string>("all");

  const rows = useMemo(
    () =>
      STORES.filter((s) => {
        if (search && !s.shop_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (status !== "all" && s.status !== status) return false;
        if (accountType !== "all" && s.account_type !== accountType) return false;
        if (!matchToggle(orderOnline, s.order_online)) return false;
        if (!matchToggle(returns, s.returns)) return false;
        if (!matchToggle(chat, s.chat)) return false;
        if (vendor !== "all" && s.vendor !== vendor) return false;
        return true;
      }),
    [search, status, accountType, orderOnline, returns, chat, vendor],
  );

  const verified = STORES.filter((s) => s.status === "VERIFIED").length;
  const pending = STORES.filter((s) => s.status === "PENDING_VERIFICATION").length;
  const blocked = STORES.filter((s) => s.status === "BLOCKED").length;

  function open(s: StoreRow) {
    navigate({ to: "/stores/$id", params: { id: s.id } });
  }

  const columns: Column<StoreRow>[] = [
    {
      id: "shop_name",
      header: t("people.stores.colShop"),
      sortValue: (s) => s.shop_name,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
              {s.logo}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{s.shop_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: t("people.stores.colStatus"),
      sortValue: (s) => s.status,
      cell: (s) => storeStatusBadge(s.status, t),
    },
    {
      id: "account_type",
      header: t("people.stores.colAccountType"),
      sortValue: (s) => s.account_type,
      cell: (s) => <span className="text-sm">{t(`people.accountType.${s.account_type}`)}</span>,
    },
    {
      id: "rank",
      header: t("people.stores.colRank"),
      align: "end",
      sortValue: (s) => s.rank,
      cell: (s) => <span className="font-mono tabular-nums">{s.rank}</span>,
    },
    {
      id: "order_online",
      header: t("people.stores.colOrderOnline"),
      align: "center",
      cell: (s) => <Dot on={s.order_online} />,
    },
    {
      id: "returns",
      header: t("people.stores.colReturns"),
      align: "center",
      cell: (s) => <Dot on={s.returns} />,
    },
    {
      id: "chat",
      header: t("people.stores.colChat"),
      align: "center",
      cell: (s) => <Dot on={s.chat} />,
    },
    {
      id: "asset_sharing",
      header: t("people.stores.colAssetSharing"),
      align: "center",
      cell: (s) => <Dot on={s.asset_sharing} />,
    },
    {
      id: "products",
      header: t("people.stores.colProducts"),
      align: "end",
      sortValue: (s) => s.products,
      cell: (s) => <span className="font-mono tabular-nums">{s.products}</span>,
    },
    {
      id: "orders",
      header: t("people.stores.colOrders"),
      align: "end",
      sortValue: (s) => s.orders,
      cell: (s) => <span className="font-mono tabular-nums">{s.orders}</span>,
    },
    {
      id: "created_at",
      header: t("people.stores.colCreated"),
      sortValue: (s) => s.created_at,
      cell: (s) => <span className="text-sm text-muted-foreground">{s.created_at}</span>,
    },
  ];

  const bulkActions: BulkAction[] = [
    ...(perms.has("stores.transition_status")
      ? [
          {
            label: t("people.stores.bulkChangeStatus"),
            onClick: () => toast.success(t("people.stores.tStatusChanged")),
          },
        ]
      : []),
    ...(perms.role === "admin"
      ? [
          {
            label: t("people.stores.bulkAssignVendor"),
            onClick: () => toast.success(t("people.stores.tSaved")),
          },
        ]
      : []),
    ...(perms.has("stores.update")
      ? [
          {
            label: t("people.stores.bulkFlipOrderOnline"),
            onClick: () => toast.success(t("people.stores.tSaved")),
          },
          {
            label: t("people.stores.bulkFlipReturns"),
            onClick: () => toast.success(t("people.stores.tSaved")),
          },
          {
            label: t("people.stores.bulkFlipChat"),
            onClick: () => toast.success(t("people.stores.tSaved")),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("people.stores.title")} description={t("people.stores.desc")} />

      <PageStates
        state={state}
        skeleton={<TableSkeleton rows={6} cols={6} />}
        missingPerms={["stores.view"]}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("people.stores.kpiTotal")}
            value={STORES.length}
            icon={<StoreIcon className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("people.stores.kpiVerified")}
            value={verified}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.stores.kpiPending")}
            value={pending}
            delta={t("people.stores.kpiPendingDelta")}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.stores.kpiBlocked")}
            value={blocked}
            icon={<Ban className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("people.stores.search")}
            count={rows.length}
            countLabel={t("people.stores.countLabel")}
            filters={
              <>
                <FilterSelect
                  value={status}
                  onChange={(v) => setStatus(v as StoreStatus | "all")}
                  placeholder={t("people.stores.fStatus")}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...STATUSES.map((s) => ({ value: s, label: t(`people.storeStatus.${s}`) })),
                  ]}
                />
                <FilterSelect
                  value={accountType}
                  onChange={(v) => setAccountType(v as AccountType | "all")}
                  placeholder={t("people.stores.fAccountType")}
                  options={[
                    { value: "all", label: t("common.all") },
                    ...ACCOUNT_TYPES.map((a) => ({
                      value: a,
                      label: t(`people.accountType.${a}`),
                    })),
                  ]}
                />
                <FilterSelect
                  value={orderOnline}
                  onChange={(v) => setOrderOnline(v as YesNo)}
                  placeholder={t("people.stores.fOrderOnline")}
                  options={[
                    { value: "any", label: t("people.stores.fOrderOnline") },
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]}
                />
                <FilterSelect
                  value={returns}
                  onChange={(v) => setReturns(v as YesNo)}
                  placeholder={t("people.stores.fReturns")}
                  options={[
                    { value: "any", label: t("people.stores.fReturns") },
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]}
                />
                <FilterSelect
                  value={chat}
                  onChange={(v) => setChat(v as YesNo)}
                  placeholder={t("people.stores.fChat")}
                  options={[
                    { value: "any", label: t("people.stores.fChat") },
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]}
                />
                <FilterSelect
                  value={vendor}
                  onChange={setVendor}
                  placeholder={t("people.stores.fVendor")}
                  options={[
                    { value: "all", label: t("people.stores.fVendorAll") },
                    ...VENDORS.map((v) => ({ value: v, label: v })),
                  ]}
                />
              </>
            }
          />
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(s) => s.id}
            onRowClick={open}
            bulkActions={bulkActions.length ? bulkActions : undefined}
            rowActions={(s) => (
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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => open(s)}>
                    <Eye className="me-2 h-4 w-4" /> {t("people.stores.actView")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => open(s)}>
                    <ExternalLink className="me-2 h-4 w-4" /> {t("people.stores.actOpen")}
                  </DropdownMenuItem>
                  {perms.has("stores.transition_status") && (
                    <DropdownMenuItem onClick={() => toast.success(t("people.stores.tSuspended"))}>
                      <Pause className="me-2 h-4 w-4" /> {t("people.stores.actSuspend")}
                    </DropdownMenuItem>
                  )}
                  {perms.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <ConfirmDialog
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                          >
                            <Trash2 className="me-2 h-4 w-4" /> {t("people.stores.actDelete")}
                          </DropdownMenuItem>
                        }
                        title={t("people.stores.actDelete")}
                        destructive
                        typeToConfirm={s.shop_name}
                        confirmLabel={t("common.delete")}
                        onConfirm={() => toast.success(t("people.stores.tDeleted"))}
                      />
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </div>
      </PageStates>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${on ? "bg-success" : "bg-muted-foreground/40"}`}
    />
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] gap-1.5">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
