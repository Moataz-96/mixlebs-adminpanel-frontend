import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserRound,
  Ban,
  ShoppingBag,
  DollarSign,
  MoreHorizontal,
  Eye,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
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
import { usePageState, type PageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import { listCustomers, blockReturns, type AdminCustomer } from "@/lib/api/customers.functions";

// Frozen-UI local row shape (was mock CustomerRow). Mapped from BE Customer;
// orders / total_spent / wallet_balance are now BE-supplied (CLOSES ENTRY 025).
type Gender = "MALE" | "FEMALE" | "OTHER";
interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dob: string;
  orders: number;
  total_spent: number;
  wallet_balance: number;
  is_return_blocked: boolean;
  date_joined: string;
}

function mapCustomer(c: AdminCustomer): CustomerRow {
  return {
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    email: c.email,
    phone: c.phone ?? "",
    gender: (c.gender ?? "OTHER") as Gender,
    dob: c.dob ?? "",
    orders: c.orders_count ?? 0,
    total_spent: Number(c.total_spent) || 0,
    wallet_balance: Number(c.wallet_balance ?? c.wallet) || 0,
    is_return_blocked: c.is_return_blocked,
    date_joined: (c.date_joined ?? c.created_at ?? "").slice(0, 10),
  };
}

export const Route = createFileRoute("/_panel/customers")({
  head: () => ({ meta: [{ title: "Customers — Mixlebs Admin" }] }),
  component: CustomersPage,
});

const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];

