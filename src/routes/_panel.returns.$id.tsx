import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldOff,
  Image as ImageIcon,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Can } from "@/components/shared/Can";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RETURNS } from "@/lib/mock-data";
import { returnDetail } from "@/lib/mock/sales";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_panel/returns/$id")({
  head: () => ({ meta: [{ title: "Return — Mixlebs Admin" }] }),
  component: ReturnDetail,
});

function ReturnDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const pageState = usePageState();

  const found = RETURNS.find((x) => x.id === id);
  const effectiveState = pageState !== "populated" ? pageState : found ? "populated" : "notfound";
  const r = found ?? RETURNS[0];
  const d = returnDetail({ value: r.value, status: r.status });

  const isOpen = r.status === "PENDING" || r.status === "CHECKING";
  const canMarkReturned = r.status === "APPROVED";

  return (
    <div className="p-6">
      <PageHeader
        title={t("sales.return.title", { id: r.id.toUpperCase() })}
        description={t("sales.return.subtitle", { order: r.order, customer: r.customer })}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/returns">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("sales.return.allReturns")}
              </Link>
            </Button>
            <Can perm="returns.approve">
              <Button
                disabled={!isOpen}
                onClick={() => toast.success(t("sales.return.toastApproved"))}
              >
                <CheckCircle2 className="me-1.5 h-4 w-4" /> {t("sales.return.approve")}
              </Button>
            </Can>
            <Can perm="returns.reject">
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="text-destructive" disabled={!isOpen}>
                    <XCircle className="me-1.5 h-4 w-4" /> {t("sales.return.decline")}
                  </Button>
                }
                title={t("sales.return.confirmDeclineTitle")}
                description={t("sales.return.confirmDeclineDesc")}
                destructive
                confirmLabel={t("sales.return.decline")}
                onConfirm={() => toast.success(t("sales.return.toastDeclined"))}
              />
            </Can>
            <Can perm="returns.transition">
              <Button
                variant="outline"
                disabled={!canMarkReturned}
                onClick={() => toast.success(t("sales.return.toastReturned"))}
              >
                <Undo2 className="me-1.5 h-4 w-4" /> {t("sales.return.markReturned")}
              </Button>
            </Can>
            <Can perm="returns.transition">
              <Button
                variant="outline"
                onClick={() => toast.success(t("sales.return.toastDeliveryIssue"))}
              >
                <AlertTriangle className="me-1.5 h-4 w-4" /> {t("sales.return.deliveryIssue")}
              </Button>
            </Can>
            <Can perm="customers.block_returns">
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="text-destructive">
                    <ShieldOff className="me-1.5 h-4 w-4" /> {t("sales.return.blockFraud")}
                  </Button>
                }
                title={t("sales.return.confirmBlockTitle")}
                description={t("sales.return.confirmBlockDesc")}
                destructive
                confirmLabel={t("sales.return.blockFraud")}
                onConfirm={() => toast.success(t("sales.return.toastBlocked"))}
              />
            </Can>
          </>
        }
      />

      <PageStates state={effectiveState}>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-0 bg-card p-6 shadow-soft lg:col-span-2">
            <h3 className="mb-3 font-display text-lg font-semibold">{t("sales.return.item")}</h3>
            <div className="flex gap-4">
              <div className="grid h-24 w-24 place-items-center rounded-xl bg-muted font-mono text-xs">
                IMG
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <p className="font-semibold">{d.name}</p>
                <p className="text-muted-foreground">
                  {d.attributes} · {t("sales.return.qty")} {d.qty} · ${d.price.toFixed(2)}
                </p>
                <p className="font-mono text-muted-foreground">
                  {t("sales.return.model")} #{d.model}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>

            <div className="mt-6 border-t pt-6">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sales.return.reason")}
              </h4>
              <p className="text-sm font-medium">{r.reason}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d.reasonDescription}</p>
            </div>

            <div className="mt-6 border-t pt-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sales.return.attachments")}
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: d.attachments }).map((_, i) => (
                  <div
                    key={i}
                    className="grid aspect-square place-items-center rounded-lg border bg-muted/30 text-muted-foreground"
                  >
                    <ImageIcon className="h-6 w-6" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-lg font-semibold">
              {t("sales.return.tracking")}
            </h3>
            <ol className="space-y-3 text-sm">
              {d.tracking.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <div
                    className={`mt-1.5 h-2 w-2 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`}
                  />
                  <div>
                    <p className="font-medium">{e.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.at}
                      {e.courier ? ` · ${e.courier}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 space-y-2 border-t pt-4 text-sm">
              <Link to="/orders" className="block text-primary hover:underline">
                ↳ {t("sales.return.originalOrder", { order: r.order })}
              </Link>
              <Can perm="invoices.view">
                <Link to="/invoices" className="block text-primary hover:underline">
                  ↳ {t("sales.return.originalInvoice")}
                </Link>
              </Can>
              <Can perm="customers.view">
                <Link to="/customers" className="block text-primary hover:underline">
                  ↳ {t("sales.return.customerProfile")}
                </Link>
              </Can>
            </div>
          </Card>
        </div>
      </PageStates>
    </div>
  );
}
