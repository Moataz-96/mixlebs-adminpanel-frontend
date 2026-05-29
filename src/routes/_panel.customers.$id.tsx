import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, ShoppingBag, Wallet, Ban, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageStates } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PEOPLE_CUSTOMERS, DEVICE_TOKENS, AUDIT_ENTRIES } from "@/lib/mock/people";
import { ORDERS } from "@/lib/mock-data";

export const Route = createFileRoute("/_panel/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — Mixlebs Admin" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const perms = usePermissions();
  const pageState = usePageState();
  const state = perms.has("customers.view") ? pageState : "forbidden";
  const c = PEOPLE_CUSTOMERS.find((x) => x.id === id) ?? PEOPLE_CUSTOMERS[0];
  const initials = c.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="p-6">
      <PageHeader
        title={c.name}
        description={`${t("people.customers.pJoined")} · ${c.date_joined}`}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/customers">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("people.customers.backToCustomers")}
              </Link>
            </Button>
            <Can perm="notifications.send">
              <Button
                variant="outline"
                onClick={() => toast.success(t("people.customers.tNotified"))}
              >
                <BellRing className="me-1.5 h-4 w-4" /> {t("people.customers.notify")}
              </Button>
            </Can>
            <Can perm="customers.block_returns">
              <Button
                variant="outline"
                className={c.is_return_blocked ? "" : "text-destructive"}
                onClick={() =>
                  toast.success(
                    t(
                      c.is_return_blocked
                        ? "people.customers.tUnblocked"
                        : "people.customers.tBlocked",
                    ),
                  )
                }
              >
                <Ban className="me-1.5 h-4 w-4" />{" "}
                {c.is_return_blocked ? t("people.customers.unblock") : t("people.customers.block")}
              </Button>
            </Can>
            {perms.role === "admin" && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="me-1.5 h-4 w-4" /> {t("people.customers.deleteAccount")}
                  </Button>
                }
                title={t("people.customers.deleteAccount")}
                destructive
                typeToConfirm={c.name}
                confirmLabel={t("common.delete")}
                onConfirm={() => toast.success(t("people.customers.tDeleted"))}
              />
            )}
          </>
        }
      />

      <PageStates state={state} missingPerms={["customers.view"]}>
        <Card className="border-0 bg-gradient-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-primary text-lg font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold">{c.name}</h2>
                {c.is_return_blocked && (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    {t("people.customers.statusBlocked")}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {c.email}
                </span>
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Phone className="h-3.5 w-3.5" />
                  {c.phone}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <KpiCard
            label={t("people.customers.colOrders")}
            value={c.orders}
            icon={<ShoppingBag className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("people.customers.kpiLtv")}
            value={`$${c.total_spent.toFixed(2)}`}
            icon={<Wallet className="h-5 w-5" />}
          />
          <KpiCard
            label={t("people.customers.kpiAvgBasket")}
            value={`$${(c.total_spent / Math.max(c.orders, 1)).toFixed(2)}`}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
        </div>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profile">{t("people.customers.tabProfile")}</TabsTrigger>
            <TabsTrigger value="orders">{t("people.customers.tabOrders")}</TabsTrigger>
            <TabsTrigger value="returns">{t("people.customers.tabReturns")}</TabsTrigger>
            <TabsTrigger value="reviews">{t("people.customers.tabReviews")}</TabsTrigger>
            {perms.has("wallet.view_any") && (
              <TabsTrigger value="wallet">{t("people.customers.tabWallet")}</TabsTrigger>
            )}
            <TabsTrigger value="devices">{t("people.customers.tabDevices")}</TabsTrigger>
            <TabsTrigger value="audit">{t("people.customers.tabAudit")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card className="grid gap-4 border-0 bg-card p-6 shadow-soft md:grid-cols-2">
              <Read label={t("people.customers.pName")} value={c.name} />
              <Read label={t("people.customers.pId")} value={c.id} mono />
              <Read label={t("people.customers.pEmail")} value={c.email} />
              <Read label={t("people.customers.pPhone")} value={c.phone} mono />
              <Read
                label={t("people.customers.pGender")}
                value={t(`people.customers.gender${c.gender}`)}
              />
              <Read label={t("people.customers.pDob")} value={c.dob} />
              <Read label={t("people.customers.pJoined")} value={c.date_joined} />
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card className="overflow-hidden border-0 shadow-soft">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t("people.customers.ordersTabCol")}</TableHead>
                    <TableHead>{t("people.customers.ordersTabStore")}</TableHead>
                    <TableHead className="text-end">
                      {t("people.customers.ordersTabTotal")}
                    </TableHead>
                    <TableHead>{t("people.customers.ordersTabStatus")}</TableHead>
                    <TableHead>{t("people.customers.ordersTabPlaced")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORDERS.slice(0, 5).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.number}</TableCell>
                      <TableCell>{o.store}</TableCell>
                      <TableCell className="text-end font-mono tabular-nums">
                        ${o.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.placed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <Card className="border-0 bg-card p-6 text-sm text-muted-foreground shadow-soft">
              {t("people.customers.emptyReturns")}
            </Card>
          </TabsContent>
          <TabsContent value="reviews" className="mt-4">
            <Card className="border-0 bg-card p-6 text-sm text-muted-foreground shadow-soft">
              {t("people.customers.emptyReviews")}
            </Card>
          </TabsContent>

          {perms.has("wallet.view_any") && (
            <TabsContent value="wallet" className="mt-4">
              <Card className="border-0 bg-card p-6 shadow-soft">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("people.customers.walletBalance")}
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                  ${c.wallet_balance.toFixed(2)}
                </p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/wallet">{t("people.customers.tabWallet")}</Link>
                </Button>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="devices" className="mt-4">
            <Card className="overflow-hidden border-0 shadow-soft">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t("people.users.devDevice")}</TableHead>
                    <TableHead>{t("people.users.devToken")}</TableHead>
                    <TableHead>{t("people.users.devValid")}</TableHead>
                    <TableHead>{t("people.users.devCreated")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEVICE_TOKENS.slice(0, 2).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.device_type}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.token.slice(0, 4)}…{d.token.slice(-4)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            d.is_valid
                              ? "border-success/40 text-success"
                              : "border-muted text-muted-foreground"
                          }
                        >
                          {t(
                            d.is_valid
                              ? "people.users.devValidBadge"
                              : "people.users.devInvalidBadge",
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.created_at}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card className="overflow-hidden border-0 shadow-soft">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t("people.users.auTimestamp")}</TableHead>
                    <TableHead>{t("people.users.auMethod")}</TableHead>
                    <TableHead>{t("people.users.auUrl")}</TableHead>
                    <TableHead>{t("people.users.auStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AUDIT_ENTRIES.slice(0, 3).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{e.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {e.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{e.url}</code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-xs ${e.status < 400 ? "text-success" : "text-destructive"}`}
                        >
                          {e.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </PageStates>
    </div>
  );
}

function Read({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input value={value} disabled className={mono ? "font-mono" : undefined} />
    </div>
  );
}
