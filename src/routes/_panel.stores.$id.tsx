import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  LogIn,
  FileText,
  MapPin,
  Clock,
  CreditCard,
  Settings,
  ImageIcon,
  Plus,
  Download,
  Trash2,
  KeyRound,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageStates } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePageState } from "@/lib/page-state";
import { useT, type TFunction } from "@/lib/i18n";
import {
  STORES,
  STORE_ADDRESSES,
  WORKING_DAYS,
  STORE_PAYMENT_METHODS,
  VENDORS,
  STORE_TRANSITIONS,
  type StoreRow,
  type StoreStatus,
} from "@/lib/mock/people";

export const Route = createFileRoute("/_panel/stores/$id")({
  head: () => ({ meta: [{ title: "Store — Mixlebs Admin" }] }),
  component: StoreDetail,
});

const STORE_STATUS_CLASS: Record<StoreStatus, string> = {
  VERIFIED: "bg-success/15 text-success border-success/30",
  PENDING_VERIFICATION: "bg-warning/15 text-warning border-warning/30",
  PENDING_PAYMENT: "bg-info/15 text-info border-info/30",
  UNVERIFIED: "bg-muted text-muted-foreground border-border",
  BLOCKED: "bg-destructive/15 text-destructive border-destructive/30",
};

function statusBadge(status: StoreStatus, t: TFunction) {
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[10px] uppercase tracking-wider", STORE_STATUS_CLASS[status])}
    >
      {t(`people.storeStatus.${status}`)}
    </Badge>
  );
}

