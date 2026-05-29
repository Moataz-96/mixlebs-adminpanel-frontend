import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, Download, BellRing, MessageSquare, MoreHorizontal, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { SUBSCRIBERS, PEOPLE_CUSTOMERS, type SubscriberRow } from "@/lib/mock/people";

export const Route = createFileRoute("/_panel/subscribers")({
  head: () => ({ meta: [{ title: "Subscribers — Mixlebs Admin" }] }),
  component: SubscribersPage,
});

function SubscribersPage() {
  const t = useT();
  const navigate = useNavigate();
  const perms = usePermissions();
  const pageState = usePageState();
  const state = perms.has("subscribers.view") ? pageState : "forbidden";
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      SUBSCRIBERS.filter(
        (s) =>
          !search || `${s.name} ${s.email} ${s.phone}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const onNotif = SUBSCRIBERS.filter((s) => s.recieve_notifications).length;
  const onEmail = SUBSCRIBERS.filter((s) => s.recieve_emails).length;
  const onSms = SUBSCRIBERS.filter((s) => s.recieve_sms).length;

  function viewCustomer(s: SubscriberRow) {
    const c = PEOPLE_CUSTOMERS.find((x) => x.email === s.email);
    if (c) navigate({ to: "/customers/$id", params: { id: c.id } });
  }

  const columns: Column<SubscriberRow>[] = [
    {
      id: "customer",
      header: t("people.subscribers.colCustomer"),
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">
              {s.name
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.email}</p>
            <p className="font-mono text-xs text-muted-foreground" dir="ltr">
              {s.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "recieve_notifications",
      header: t("people.subscribers.colNotifications"),
      align: "center",
      cell: (s) => (
        <OptIn on={s.recieve_notifications} icon={<BellRing className="h-3.5 w-3.5" />} />
      ),
    },
    {
      id: "recieve_emails",
      header: t("people.subscribers.colEmails"),
      align: "center",
      cell: (s) => <OptIn on={s.recieve_emails} icon={<Mail className="h-3.5 w-3.5" />} />,
    },
    {
      id: "recieve_sms",
      header: t("people.subscribers.colSms"),
      align: "center",
      cell: (s) => <OptIn on={s.recieve_sms} icon={<MessageSquare className="h-3.5 w-3.5" />} />,
    },
    {
      id: "subscribed_at",
      header: t("people.subscribers.colSubscribed"),
      align: "end",
      sortValue: (s) => s.subscribed_at,
      cell: (s) => <span className="text-xs text-muted-foreground">{s.subscribed_at}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("people.subscribers.title")}
        description={t("people.subscribers.desc")}
        actions={
          <Button variant="outline" onClick={() => toast.success(t("common.export"))}>
            <Download className="me-1.5 h-4 w-4" /> {t("people.subscribers.export")}
          </Button>
        }
      />

      <PageStates
        state={state}
        skeleton={<TableSkeleton rows={5} cols={5} />}
        missingPerms={["subscribers.view"]}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("people.subscribers.kpiTotal")}
            value={SUBSCRIBERS.length}
            icon={<Mail className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("people.subscribers.kpiNotifications")}
            value={onNotif}
            icon={<BellRing className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.subscribers.kpiEmails")}
            value={onEmail}
            icon={<Mail className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.subscribers.kpiSms")}
            value={onSms}
            icon={<MessageSquare className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("people.subscribers.search")}
            count={rows.length}
            countLabel={t("people.subscribers.countLabel")}
          />
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(s) => s.id}
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
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => viewCustomer(s)}>
                    <Eye className="me-2 h-4 w-4" /> {t("people.subscribers.actView")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </div>
      </PageStates>
    </div>
  );
}

function OptIn({ on, icon }: { on: boolean; icon: React.ReactNode }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${on ? "text-success" : "text-muted-foreground/50"}`}
    >
      {icon}
      {on ? t("people.subscribers.on") : t("people.subscribers.off")}
    </span>
  );
}
