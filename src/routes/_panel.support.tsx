import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LifeBuoy, Clock, CheckCircle2, UserCheck, Star, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, EmptyState, ForbiddenState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Can, usePermissions } from "@/components/shared/Can";
import { useApp } from "@/lib/app-context";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { SUPPORT_INBOX, type SupportSession } from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/support")({
  head: () => ({ meta: [{ title: "Support inbox — Mixlebs Admin" }] }),
  component: SupportPage,
});

type TabKey = "unassigned" | "mine" | "all_open" | "closed";

function SupportPage() {
  const t = useT();
  const state = usePageState();
  const navigate = useNavigate();
  const { role } = useApp();
  const { has } = usePermissions();
  const canView = has("chat.support_inbox_view");

  const [tab, setTab] = useState<TabKey>("unassigned");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<SupportSession[]>(SUPPORT_INBOX);

  const filtered = useMemo(
    () =>
      rows.filter((s) => {
        if (tab === "unassigned" && !(s.status === "OPEN" && !s.assigned_to)) return false;
        if (tab === "mine" && s.assigned_to !== "me") return false;
        if (tab === "all_open" && s.status === "CLOSED") return false;
        if (tab === "closed" && s.status !== "CLOSED") return false;
        if (search && !s.customer.toLowerCase().includes(search.toLowerCase())) return false;
        if (from && s.started_at.slice(0, 10) < from) return false;
        if (to && s.started_at.slice(0, 10) > to) return false;
        return true;
      }),
    [rows, tab, search, from, to],
  );

  function assignedLabel(s: SupportSession) {
    if (!s.assigned_to) return t("content.support.unassigned");
    return s.assigned_to === "me" ? t("content.support.tabMine") : s.assigned_to;
  }

  function pickUp(id: string) {
    setRows((rs) =>
      rs.map((s) =>
        s.id === id ? { ...s, status: "ASSIGNED", assigned_to: "me", opened_at: "now" } : s,
      ),
    );
    toast.success(t("content.support.pickedUp"));
  }

  const columns: Column<SupportSession>[] = [
    {
      id: "started",
      header: t("content.support.colStarted"),
      sortValue: (s) => s.started_at,
      cell: (s) => <span className="text-xs text-muted-foreground">{s.started_at}</span>,
    },
    {
      id: "customer",
      header: t("content.support.colCustomer"),
      sortValue: (s) => s.customer,
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-xs">
              {s.customer
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{s.customer}</span>
        </div>
      ),
    },
    {
      id: "last",
      header: t("content.support.colLast"),
      cell: (s) => <p className="max-w-xs truncate text-sm text-muted-foreground">{s.last}</p>,
    },
    {
      id: "status",
      header: t("content.support.colStatus"),
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      id: "assigned",
      header: t("content.support.colAssigned"),
      cell: (s) => (
        <span className="text-sm text-muted-foreground">
          {s.assigned_to ? (
            assignedLabel(s)
          ) : (
            <span className="italic">{t("content.support.unassigned")}</span>
          )}
        </span>
      ),
    },
    {
      id: "waiting",
      header: t("content.support.colWaiting"),
      cell: (s) => <span className="text-xs text-muted-foreground">{s.waiting}</span>,
    },
    {
      id: "rating",
      header: t("content.support.colRating"),
      align: "center",
      cell: (s) =>
        s.rating != null ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {s.rating}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  function rowActions(s: SupportSession) {
    const isUnassigned = s.status === "OPEN" && !s.assigned_to;
    return (
      <div className="flex items-center justify-end gap-1.5">
        {isUnassigned && (
          <Can perm="chat.support_pickup">
            <Button
              size="sm"
              className="h-7 gap-1 bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => pickUp(s.id)}
            >
              <UserCheck className="h-3.5 w-3.5" /> {t("content.support.pickUp")}
            </Button>
          </Can>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => navigate({ to: "/support/$sessionId", params: { sessionId: s.id } })}
        >
          {t("content.support.open")}
        </Button>
      </div>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader
          title={t("content.support.title")}
          description={t("content.support.subtitle")}
        />
        <div className="p-6 pt-0">
          <ForbiddenState perms={["chat.support_inbox_view"]} />
        </div>
      </>
    );
  }

  const open = rows.filter((s) => s.status !== "CLOSED").length;
  const unassigned = rows.filter((s) => s.status === "OPEN" && !s.assigned_to).length;
  const awaiting = rows.filter((s) => s.status === "AWAITING_FEEDBACK").length;
  const closed = rows.filter((s) => s.status === "CLOSED").length;

  return (
    <>
      <PageHeader title={t("content.support.title")} description={t("content.support.subtitle")} />
      <div className="p-6 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("content.support.kpiOpen")}
            value={open}
            icon={<LifeBuoy className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("content.support.kpiUnassigned")}
            value={unassigned}
            delta={t("content.support.tabUnassigned")}
            trend="down"
            icon={<Clock className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.support.kpiAwaiting")}
            value={awaiting}
            icon={<Hourglass className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.support.kpiClosed")}
            value={closed}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="mb-4 bg-muted/50">
              <TabsTrigger value="unassigned">{t("content.support.tabUnassigned")}</TabsTrigger>
              <TabsTrigger value="mine">{t("content.support.tabMine")}</TabsTrigger>
              {role === "admin" && (
                <TabsTrigger value="all_open">{t("content.support.tabAllOpen")}</TabsTrigger>
              )}
              <TabsTrigger value="closed">{t("content.support.tabClosed")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("content.support.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("content.support.countLabel")}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  dir="ltr"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-[150px]"
                  aria-label={t("content.from")}
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="date"
                  dir="ltr"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-[150px]"
                  aria-label={t("content.to")}
                />
              </div>
            }
          />

          <PageStates
            state={state}
            empty={
              <EmptyState
                title={t("content.support.emptyTitle")}
                description={t("content.support.emptyDesc")}
                icon={<LifeBuoy className="h-6 w-6" />}
              />
            }
          >
            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(s) => s.id}
              rowActions={rowActions}
              onRowClick={(s) =>
                navigate({ to: "/support/$sessionId", params: { sessionId: s.id } })
              }
              emptyState={
                <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                  {t("content.support.emptyTitle")}
                </div>
              }
            />
          </PageStates>
        </div>
      </div>
    </>
  );
}
