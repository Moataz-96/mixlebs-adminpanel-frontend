import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Can } from "@/components/shared/Can";
import { PageStates } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import { downloadBase64 } from "@/lib/download";
import { getInvoice, downloadInvoice } from "@/lib/api/invoices.functions";

function num(s: string | number | null | undefined): number {
  const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export const Route = createFileRoute("/_panel/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — Mixlebs Admin" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const pageState = usePageState();

  const invoiceQuery = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice({ data: { id } }),
    retry: false,
  });
  const api = invoiceQuery.data;
  const effectiveState =
    pageState !== "populated"
      ? pageState
      : invoiceQuery.isLoading
        ? "loading"
        : invoiceQuery.isError
          ? "notfound"
          : "populated";

  const recipient = api?.recipients?.[0];
  const inv = {
    id,
    status: api?.status ?? "",
    issued: api?.invoice_date ? api.invoice_date.slice(0, 10) : "",
    order: api?.related_order_id ?? api?.related_return_id ?? "",
  };
  const d = {
    type: (api?.invoice_type as "ORDER" | "RETURN") ?? "ORDER",
    recipient: {
      name: recipient?.recipient_name ?? recipient?.recipient_username ?? "—",
      email: recipient?.recipient_username ?? "—",
      city: [recipient?.city, recipient?.area].filter(Boolean).join(", "),
      phone: recipient?.phone_number ?? "—",
    },
    lines: (api?.items ?? []).map((it) => ({
      name: it.model_number ?? "—",
      model: it.model_number ?? String(it.id),
      qty: it.quantity,
      price: num(it.price),
      discount: num(it.discount),
    })),
    coupon: api?.coupon
      ? {
          code: api.coupon.code ?? "",
          value:
            api.coupon.discount_type === "PERCENTAGE"
              ? `${num(api.coupon.discount_value)}%`
              : `$${num(api.coupon.discount_value).toFixed(2)}`,
          cappedAt: api.coupon.capped_at ? `$${num(api.coupon.capped_at).toFixed(2)}` : "—",
        }
      : undefined,
    tax: num(api?.tax),
    fees: num(api?.fees),
    paymentType: recipient?.payment_type ?? "—",
    transferStatus: recipient?.transfer_status ?? "PENDING",
    serial: recipient?.serial_number ?? "—",
  };

  function onDownload() {
    void downloadInvoice({ data: { id } })
      .then((pdf) =>
        downloadBase64({ base64: pdf.base64, filename: pdf.filename, contentType: pdf.contentType }),
      )
      .catch((err) => toast.error(parseServerError(err).message));
  }

  const subtotal = d.lines.reduce((a, l) => a + (l.price - l.discount) * l.qty, 0);
  const grandTotal = subtotal + d.tax + d.fees;
  const relatedLabel =
    d.type === "ORDER" ? t("sales.invoice.relatedOrder") : t("sales.invoice.relatedReturn");
  const typeLabel =
    d.type === "ORDER" ? t("sales.invoices.typeOrder") : t("sales.invoices.typeReturn");

  return (
    <div className="p-6">
      <PageHeader
        title={t("sales.invoice.title", { id: inv.id.toUpperCase() })}
        description={t("sales.invoice.subtitle", { type: typeLabel, related: inv.order })}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/invoices">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("sales.invoice.allInvoices")}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => toast.success(t("sales.invoice.emailToast"))}>
              <Mail className="me-1.5 h-4 w-4" /> {t("sales.invoice.emailToCustomer")}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="me-1.5 h-4 w-4" /> {t("sales.invoice.print")}
            </Button>
            <Can perm="invoices.download">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={onDownload}
              >
                <Download className="me-1.5 h-4 w-4" /> {t("sales.invoice.downloadPdf")}
              </Button>
            </Can>
          </>
        }
      />

      <PageStates state={effectiveState}>
        <Card className="border-0 bg-card p-8 shadow-soft">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <p className="font-display text-3xl font-bold tracking-tight">Mixlebs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Beirut, Lebanon · billing@mixlebs.com
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("sales.invoice.invoiceLabel")}
              </p>
              <p className="font-mono text-lg font-bold">{inv.id.toUpperCase()}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="font-mono text-xs uppercase">{typeLabel}</span>
                <StatusBadge status={inv.status} />
              </div>
              <p className="mt-2 text-sm">
                {t("sales.invoice.issued")}: <span className="font-medium">{inv.issued}</span>
              </p>
            </div>
          </div>

          {/* Recipient (InvoiceUser) + related */}
          <div className="grid gap-6 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("sales.invoice.issuedTo")}
              </p>
              <p className="mt-1 font-semibold">{d.recipient.name}</p>
              <p className="text-sm text-muted-foreground">{d.recipient.email}</p>
              <p className="text-sm text-muted-foreground">
                {d.recipient.city} · {d.recipient.phone}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {relatedLabel}
              </p>
              <Link to="/orders" className="mt-1 block font-mono text-primary hover:underline">
                {inv.order}
              </Link>
            </div>
          </div>

          {/* Line items (InvoiceItem) */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>{t("sales.invoice.description")}</TableHead>
                <TableHead className="text-end">{t("sales.invoice.qty")}</TableHead>
                <TableHead className="text-end">{t("sales.invoice.unit")}</TableHead>
                <TableHead className="text-end">{t("sales.order.itemsDiscount")}</TableHead>
                <TableHead className="text-end">{t("sales.invoice.lineTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <span className="font-medium">{l.name}</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">{l.model}</span>
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">{l.qty}</TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    ${l.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums text-muted-foreground">
                    {l.discount ? `-$${l.discount.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    ${((l.price - l.discount) * l.qty).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Coupon block (InvoiceCoupon) */}
          {d.coupon && (
            <div className="mt-4 inline-flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl border bg-card px-4 py-3 text-sm shadow-soft">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("sales.invoice.couponBlock")}
              </span>
              <span>
                <span className="text-muted-foreground">{t("sales.invoice.couponCode")}: </span>
                <span className="font-mono font-semibold">{d.coupon.code}</span>
              </span>
              <span>
                <span className="text-muted-foreground">{t("sales.invoice.couponValue")}: </span>
                <span className="font-mono">{d.coupon.value}</span>
              </span>
              <span>
                <span className="text-muted-foreground">{t("sales.invoice.couponCapped")}: </span>
                <span className="font-mono">{d.coupon.cappedAt}</span>
              </span>
            </div>
          )}

          {/* Totals */}
          <div className="mt-6 ms-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("sales.invoice.subtotal")}</span>
              <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("sales.invoice.tax")}</span>
              <span className="font-mono tabular-nums">${d.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("sales.invoice.fees")}</span>
              <span className="font-mono tabular-nums">${d.fees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-display text-lg font-bold">
              <span>{t("sales.invoice.grandTotal")}</span>
              <span className="font-mono tabular-nums">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="mt-8 border-t pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("sales.invoice.payment")}
            </p>
            <dl className="mt-2 grid gap-y-2 text-sm md:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("sales.invoice.paymentType")}</dt>
                <dd className="font-mono">{d.paymentType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("sales.invoice.transferStatus")}</dt>
                <dd>
                  <StatusBadge status={d.transferStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("sales.invoice.serial")}</dt>
                <dd className="font-mono text-xs">{d.serial}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </PageStates>
    </div>
  );
}
