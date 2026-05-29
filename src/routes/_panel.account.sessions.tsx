import { createFileRoute } from "@tanstack/react-router";
import { LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { ACCOUNT_SESSIONS, type SessionRow } from "@/lib/mock/account";

export const Route = createFileRoute("/_panel/account/sessions")({
  head: () => ({ meta: [{ title: "Sessions — Mixlebs Admin" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const t = useT();
  const state = usePageState();

  const columns: Column<SessionRow>[] = [
    {
      id: "created_at",
      header: t("account.colCreated"),
      sortValue: (r) => r.created_at,
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground">
          {r.created_at}
          {r.current && (
            <span className="ms-2 rounded bg-success/15 px-1.5 py-0.5 text-[10px] uppercase text-success">
              {t("account.currentSession")}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "ip",
      header: t("account.colIp"),
      sortValue: (r) => r.ip,
      cell: (r) => <span className="font-mono text-xs">{r.ip}</span>,
    },
    {
      id: "user_agent",
      header: t("account.colUserAgent"),
      sortValue: (r) => r.user_agent,
      cell: (r) => <span className="text-sm">{r.user_agent}</span>,
    },
    {
      id: "last_seen",
      header: t("account.colLastSeen"),
      sortValue: (r) => r.last_seen,
      align: "end",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.last_seen}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("account.sesTitle")}
        description={t("account.sesSubtitle")}
        actions={
          <ConfirmDialog
            title={t("account.signOutEverywhereTitle")}
            description={t("account.signOutEverywhereDesc")}
            confirmLabel={t("account.signOutEverywhere")}
            destructive
            onConfirm={() => toast.success(t("account.signedOutEverywhere"))}
            trigger={
              <Button variant="outline" className="text-destructive">
                <LogOut className="me-1.5 h-4 w-4" /> {t("account.signOutEverywhere")}
              </Button>
            }
          />
        }
      />

      <PageStates state={state} skeleton={<TableSkeleton rows={3} cols={4} />}>
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-warning" />
          <div>
            <p className="text-sm font-semibold">{t("account.securityNoticeTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("account.securityNoticeDesc")}</p>
          </div>
        </div>

        <DataTable
          data={ACCOUNT_SESSIONS}
          columns={columns}
          getRowId={(r) => r.id}
          paginate={false}
          rowActions={(r) =>
            r.current ? null : (
              <ConfirmDialog
                title={t("account.revokeSessionTitle")}
                description={t("account.revokeSessionDesc")}
                confirmLabel={t("account.revoke")}
                destructive
                onConfirm={() => toast.success(t("account.sessionRevoked"))}
                trigger={
                  <Button size="sm" variant="ghost" className="text-destructive">
                    {t("account.revoke")}
                  </Button>
                }
              />
            )
          }
        />
      </PageStates>
    </div>
  );
}