const LANGS = [
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

function StoreDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const perms = usePermissions();
  const state = usePageState();
  const store = STORES.find((s) => s.id === id) ?? STORES[0];
  const [status, setStatus] = useState<StoreStatus>(store.status);

  return (
    <div className="p-6">
      <PageHeader
        title={store.shop_name}
        description={`${t(`people.accountType.${store.account_type}`)} · ${store.vendor ?? "—"} · ${t("people.stores.statRank")} ${store.rank}`}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/stores">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("people.stores.backToStores")}
              </Link>
            </Button>
            {status === "PENDING_VERIFICATION" && (
              <Can perm="stores.review_identity">
                <Button
                  onClick={() => {
                    setStatus("VERIFIED");
                    toast.success(t("people.stores.tApproved"));
                  }}
                >
                  <CheckCircle2 className="me-1.5 h-4 w-4" /> {t("people.stores.approve")}
                </Button>
              </Can>
            )}
            <Can perm="stores.transition_status">
              {status === "BLOCKED" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("VERIFIED");
                    toast.success(t("people.stores.tUnsuspended"));
                  }}
                >
                  <Play className="me-1.5 h-4 w-4" /> {t("people.stores.actUnsuspend")}
                </Button>
              ) : (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline">
                      <Pause className="me-1.5 h-4 w-4" /> {t("people.stores.actSuspend")}
                    </Button>
                  }
                  title={t("people.stores.actSuspend")}
                  onConfirm={() => {
                    setStatus("BLOCKED");
                    toast.success(t("people.stores.tSuspended"));
                  }}
                  confirmLabel={t("people.stores.actSuspend")}
                />
              )}
            </Can>
            {perms.role === "admin" && (
              <Button variant="outline" onClick={() => toast(t("people.stores.tLoginAs"))}>
                <LogIn className="me-1.5 h-4 w-4" /> {t("people.stores.loginAs")}
              </Button>
            )}
          </>
        }
      />

      <PageStates state={state} missingPerms={["stores.view"]}>
        <Card className="border-0 bg-gradient-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-primary text-lg font-bold text-primary-foreground">
                {store.logo}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold">{store.shop_name}</h2>
                {statusBadge(status, t)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{store.about}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-end">
              <Stat label={t("people.stores.statRank")} value={store.rank} />
              <Stat label={t("people.stores.statProducts")} value={store.products} />
              <Stat label={t("people.stores.statOrders")} value={store.orders} />
            </div>
          </div>
        </Card>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="info">
              <ImageIcon className="me-1.5 h-3.5 w-3.5" /> {t("people.stores.tabInfo")}
            </TabsTrigger>
            <TabsTrigger value="identity">
              <FileText className="me-1.5 h-3.5 w-3.5" /> {t("people.stores.tabIdentity")}
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="me-1.5 h-3.5 w-3.5" /> {t("people.stores.tabAddresses")}
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="me-1.5 h-3.5 w-3.5" /> {t("people.stores.tabHours")}
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="me-1.5 h-3.5 w-3.5" /> {t("people.stores.tabPayments")}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="me-1.5 h-3.5 w-3.5" /> {t("people.stores.tabSettings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <InfoTab store={store} />
          </TabsContent>
          <TabsContent value="identity" className="mt-6">
            <IdentityTab />
          </TabsContent>
          <TabsContent value="addresses" className="mt-6">
            <AddressesTab />
          </TabsContent>
          <TabsContent value="hours" className="mt-6">
            <HoursTab />
          </TabsContent>
          <TabsContent value="payments" className="mt-6">
            <PaymentsTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsTab store={store} status={status} setStatus={setStatus} />
          </TabsContent>
        </Tabs>
      </PageStates>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Fld({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ── Tab 1 — Info ─────────────────────────────────────────────────────────────
function InfoTab({ store }: { store: StoreRow }) {
  const t = useT();
  const perms = usePermissions();
  const canEdit = perms.has("stores.update");
  const adminOrStaff = perms.role !== "store";

  return (
    <div className="space-y-4">
      {LANGS.map((lang) => (
        <Card key={lang.code} className="border-0 bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{lang.label}</h3>
            <Badge variant="outline">{lang.code.toUpperCase()}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Fld label={t("people.stores.fldName")}>
              <Input
                dir={lang.dir}
                disabled={!canEdit}
                defaultValue={lang.code === "en" ? store.shop_name : ""}
              />
            </Fld>
            <Fld label={t("people.stores.fldFeatures")}>
              <Input dir={lang.dir} disabled={!canEdit} />
            </Fld>
            <Fld label={t("people.stores.fldAbout")} className="md:col-span-2">
              <Textarea
                rows={3}
                dir={lang.dir}
                disabled={!canEdit}
                defaultValue={lang.code === "en" ? store.about : ""}
              />
            </Fld>
            <Fld label={t("people.stores.fldTargetAudience")}>
              <Input dir={lang.dir} disabled={!canEdit} />
            </Fld>
            <Fld label={t("people.stores.fldSellingPromotions")}>
              <Input dir={lang.dir} disabled={!canEdit} />
            </Fld>
          </div>
        </Card>
      ))}

      <Card className="border-0 bg-card p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          {adminOrStaff && (
            <Fld label={t("people.stores.fldVendor")}>
              <Select defaultValue={store.vendor ?? undefined} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue placeholder={t("people.stores.fVendorAll")} />
                </SelectTrigger>
                <SelectContent>
                  {VENDORS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Fld>
          )}
          <Fld label={t("people.stores.fldAvatarAsset")}>
            <Input dir="ltr" className="font-mono" disabled={!canEdit} placeholder="asset_…" />
          </Fld>
          {adminOrStaff && (
            <Fld label={t("people.stores.fldRank")}>
              <Input
                dir="ltr"
                type="number"
                className="font-mono"
                disabled={!canEdit}
                defaultValue={store.rank}
              />
            </Fld>
          )}
          {adminOrStaff && (
            <Fld label={t("people.stores.fldAccountType")}>
              <Select defaultValue={store.account_type} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">{t("people.accountType.INDIVIDUAL")}</SelectItem>
                  <SelectItem value="COMPANY">{t("people.accountType.COMPANY")}</SelectItem>
                </SelectContent>
              </Select>
            </Fld>
          )}
        </div>
        <div className="mt-6 grid gap-3 border-t pt-4 md:grid-cols-2">
          <Flag
            label={t("people.stores.flagOrderOnline")}
            desc={t("people.stores.flagOrderOnlineDesc")}
            defaultChecked={store.order_online}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagReturns")}
            desc={t("people.stores.flagReturnsDesc")}
            defaultChecked={store.returns}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagChat")}
            desc={t("people.stores.flagChatDesc")}
            defaultChecked={store.chat}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagAssetSharing")}
            desc={t("people.stores.flagAssetSharingDesc")}
            defaultChecked={store.asset_sharing}
            disabled={!canEdit}
          />
        </div>
        <Can perm="stores.update">
          <div className="mt-6 flex justify-end border-t pt-4">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => toast.success(t("people.stores.tSaved"))}
            >
              {t("people.stores.saveInfo")}
            </Button>
          </div>
        </Can>
      </Card>
    </div>
  );
}

function Flag({
  label,
  desc,
  defaultChecked,
  disabled,
}: {
  label: string;
  desc: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} disabled={disabled} />
    </div>
  );
}

// ── Tab 2 — Identity ─────────────────────────────────────────────────────────
function IdentityTab() {
  const t = useT();
  return (
    <Card className="border-0 bg-card p-6 shadow-soft">
      <h3 className="mb-4 font-display text-lg font-semibold">{t("people.stores.idTitle")}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Fld label={t("people.stores.idIdentity")}>
          <Input defaultValue="LB-2024-88421" disabled className="font-mono" />
        </Fld>
        <Fld label={t("people.stores.idBusinessName")}>
          <Input defaultValue="Beirut Pantry SAL" disabled />
        </Fld>
        <Fld label={t("people.stores.idFirstName")}>
          <Input defaultValue="Karim" disabled />
        </Fld>
        <Fld label={t("people.stores.idMiddleName")}>
          <Input defaultValue="—" disabled />
        </Fld>
        <Fld label={t("people.stores.idLastName")}>
          <Input defaultValue="Atlas" disabled />
        </Fld>
        <Fld label={t("people.stores.idLicense")}>
          <Input defaultValue="CR-99812" disabled className="font-mono" />
        </Fld>
        <Fld label={t("people.stores.idResidentialAddress")} className="md:col-span-2">
          <Textarea rows={2} defaultValue="Achrafieh, Beirut, Lebanon" disabled />
        </Fld>
        <Fld label={t("people.stores.idCountryOfIssue")}>
          <Input defaultValue="LB" disabled className="font-mono" />
        </Fld>
        <Fld label={t("people.stores.idExpiration")}>
          <Input defaultValue="2027-12-31" disabled />
        </Fld>
        <Fld label={t("people.stores.idDob")}>
          <Input defaultValue="1988-04-12" disabled />
        </Fld>
        <Fld label={t("people.stores.idAccountType")}>
          <Input defaultValue={t("people.accountType.COMPANY")} disabled />
        </Fld>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("people.stores.idDocuments")}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            t("people.stores.docFront"),
            t("people.stores.docBack"),
            t("people.stores.docSupporting"),
          ].map((d) => (
            <Dialog key={d}>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs font-medium">{d}</p>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="mt-1 h-7">
                    {t("people.stores.preview")}
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{d}</DialogTitle>
                </DialogHeader>
                <div className="grid h-80 place-items-center rounded-xl border bg-muted/30 text-muted-foreground">
                  <FileText className="h-16 w-16" />
                </div>
                <DialogFooter>
                  <Button variant="outline">
                    <Download className="me-1.5 h-4 w-4" /> {t("people.stores.download")}
                  </Button>
                  <DialogClose asChild>
                    <Button variant="ghost">{t("common.close")}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>

      <Can perm="stores.review_identity">
        <div className="mt-6 border-t pt-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("people.stores.reviewBar")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => toast.success(t("people.stores.tApproved"))}>
              <CheckCircle2 className="me-1.5 h-4 w-4" /> {t("people.stores.approveIdentity")}
            </Button>
            <RejectDialog />
            <Button
              variant="outline"
              onClick={() => toast.success(t("people.stores.tDocRequested"))}
            >
              {t("people.stores.requestDoc")}
            </Button>
          </div>
        </div>
      </Can>
    </Card>
  );
}

function RejectDialog() {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <Dialog onOpenChange={() => setReason("")}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <XCircle className="me-1.5 h-4 w-4" /> {t("people.stores.rejectIdentity")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("people.stores.rejectIdentity")}</DialogTitle>
        </DialogHeader>
        <Fld label={t("people.stores.rejectReason")}>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("people.stores.rejectReasonPlaceholder")}
          />
        </Fld>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("common.cancel")}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => toast.success(t("people.stores.tRejected"))}
            >
              {t("people.stores.reject")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 3 — Addresses ────────────────────────────────────────────────────────
const addressSchema = z.object({
  location_id: z.string().min(1, "Required"),
  recipient_name: z.string().min(1).max(255),
  phone_number: z.string().min(1).max(20),
  governorate: z.string().min(1).max(100),
  area: z.string().max(100).optional(),
  postcode: z.string().max(100).optional(),
  street: z.string().min(1).max(255),
  building: z.coerce.number().int().min(0),
  floor: z.coerce.number().int().min(0),
  apartment: z.coerce.number().int().min(0),
  latitude: z.string().min(1),
  longitude: z.string().min(1),
  note: z.string().optional(),
});
type AddressValues = z.infer<typeof addressSchema>;

function AddressesTab() {
  const t = useT();
  const canEdit = usePermissions().has("stores.update");
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <AddressDialog />
        </div>
      )}
      <Card className="overflow-hidden border-0 shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>{t("people.stores.addrRecipient")}</TableHead>
              <TableHead>{t("people.stores.addrGovernorate")}</TableHead>
              <TableHead>{t("people.stores.addrArea")}</TableHead>
              <TableHead>{t("people.stores.addrStreet")}</TableHead>
              <TableHead>{t("people.stores.addrDefault")}</TableHead>
              <TableHead>{t("people.stores.addrSource")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {STORE_ADDRESSES.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.recipient_name}</TableCell>
                <TableCell>{a.governorate}</TableCell>
                <TableCell>{a.area}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.street}</TableCell>
                <TableCell>
                  {a.is_default && <Badge>{t("people.stores.addrDefault")}</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.source}</TableCell>
                <TableCell>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost">
                        {t("common.edit")}
                      </Button>
                      {!a.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast.success(t("people.stores.tSaved"))}
                        >
                          {t("people.stores.addrSetDefault")}
                        </Button>
                      )}
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost" className="text-destructive">
                            {t("common.delete")}
                          </Button>
                        }
                        title={t("common.delete")}
                        destructive
                        onConfirm={() => toast.success(t("people.stores.tDeleted"))}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AddressDialog() {
  const t = useT();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      location_id: "",
      recipient_name: "",
      phone_number: "",
      governorate: "",
      area: "",
      postcode: "",
      street: "",
      building: 0,
      floor: 0,
      apartment: 0,
      latitude: "",
      longitude: "",
      note: "",
    },
  });
  function onSubmit() {
    toast.success(t("people.stores.tSaved"));
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="me-1.5 h-4 w-4" /> {t("people.stores.addrNew")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("people.stores.addrNew")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Fld label={t("people.stores.addrLocation")} className="md:col-span-2">
            <Select
              value={watch("location_id") || undefined}
              onValueChange={(v) => setValue("location_id", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="LB · Beirut · Achrafieh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loc_01">LB · Beirut · Achrafieh</SelectItem>
                <SelectItem value="loc_02">LB · Beirut · Hamra</SelectItem>
                <SelectItem value="loc_03">LB · Tripoli · El Mina</SelectItem>
              </SelectContent>
            </Select>
            {errors.location_id && (
              <p className="mt-1 text-xs text-destructive">{errors.location_id.message}</p>
            )}
          </Fld>
          <Fld label={t("people.stores.addrRecipient")}>
            <Input {...register("recipient_name")} />
          </Fld>
          <Fld label={t("people.stores.addrPhone")}>
            <Input dir="ltr" className="font-mono" {...register("phone_number")} />
          </Fld>
          <Fld label={t("people.stores.addrGovernorate")}>
            <Input {...register("governorate")} />
          </Fld>
          <Fld label={t("people.stores.addrArea")}>
            <Input {...register("area")} />
          </Fld>
          <Fld label={t("people.stores.addrStreet")} className="md:col-span-2">
            <Input {...register("street")} />
          </Fld>
          <Fld label={t("people.stores.addrPostcode")}>
            <Input dir="ltr" className="font-mono" {...register("postcode")} />
          </Fld>
          <Fld label={t("people.stores.addrBuilding")}>
            <Input
              dir="ltr"
              type="number"
              min={0}
              className="font-mono"
              {...register("building")}
            />
          </Fld>
          <Fld label={t("people.stores.addrFloor")}>
            <Input dir="ltr" type="number" min={0} className="font-mono" {...register("floor")} />
          </Fld>
          <Fld label={t("people.stores.addrApartment")}>
            <Input
              dir="ltr"
              type="number"
              min={0}
              className="font-mono"
              {...register("apartment")}
            />
          </Fld>
          <Fld label={t("people.stores.addrLatitude")}>
            <Input dir="ltr" className="font-mono" {...register("latitude")} />
          </Fld>
          <Fld label={t("people.stores.addrLongitude")}>
            <Input dir="ltr" className="font-mono" {...register("longitude")} />
          </Fld>
          <Fld label={t("people.stores.addrNote")} className="md:col-span-2">
            <Textarea rows={2} {...register("note")} />
          </Fld>
          <DialogFooter className="md:col-span-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="submit" disabled={isSubmitting}>
                {t("people.stores.addrSave")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 4 — Working days ─────────────────────────────────────────────────────
function HoursTab() {
  const t = useT();
  const canEdit = usePermissions().has("stores.update");
  return (
    <Card className="border-0 bg-card p-6 shadow-soft">
      <h3 className="mb-4 font-display text-lg font-semibold">{t("people.stores.hoursTitle")}</h3>
      <div className="hidden grid-cols-[120px_1fr_1fr_120px_auto] gap-4 border-b pb-2 text-xs uppercase tracking-wider text-muted-foreground md:grid">
        <span>{t("people.stores.hoursDay")}</span>
        <span>{t("people.stores.hoursStart")}</span>
        <span>{t("people.stores.hoursEnd")}</span>
        <span>{t("people.stores.hoursClosed")}</span>
        <span />
      </div>
      {DAYS.map((day) => {
        const wd = WORKING_DAYS.find((w) => w.day === day)!;
        return (
          <div
            key={day}
            className="grid grid-cols-1 items-center gap-3 border-b py-3 last:border-0 md:grid-cols-[120px_1fr_1fr_120px_auto]"
          >
            <Label className="font-medium">{t(`people.stores.day${day}`)}</Label>
            <Input
              type="time"
              dir="ltr"
              defaultValue={wd.start_time}
              disabled={!canEdit || wd.is_closed}
            />
            <Input
              type="time"
              dir="ltr"
              defaultValue={wd.end_time}
              disabled={!canEdit || wd.is_closed}
            />
            <div className="flex items-center gap-2">
              <Switch defaultChecked={wd.is_closed} disabled={!canEdit} />
              <span className="text-xs text-muted-foreground">
                {t("people.stores.hoursClosed")}
              </span>
            </div>
            {canEdit && (
              <Button size="sm" variant="ghost" className="justify-self-start">
                <Plus className="me-1 h-3.5 w-3.5" /> {t("people.stores.hoursSecondSlot")}
              </Button>
            )}
          </div>
        );
      })}
      <Can perm="stores.update">
        <div className="mt-4 flex justify-end">
          <Button onClick={() => toast.success(t("people.stores.tSaved"))}>
            {t("people.stores.hoursSave")}
          </Button>
        </div>
      </Can>
    </Card>
  );
}

// ── Tab 5 — Payment methods ──────────────────────────────────────────────────
function PaymentsTab() {
  const t = useT();
  return (
    <Card className="border-0 bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">{t("people.stores.payTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("people.stores.payDesc")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/payment-methods">
            <CreditCard className="me-1.5 h-4 w-4" /> {t("common.view")}
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>{t("people.stores.payBrand")}</TableHead>
            <TableHead>{t("people.stores.payHolder")}</TableHead>
            <TableHead>{t("people.stores.payExpiry")}</TableHead>
            <TableHead>{t("people.stores.payDefault")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STORE_PAYMENT_METHODS.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.brand}</TableCell>
              <TableCell>{p.holder_name}</TableCell>
              <TableCell className="font-mono tabular-nums">
                {String(p.exp_month).padStart(2, "0")}/{p.exp_year}
              </TableCell>
              <TableCell>
                {p.is_default && <Badge>{t("people.stores.payDefault")}</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ── Tab 6 — Settings ─────────────────────────────────────────────────────────
function SettingsTab({
  store,
  status,
  setStatus,
}: {
  store: StoreRow;
  status: StoreStatus;
  setStatus: (s: StoreStatus) => void;
}) {
  const t = useT();
  const perms = usePermissions();
  const canTransition = perms.has("stores.transition_status");
  const [target, setTarget] = useState<StoreStatus | "">("");
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4">
      {canTransition && (
        <Card className="border-0 bg-card p-6 shadow-soft">
          <h3 className="mb-1 font-display text-lg font-semibold">
            {t("people.stores.setStatusTitle")}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("people.stores.setStatusDesc")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Fld label={t("people.stores.setCurrentStatus")}>{statusBadge(status, t)}</Fld>
            <Fld label={t("people.stores.setTransition")}>
              <Select
                value={target || undefined}
                onValueChange={(v) => setTarget(v as StoreStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("people.stores.setTransition")} />
                </SelectTrigger>
                <SelectContent>
                  {STORE_TRANSITIONS[status].map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`people.storeStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Fld>
            <Fld label={t("people.stores.setReason")} className="md:col-span-2">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("people.stores.setReasonPlaceholder")}
              />
            </Fld>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              disabled={!target || !reason.trim()}
              onClick={() => {
                if (target) {
                  setStatus(target);
                  setTarget("");
                  setReason("");
                  toast.success(t("people.stores.tStatusChanged"));
                }
              }}
            >
              {t("people.stores.setApply")}
            </Button>
          </div>
        </Card>
      )}

      <Card className="border-0 bg-card p-6 shadow-soft">
        <h3 className="mb-4 font-display text-lg font-semibold">{t("people.stores.setFlags")}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Flag
            label={t("people.stores.flagOrderOnline")}
            desc={t("people.stores.flagOrderOnlineDesc")}
            defaultChecked={store.order_online}
            disabled={!perms.has("stores.update")}
          />
          <Flag
            label={t("people.stores.flagReturns")}
            desc={t("people.stores.flagReturnsDesc")}
            defaultChecked={store.returns}
            disabled={!perms.has("stores.update")}
          />
          <Flag
            label={t("people.stores.flagChat")}
            desc={t("people.stores.flagChatDesc")}
            defaultChecked={store.chat}
            disabled={!perms.has("stores.update")}
          />
          <Flag
            label={t("people.stores.flagAssetSharing")}
            desc={t("people.stores.flagAssetSharingDesc")}
            defaultChecked={store.asset_sharing}
            disabled={!perms.has("stores.update")}
          />
        </div>
      </Card>

      {perms.role === "admin" && (
        <Card className="border-0 bg-card p-6 shadow-soft">
          <h3 className="mb-1 font-display text-lg font-semibold text-destructive">
            {t("people.stores.setDanger")}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("people.stores.setDangerDesc")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.success(t("people.stores.tSaved"))}>
              <ArrowRightLeft className="me-1.5 h-4 w-4" /> {t("people.stores.setMoveVendor")}
            </Button>
            <Button variant="outline" onClick={() => toast.success(t("people.stores.tReset"))}>
              <KeyRound className="me-1.5 h-4 w-4" /> {t("people.stores.setForceReset")}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="me-1.5 h-4 w-4" /> {t("people.stores.setDelete")}
                </Button>
              }
              title={t("people.stores.setDelete")}
              destructive
              typeToConfirm={store.shop_name}
              confirmLabel={t("common.delete")}
              onConfirm={() => toast.success(t("people.stores.tDeleted"))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