function CustomersPage() {
  const t = useT();
  const navigate = useNavigate();
  const perms = usePermissions();
  const pageState = usePageState();
  const queryClient = useQueryClient();
  const canView = perms.has("customers.view");

  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<Gender | "all">("all");
  const [blocked, setBlocked] = useState<"all" | "yes" | "no">("all");
  const [hasOrders, setHasOrders] = useState<"all" | "yes" | "no">("all");

  const customersQuery = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listCustomers({ data: { page_size: 200 } }),
    enabled: canView,
    staleTime: 30 * 1000,
  });
  const allRows: CustomerRow[] = useMemo(
    () => (customersQuery.data?.results ?? []).map(mapCustomer),
    [customersQuery.data],
  );

  // Staff-side only: STORE users lack customers.view → forbidden.
  const state: PageState = !canView
    ? "forbidden"
    : pageState !== "populated"
      ? pageState
      : customersQuery.isLoading
        ? "loading"
        : customersQuery.isError
          ? "error"
          : "populated";

  const blockMutation = useMutation({
    mutationFn: (c: CustomerRow) =>
      blockReturns({ data: { id: c.id, is_return_blocked: !c.is_return_blocked } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const rows = useMemo(
    () =>
      allRows.filter((c) => {
        const hay = `${c.name} ${c.email} ${c.phone}`.toLowerCase();
        if (search && !hay.includes(search.toLowerCase())) return false;
        if (gender !== "all" && c.gender !== gender) return false;
        if (blocked !== "all" && c.is_return_blocked !== (blocked === "yes")) return false;
        if (hasOrders !== "all" && c.orders > 0 !== (hasOrders === "yes")) return false;
        return true;
      }),
    [allRows, search, gender, blocked, hasOrders],
  );

  const total = allRows.length;
  const orders = allRows.reduce((a, c) => a + c.orders, 0);
  const ltv = allRows.reduce((a, c) => a + c.total_spent, 0);
  const blockedCount = allRows.filter((c) => c.is_return_blocked).length;

  function open(c: CustomerRow) {
    navigate({ to: "/customers/$id", params: { id: c.id } });
  }

  const columns: Column<CustomerRow>[] = [
    {
      id: "name",
      header: t("people.customers.colCustomer"),
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">
              {c.name
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{c.id}</p>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      header: t("people.customers.colEmail"),
      sortValue: (c) => c.email,
      cell: (c) => <span className="text-sm">{c.email}</span>,
    },
    {
      id: "phone",
      header: t("people.customers.colPhone"),
      cell: (c) => (
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">
          {c.phone}
        </span>
      ),
    },
    {
      id: "gender",
      header: t("people.customers.colGender"),
      sortValue: (c) => c.gender,
      cell: (c) => <span className="text-sm">{t(`people.customers.gender${c.gender}`)}</span>,
    },
    {
      id: "dob",
      header: t("people.customers.colDob"),
      sortValue: (c) => c.dob,
      cell: (c) => <span className="text-sm text-muted-foreground">{c.dob}</span>,
    },
    {
      id: "orders",
      header: t("people.customers.colOrders"),
      align: "end",
      sortValue: (c) => c.orders,
      cell: (c) => <span className="font-mono tabular-nums">{c.orders}</span>,
    },
    {
      id: "total_spent",
      header: t("people.customers.colSpent"),
      align: "end",
      sortValue: (c) => c.total_spent,
      cell: (c) => (
        <span className="font-mono font-semibold tabular-nums">${c.total_spent.toFixed(2)}</span>
      ),
    },
    {
      id: "wallet_balance",
      header: t("people.customers.colWallet"),
      align: "end",
      sortValue: (c) => c.wallet_balance,
      cell: (c) => <span className="font-mono tabular-nums">${c.wallet_balance.toFixed(2)}</span>,
    },
    {
      id: "is_return_blocked",
      header: t("people.customers.colBlocked"),
      cell: (c) =>
        c.is_return_blocked ? (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive"
          >
            {t("people.customers.statusBlocked")}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            {t("people.customers.statusActive")}
          </Badge>
        ),
    },
    {
      id: "date_joined",
      header: t("people.customers.colJoined"),
      sortValue: (c) => c.date_joined,
      cell: (c) => <span className="text-xs text-muted-foreground">{c.date_joined}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("people.customers.title")} description={t("people.customers.desc")} />

      <PageStates
        state={state}
        skeleton={<TableSkeleton rows={6} cols={6} />}
        missingPerms={["customers.view"]}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("people.customers.kpiTotal")}
            value={total}
            icon={<UserRound className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("people.customers.kpiOrders")}
            value={orders}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.customers.kpiLtv")}
            value={`$${ltv.toFixed(0)}`}
            delta={t("people.customers.kpiLtvDelta")}
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.customers.kpiBlocked")}
            value={blockedCount}
            icon={<Ban className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("people.customers.search")}
            count={rows.length}
            countLabel={t("people.customers.countLabel")}
            filters={
              <>
                <FilterSelect
                  value={gender}
                  onChange={(v) => setGender(v as Gender | "all")}
                  options={[
                    { value: "all", label: t("people.customers.fGender") },
                    ...GENDERS.map((g) => ({ value: g, label: t(`people.customers.gender${g}`) })),
                  ]}
                />
                <FilterSelect
                  value={blocked}
                  onChange={(v) => setBlocked(v as typeof blocked)}
                  options={[
                    { value: "all", label: t("people.customers.fReturnBlocked") },
                    { value: "yes", label: t("people.customers.statusBlocked") },
                    { value: "no", label: t("people.customers.statusActive") },
                  ]}
                />
                <FilterSelect
                  value={hasOrders}
                  onChange={(v) => setHasOrders(v as typeof hasOrders)}
                  options={[
                    { value: "all", label: t("people.customers.fHasOrders") },
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]}
                />
              </>
            }
          />
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(c) => c.id}
            onRowClick={open}
            rowActions={(c) => (
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
                  <DropdownMenuItem onClick={() => open(c)}>
                    <Eye className="me-2 h-4 w-4" /> {t("people.customers.actView")}
                  </DropdownMenuItem>
                  <Can perm="notifications.send">
                    <DropdownMenuItem
                      onClick={() => toast.success(t("people.customers.tNotified"))}
                    >
                      <BellRing className="me-2 h-4 w-4" /> {t("people.customers.actNotify")}
                    </DropdownMenuItem>
                  </Can>
                  <Can perm="customers.block_returns">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className={c.is_return_blocked ? "" : "text-destructive"}
                      onClick={() =>
                        blockMutation.mutate(c, {
                          onSuccess: () =>
                            toast.success(
                              t(
                                c.is_return_blocked
                                  ? "people.customers.tUnblocked"
                                  : "people.customers.tBlocked",
                              ),
                            ),
                        })
                      }
                    >
                      <Ban className="me-2 h-4 w-4" />{" "}
                      {c.is_return_blocked
                        ? t("people.customers.actUnblock")
                        : t("people.customers.actBlock")}
                    </DropdownMenuItem>
                  </Can>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </div>
      </PageStates>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[120px] gap-1.5">
        <SelectValue />
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
