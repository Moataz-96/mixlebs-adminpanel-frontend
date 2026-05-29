import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { listConversations, toDmThread, type DmThread } from "@/lib/api/chat.functions";

export const Route = createFileRoute("/_panel/chat")({
  head: () => ({ meta: [{ title: "Direct messages — Mixlebs Admin" }] }),
  component: ChatPage,
});

function ChatPage() {
  const t = useT();
  const state = usePageState();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => listConversations(),
    retry: false,
  });
  const threads: DmThread[] = (conversationsQuery.data ?? []).map(toDmThread);

  const filtered = useMemo(
    () =>
      threads.filter(
        (c) => !search || `${c.name} ${c.last}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [threads, search],
  );
  const unread = threads.reduce((a, c) => a + c.unread, 0);

  const columns: Column<DmThread>[] = [
    {
      id: "counterpart",
      header: t("content.chat.colCounterpart"),
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">
                {c.initials}
              </AvatarFallback>
            </Avatar>
            {c.online && (
              <span className="absolute -end-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
            )}
          </div>
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    {
      id: "last",
      header: t("content.chat.colLast"),
      cell: (c) => <p className="max-w-md truncate text-sm text-muted-foreground">{c.last}</p>,
    },
    {
      id: "unread",
      header: t("content.chat.colUnread"),
      align: "center",
      sortValue: (c) => c.unread,
      cell: (c) =>
        c.unread > 0 ? (
          <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{c.unread}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "activity",
      header: t("content.chat.colActivity"),
      align: "end",
      sortValue: (c) => c.activity,
      cell: (c) => <span className="text-xs text-muted-foreground">{c.activity}</span>,
    },
  ];

  return (
    <>
      <PageHeader title={t("content.chat.title")} description={t("content.chat.subtitle")} />
      <div className="p-6 pt-0">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <KpiCard
            label={t("content.chat.title")}
            value={threads.length}
            icon={<MessageSquare className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("content.chat.colUnread")}
            value={unread}
            trend={unread > 0 ? "down" : "flat"}
          />
          <KpiCard
            label={t("content.chat.online")}
            value={threads.filter((c) => c.online).length}
          />
        </div>

        <DataToolbar
          search={search}
          onSearch={setSearch}
          placeholder={t("content.chat.searchPlaceholder")}
          count={filtered.length}
          countLabel={t("content.chat.countLabel")}
        />

        <PageStates
          state={state}
          empty={
            <EmptyState
              title={t("content.chat.emptyTitle")}
              description={t("content.chat.emptyDesc")}
              icon={<MessageSquare className="h-6 w-6" />}
            />
          }
        >
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(c) => c.user_id}
            onRowClick={(c) => navigate({ to: "/chat/$userId", params: { userId: c.user_id } })}
            emptyState={
              <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                {t("content.chat.emptyTitle")}
              </div>
            }
          />
        </PageStates>
      </div>
    </>
  );
}
