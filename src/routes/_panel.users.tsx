import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Users,
  UserCog,
  Store as StoreIcon,
  CircleCheck,
  MoreHorizontal,
  Eye,
  Power,
  KeyRound,
  Shield,
  UserCheck,
  Download,
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
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { PEOPLE_USERS, ROLE_OPTIONS, type UserRow, type UserType } from "@/lib/mock/people";

export const Route = createFileRoute("/_panel/users")({
  head: () => ({ meta: [{ title: "Users — Mixlebs Admin" }] }),
  component: UsersPage,
});

const TYPES: UserType[] = ["STAFF", "STORE", "CUSTOMER"];
const TYPE_CLASS: Record<UserType, string> = {
  STAFF: "border-info/30 bg-info/10 text-info",
  STORE: "border-accent/30 bg-accent/10 text-accent",
  CUSTOMER: "border-primary/30 bg-primary/10 text-primary",
};

function UsersPage() {
  const t = useT();
  const navigate = useNavigate();
  const perms = usePermissions();
  const state = usePageState();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<UserType | "all">("all");
  const [active, setActive] = useState<"all" | "yes" | "no">("all");
  const [registered, setRegistered] = useState<"all" | "yes" | "no">("all");
  const [role, setRole] = useState("all");

  const rows = useMemo(
    () =>
      PEOPLE_USERS.filter((u) => {
        const hay = `${u.first_name} ${u.last_name} ${u.email} ${u.phone}`.toLowerCase();
        if (search && !hay.includes(search.toLowerCase())) return false;
        if (type !== "all" && u.type !== type) return false;
        if (active !== "all" && u.is_active !== (active === "yes")) return false;
        if (registered !== "all" && u.register_completed !== (registered === "yes")) return false;
        if (role !== "all" && !u.roles.includes(role)) return false;
        return true;
      }),
    [search, type, active, registered, role],
  );

  const staff = PEOPLE_USERS.filter((u) => u.type === "STAFF").length;
  const stores = PEOPLE_USERS.filter((u) => u.type === "STORE").length;
  const activeCount = PEOPLE_USERS.filter((u) => u.is_active).length;

  function open(u: UserRow) {
    navigate({ to: "/users/$id", params: { id: u.id } });
  }

  const columns: Column<UserRow>[] = [
    {
      id: "name",
      header: t("people.users.colUser"),
      sortValue: (u) => `${u.first_name} ${u.last_name}`,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-muted text-xs">
              {u.first_name[0]}
              {u.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {u.first_name} {u.last_name}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{u.username}</p>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      header: t("people.users.colEmail"),
      sortValue: (u) => u.email,
      cell: (u) => <span className="text-sm">{u.email}</span>,
    },
    {
      id: "phone",
      header: t("people.users.colPhone"),
      cell: (u) => (
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">
          {u.phone}
        </span>
      ),
    },
    {
      id: "type",
      header: t("people.users.colType"),
      sortValue: (u) => u.type,
      cell: (u) => (
        <Badge variant="outline" className={TYPE_CLASS[u.type]}>
          {t(`people.users.type${u.type}`)}
        </Badge>
      ),
    },
    {
      id: "is_active",
      header: t("people.users.colActive"),
      align: "center",
      cell: (u) => <Dot on={u.is_active} />,
    },
    {
      id: "is_superuser",
      header: t("people.users.colSuperuser"),
      align: "center",
      cell: (u) =>
        u.is_superuser ? (
          <Shield className="mx-auto h-4 w-4 text-warning" />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        ),
    },
    {
      id: "register_completed",
      header: t("people.users.colRegister"),
      align: "center",
      cell: (u) => <Dot on={u.register_completed} />,
    },
    {
      id: "roles",
      header: t("people.users.colRoles"),
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r} variant="outline" className="text-[10px]">
              {r}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "last_login",
      header: t("people.users.colLastLogin"),
      sortValue: (u) => u.last_login,
      cell: (u) => <span className="text-xs text-muted-foreground">{u.last_login}</span>,
    },
    {
      id: "date_joined",
      header: t("people.users.colJoined"),
      sortValue: (u) => u.date_joined,
      cell: (u) => <span className="text-xs text-muted-foreground">{u.date_joined}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("people.users.title")}
        description={t("people.users.desc")}
        actions={
          <>
            <Button variant="outline">
              <Download className="me-1.5 h-4 w-4" /> {t("common.export")}
            </Button>
            <Can perm="users.create_staff">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => navigate({ to: "/users/new" })}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t("people.users.newStaff")}
              </Button>
            </Can>
          </>
        }
      />

      <PageStates
        state={state}
        skeleton={<TableSkeleton rows={5} cols={6} />}
        missingPerms={["users.view"]}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("people.users.kpiTotal")}
            value={PEOPLE_USERS.length}
            icon={<Users className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("people.users.kpiStaff")}
            value={staff}
            icon={<UserCog className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.users.kpiStores")}
            value={stores}
            icon={<StoreIcon className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.users.kpiActive")}
            value={activeCount}
            icon={<CircleCheck className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("people.users.search")}
            count={rows.length}
            countLabel={t("people.users.countLabel")}
            filters={
              <>
                <FilterSelect
                  value={type}
                  onChange={(v) => setType(v as UserType | "all")}
                  options={[
                    { value: "all", label: t("people.users.fType") },
                    ...TYPES.map((ty) => ({ value: ty, label: t(`people.users.type${ty}`) })),
                  ]}
                />
                <FilterSelect
                  value={active}
                  onChange={(v) => setActive(v as typeof active)}
                  options={[
                    { value: "all", label: t("people.users.fActive") },
                    { value: "yes", label: t("common.yes") },
                    { value: "no", label: t("common.no") },
                  ]}
                />
                <FilterSelect
                  value={registered}
                  onChange={(v) => setRegistered(v as typeof registered)}
                  options={[
                    { value: "all", label: t("people.users.fRegisterCompleted") },
                    { value: "yes", label: t("people.users.completed") },
                    { value: "no", label: t("people.users.incomplete") },
                  ]}
                />
                <FilterSelect
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: "all", label: t("people.users.fRoleAll") },
                    ...ROLE_OPTIONS.map((r) => ({ value: r, label: r })),
                  ]}
                />
              </>
            }
          />
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(u) => u.id}
            onRowClick={open}
            rowActions={(u) => (
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
                  <DropdownMenuItem onClick={() => open(u)}>
                    <Eye className="me-2 h-4 w-4" /> {t("people.users.actView")}
                  </DropdownMenuItem>
                  <Can perm="users.update">
                    <DropdownMenuItem
                      onClick={() =>
                        toast.success(
                          t(u.is_active ? "people.users.tDeactivated" : "people.users.tActivated"),
                        )
                      }
                    >
                      <Power className="me-2 h-4 w-4" />{" "}
                      {u.is_active
                        ? t("people.users.actDeactivate")
                        : t("people.users.actActivate")}
                    </DropdownMenuItem>
                  </Can>
                  <Can perm="users.reset_password">
                    <DropdownMenuItem onClick={() => toast.success(t("people.users.tReset"))}>
                      <KeyRound className="me-2 h-4 w-4" /> {t("people.users.actReset")}
                    </DropdownMenuItem>
                  </Can>
                  {perms.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast.success(t("people.users.tRoleAdded"))}>
                        <Shield className="me-2 h-4 w-4" /> {t("people.users.actAssignRole")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast(t("people.users.tImpersonate"))}>
                        <UserCheck className="me-2 h-4 w-4" /> {t("people.users.actImpersonate")}
                      </DropdownMenuItem>
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
      className={`mx-auto inline-block h-2 w-2 rounded-full ${on ? "bg-success" : "bg-muted-foreground/40"}`}
    />
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
