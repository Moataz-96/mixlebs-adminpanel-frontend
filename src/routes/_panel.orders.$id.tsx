import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  MessageSquare,
  MapPin,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Can, usePermissions } from "@/components/shared/Can";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORDERS, COURIERS } from "@/lib/mock-data";
import { orderDetail } from "@/lib/mock/sales";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_panel/orders/$id")({
  head: () => ({ meta: [{ title: "Order — Mixlebs Admin" }] }),
  component: OrderDetail,
});

const FLOW = ["PENDING", "READY", "SHIPPED", "DELIVERED"] as const;

function OrderDetail() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const pageState = usePageState();
  const { has } = usePermissions();

  const order = ORDERS.find((o) => o.id === id);
  // Force not-found when the id is unknown (or previewed via ?state=notfound).
  const effectiveState = pageState !== "populated" ? pageState : order ? "populated" : "notfound";
  const o = order ?? ORDERS[0];
  const d = orderDetail({
    id: o.id,
    total: o.total,
    items: o.items,
    customer: o.customer,
    status: o.status,
    placed: o.placed,
  });

  const currentStep = FLOW.indexOf(o.status as (typeof FLOW)[number]);
  const canRefund =
    (d.transferStatus === "IN_WALLET" || d.transferStatus === "TRANSFERRED") &&
    o.status === "DELIVERED";

  const appendSchema = z.object({
    details: z.string().min(1, t("sales.order.appendDetailsRequired")),
    courier_id: z.string().optional(),
  });
  type AppendValues = z.infer<typeof appendSchema>;
  const form = useForm<AppendValues>({
    resolver: zodResolver(appendSchema),
    defaultValues: { details: "", courier_id: "" },
  });
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  function onAppend() {
    toast.success(t("sales.order.toastTrackingAppended"));
    reset();
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t("sales.order.title", { number: o.number })}
        description={t("sales.order.subtitle", {
          customer: o.customer,
          store: o.store,
          placed: o.placed,
        })}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/orders">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("sales.order.allOrders")}
              </Link>
            </Button>
            <Can perm="invoices.download">
              <Button
                variant="outline"
                onClick={() => toast.success(t("sales.order.printInvoice"))}
              >
                <Printer className="me-1.5 h-4 w-4" /> {t("sales.order.printInvoice")}
              </Button>
            </Can>
            <Button variant="outline" onClick={() => navigate({ to: "/chat" })}>
              <MessageSquare className="me-1.5 h-4 w-4" /> {t("sales.order.contactCustomer")}
            </Button>
          </>
        }
      />

      <PageStates state={effectiveState}>
        {/* Sticky status timeline + summary */}
        <Card className="sticky top-2 z-10 border-0 bg-gradient-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("sales.order.total")}
              </p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                ${o.total.toFixed(2)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={o.status} />
                <StatusBadge status={o.payment} />
                <StatusBadge status={d.transferStatus} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Can perm="orders.transition_status">
                <Button
                  size="sm"
                  disabled={o.status !== "PENDING"}
                  onClick={() => toast.success(t("sales.order.toastReady"))}
                >
                  <CheckCircle2 className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.markReady")}
                </Button>
              </Can>
              <Can perm="orders.transition_status">
                <Button
                  size="sm"
                  disabled={o.status !== "READY"}
                  onClick={() => toast.success(t("sales.order.toastShipped"))}
                >
                  <Truck className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.markShipped")}
                </Button>
              </Can>
              <Can perm="orders.transition_status">
                <Button
                  size="sm"
                  disabled={o.status !== "SHIPPED"}
                  onClick={() => toast.success(t("sales.order.toastDelivered"))}
                >
                  <CheckCircle2 className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.markDelivered")}
                </Button>
              </Can>
              <Can perm="orders.cancel">
                <ConfirmDialog
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={o.status !== "PENDING" && o.status !== "READY"}
                    >
                      <XCircle className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.cancel")}
                    </Button>
                  }
                  title={t("sales.order.confirmCancelTitle")}
                  description={t("sales.order.confirmCancelDesc")}
                  destructive
                  confirmLabel={t("sales.order.cancel")}
                  onConfirm={() => toast.success(t("sales.order.toastCancelled"))}
                />
              </Can>
              <Can perm="orders.decline">
                <ConfirmDialog
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={o.status !== "PENDING"}
                    >
                      <XCircle className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.decline")}
                    </Button>
                  }
                  title={t("sales.order.confirmDeclineTitle")}
                  description={t("sales.order.confirmDeclineDesc")}
                  destructive
                  confirmLabel={t("sales.order.decline")}
                  onConfirm={() => toast.success(t("sales.order.toastDeclined"))}
                />
              </Can>
              <Can perm="orders.report_delivery_issue">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={o.status !== "SHIPPED"}
                  onClick={() => toast.success(t("sales.order.toastDeliveryIssue"))}
                >
                  <AlertTriangle className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.deliveryIssue")}
                </Button>
              </Can>
              {canRefund && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <RotateCcw className="me-1.5 h-3.5 w-3.5" /> {t("sales.order.refund")}
                    </Button>
                  }
                  title={t("sales.order.confirmRefundTitle")}
                  description={t("sales.order.confirmRefundDesc")}
                  confirmLabel={t("sales.order.refund")}
                  onConfirm={() => toast.success(t("sales.order.toastRefunded"))}
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            {FLOW.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i <= currentStep ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${i <= currentStep ? "" : "text-muted-foreground"}`}
                >
                  {s.replace(/_/g, " ")}
                </span>
                {i < FLOW.length - 1 && (
                  <div className={`h-px flex-1 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </Card>

        <Tabs defaultValue="items" className="mt-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="items">{t("sales.order.tabItems")}</TabsTrigger>
            <TabsTrigger value="tracking">{t("sales.order.tabTracking")}</TabsTrigger>
            <TabsTrigger value="customer">{t("sales.order.tabCustomer")}</TabsTrigger>
            <TabsTrigger value="address">{t("sales.order.tabAddress")}</TabsTrigger>
            <TabsTrigger value="payment">{t("sales.order.tabPayment")}</TabsTrigger>
            <TabsTrigger value="courier">{t("sales.order.tabCourier")}</TabsTrigger>
            <TabsTrigger value="audit">{t("sales.order.tabAudit")}</TabsTrigger>
          </TabsList>

          {/* Items */}
          <TabsContent value="items" className="mt-6">
            <Card className="overflow-hidden border-0 shadow-soft">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t("sales.order.itemsItem")}</TableHead>
                    <TableHead>{t("sales.order.itemsAttributes")}</TableHead>
                    <TableHead className="text-end">{t("sales.order.itemsQty")}</TableHead>
                    <TableHead className="text-end">{t("sales.order.itemsPrice")}</TableHead>
                    <TableHead className="text-end">{t("sales.order.itemsDiscount")}</TableHead>
                    <TableHead className="text-end">{t("sales.order.itemsLineTotal")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted font-mono text-[10px]">
                            {l.model.slice(0, 3)}
                          </div>
                          <div>
                            <span className="font-medium">{l.name}</span>
                            <div className="font-mono text-xs text-muted-foreground">{l.model}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.attributes}
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums">{l.qty}</TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        ${l.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end font-mono tabular-nums text-muted-foreground">
                        {l.discount ? `-$${l.discount.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-end font-mono font-semibold tabular-nums">
                        ${((l.price - l.discount) * l.qty).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Can perm="returns.view">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={o.status !== "DELIVERED" || l.isReturned}
                            onClick={() => toast.success(t("sales.order.toastReturnInitiated"))}
                          >
                            {l.isReturned
                              ? t("sales.order.returned")
                              : t("sales.order.initiateReturn")}
                          </Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t bg-muted/20 p-4 text-end text-sm">
                <div className="ms-auto inline-grid grid-cols-2 gap-x-8 gap-y-1">
                  <span className="text-muted-foreground">{t("sales.order.subtotal")}</span>
                  <span className="font-mono tabular-nums">${d.subtotal.toFixed(2)}</span>
                  <span className="text-muted-foreground">{t("sales.order.tax")}</span>
                  <span className="font-mono tabular-nums">${d.tax.toFixed(2)}</span>
                  <span className="text-muted-foreground">{t("sales.order.delivery")}</span>
                  <span className="font-mono tabular-nums">${d.deliveryFee.toFixed(2)}</span>
                  <span className="font-display text-base font-bold">{t("sales.order.total")}</span>
                  <span className="font-mono text-base font-bold tabular-nums">
                    ${o.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tracking */}
          <TabsContent value="tracking" className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="border-0 bg-card p-6 shadow-soft lg:col-span-2">
              <h3 className="mb-4 font-display text-lg font-semibold">
                {t("sales.order.trackingEvents")}
              </h3>
              <ol className="space-y-4">
                {d.tracking.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`}
                      />
                      {i < d.tracking.length - 1 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium">{e.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.at}
                        {e.courier ? ` · ${e.courier}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
            <Can perm="orders.tracking_append">
              <Card className="border-0 bg-card p-6 shadow-soft">
                <h3 className="mb-3 font-display text-base font-semibold">
                  {t("sales.order.appendEvent")}
                </h3>
                <form onSubmit={handleSubmit(onAppend)} className="space-y-3" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="details">{t("sales.order.appendDetails")}</Label>
                    <Textarea
                      id="details"
                      rows={3}
                      placeholder={t("sales.order.appendDetails")}
                      aria-invalid={!!errors.details}
                      {...register("details")}
                    />
                    {errors.details && (
                      <p className="text-xs text-destructive">{errors.details.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("sales.order.appendCourierLabel")}</Label>
                    <Select onValueChange={(v) => setValue("courier_id", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t("sales.order.appendCourierLabel")} />
                      </SelectTrigger>
                      <SelectContent>
                        {COURIERS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {t("sales.order.append")}
                  </Button>
                </form>
              </Card>
            </Can>
          </TabsContent>

          {/* Customer */}
          <TabsContent value="customer" className="mt-6">
            <Card className="border-0 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback>
                    {o.customer
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-display text-lg font-semibold">{o.customer}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.customer.email} · {d.customer.phone}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{d.customer.id}</p>
                </div>
                {d.customer.returnBlocked && <StatusBadge status="BLOCKED" />}
                <Can perm="customers.view">
                  <Button variant="outline" className="ms-auto" asChild>
                    <Link to="/customers">{t("sales.order.viewCustomer")}</Link>
                  </Button>
                </Can>
              </div>
            </Card>
          </TabsContent>

          {/* Delivery address */}
          <TabsContent value="address" className="mt-6">
            <Card className="border-0 bg-card p-6 shadow-soft">
              <div className="flex gap-6">
                <div className="grid h-24 w-32 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
                  <MapPin className="h-8 w-8" />
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">{d.address.recipient}</span> · {d.address.phone}
                  </p>
                  <p>
                    {d.address.country} · {d.address.city} · {d.address.governorate}
                  </p>
                  <p>
                    {d.address.area} · {d.address.street} · {d.address.postcode}
                  </p>
                  <p>
                    Building {d.address.building} · Floor {d.address.floor} · Apt{" "}
                    {d.address.apartment}
                  </p>
                  <p className="text-muted-foreground">{d.address.note}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Payment */}
          <TabsContent value="payment" className="mt-6">
            <Card className="border-0 bg-card p-6 shadow-soft">
              <dl className="grid gap-y-3 text-sm md:grid-cols-2">
                <Row k={t("sales.order.paymentMethod")} v={d.paymentType} />
                <Row k={t("common.status")} v={<StatusBadge status={o.payment} />} />
                <Row
                  k={t("sales.order.serial")}
                  v={<span className="font-mono text-xs">{d.serial}</span>}
                />
                <Row k={t("sales.order.coupon")} v={d.coupon ?? "—"} />
                <Row
                  k={t("sales.order.transferStatus")}
                  v={<StatusBadge status={d.transferStatus} />}
                />
              </dl>
              <Can perm="invoices.view">
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/invoices">{t("sales.order.viewInvoice")}</Link>
                </Button>
              </Can>
            </Card>
          </TabsContent>

          {/* Tracking & Courier */}
          <TabsContent value="courier" className="mt-6">
            <Card className="border-0 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </div>
                <dl className="grid flex-1 gap-y-3 text-sm md:grid-cols-2">
                  <Row k={t("sales.order.courier")} v={d.courier} />
                  <Row k={t("sales.order.etaDays")} v={d.etaDays} />
                  <Row k={t("sales.order.baseFee")} v={`$${d.baseFee.toFixed(2)}`} />
                  <Row k={t("sales.order.deliveryFees")} v={`$${d.deliveryFee.toFixed(2)}`} />
                </dl>
              </div>
            </Card>
          </TabsContent>

          {/* Notes / Audit */}
          <TabsContent value="audit" className="mt-6">
            <Card className="border-0 bg-card p-6 shadow-soft">
              <h3 className="mb-3 font-display text-base font-semibold">
                {t("sales.order.auditTitle")}
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {d.audit.map((a, i) => (
                  <li key={i}>
                    {a.what} · <span className="font-medium text-foreground">{a.who}</span> · {a.at}
                  </li>
                ))}
              </ol>
            </Card>
          </TabsContent>
        </Tabs>
      </PageStates>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
