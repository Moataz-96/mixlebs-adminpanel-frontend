import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { usePageState, type PageState } from "@/lib/page-state";
import { useT, type TFunction } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import {
  getStore,
  getStoreIdentity,
  updateStore,
  transitionStoreStatus,
  reviewIdentity,
  type AdminStoreDetail,
  type StoreIdentityFull,
} from "@/lib/api/stores.admin.functions";
import {
  listAddresses,
  createAddress,
  deleteAddress,
  updateAddress,
  type AdminAddress,
} from "@/lib/api/addresses.functions";
import { listPaymentMethods } from "@/lib/api/payment_methods.functions";
import { listCourierLocations } from "@/lib/api/couriers.functions";

// Frozen-UI local types (were imported from mock/people).
type StoreStatus =
  | "UNVERIFIED"
  | "PENDING_VERIFICATION"
  | "PENDING_PAYMENT"
  | "VERIFIED"
  | "BLOCKED";

// Header summary shape the JSX renders. Mapped from the BE StoreDetail; the
// vendor/products/orders/about fields are not on the BE schema (ENTRY 025) and
// render as neutral placeholders.
interface StoreRow {
  id: string;
  shop_name: string;
  logo: string;
  status: StoreStatus;
  account_type: "INDIVIDUAL" | "COMPANY";
  rank: number;
  vendor: string | null;
  order_online: boolean;
  returns: boolean;
  chat: boolean;
  asset_sharing: boolean;
  products: number;
  orders: number;
  about: string;
}

// Vendor picker has no BE backing (ENTRY 025).
const VENDORS: string[] = [];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function mapDetail(d: AdminStoreDetail): StoreRow {
  return {
    id: d.id,
    shop_name: d.shop_name,
    logo: initials(d.shop_name) || "ST",
    status: d.status,
    account_type: d.account_type,
    rank: d.rank,
    // ENTRY 025 — derived columns now supplied by the BE.
    vendor: d.vendor_name,
    order_online: d.order_online,
    returns: d.returns,
    chat: d.chat,
    asset_sharing: d.asset_sharing,
    products: d.products_count ?? 0,
    orders: d.orders_count ?? 0,
    about: d.info?.en?.about ?? d.info?.ar?.about ?? "",
  };
}

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
  const previewState = usePageState();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["admin-store", id],
    queryFn: () => getStore({ data: { id } }),
    staleTime: 30 * 1000,
  });

  const detail = detailQuery.data;
  const store: StoreRow | null = useMemo(
    () => (detail ? mapDetail(detail) : null),
    [detail],
  );
  const status = store?.status ?? "PENDING_VERIFICATION";

  const state: PageState =
    previewState !== "populated"
      ? previewState
      : detailQuery.isLoading
        ? "loading"
        : detailQuery.isError
          ? "error"
          : "populated";

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin-store", id] });

  const approveMutation = useMutation({
    mutationFn: () => reviewIdentity({ data: { id, decision: "approve" } }),
    onSuccess: () => {
      invalidate();
      toast.success(t("people.stores.tApproved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const transitionMutation = useMutation({
    mutationFn: (vars: { status: StoreStatus; reason?: string }) =>
      transitionStoreStatus({ data: { id, status: vars.status, reason: vars.reason } }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(parseServerError(err).message),
  });

  return (
    <div className="p-6">
      <PageHeader
        title={store?.shop_name ?? ""}
        description={`${store ? t(`people.accountType.${store.account_type}`) : ""} · ${store?.vendor ?? "—"} · ${t("people.stores.statRank")} ${store?.rank ?? 0}`}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link to="/stores">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("people.stores.backToStores")}
              </Link>
            </Button>
            {status === "PENDING_VERIFICATION" && (
              <Can perm="stores.review_identity">
                <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                  <CheckCircle2 className="me-1.5 h-4 w-4" /> {t("people.stores.approve")}
                </Button>
              </Can>
            )}
            <Can perm="stores.transition_status">
              {status === "BLOCKED" ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    transitionMutation.mutate(
                      { status: "VERIFIED" },
                      { onSuccess: () => toast.success(t("people.stores.tUnsuspended")) },
                    )
                  }
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
                  onConfirm={() =>
                    transitionMutation.mutate(
                      { status: "BLOCKED" },
                      { onSuccess: () => toast.success(t("people.stores.tSuspended")) },
                    )
                  }
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
        {store && detail && (
          <>
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
                <InfoTab store={store} detail={detail} onSaved={invalidate} />
              </TabsContent>
              <TabsContent value="identity" className="mt-6">
                <IdentityTab storeId={id} status={status} onReviewed={invalidate} />
              </TabsContent>
              <TabsContent value="addresses" className="mt-6">
                <AddressesTab storeId={id} />
              </TabsContent>
              <TabsContent value="hours" className="mt-6">
                <HoursTab store={store} detail={detail} onSaved={invalidate} />
              </TabsContent>
              <TabsContent value="payments" className="mt-6">
                <PaymentsTab storeId={store.id} />
              </TabsContent>
              <TabsContent value="settings" className="mt-6">
                <SettingsTab
                  store={store}
                  status={status}
                  legalTransitions={detail.legal_transitions}
                  onTransition={(target, reason) =>
                    transitionMutation.mutate(
                      { status: target, reason },
                      { onSuccess: () => toast.success(t("people.stores.tStatusChanged")) },
                    )
                  }
                  onSaved={invalidate}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
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
function InfoTab({
  store,
  detail,
  onSaved,
}: {
  store: StoreRow;
  detail: AdminStoreDetail;
  onSaved: () => void;
}) {
  const t = useT();
  const perms = usePermissions();
  const canEdit = perms.has("stores.update");
  const adminOrStaff = perms.role !== "store";

  // Editable store-level settings. The BE StoreUpdate serializer now accepts
  // per-locale StoreInfo text writes (CLOSES ENTRY 026) and the updateStore
  // data-flow carries an optional `info` array; the StoreInfo inputs below stay
  // in the FROZEN read-only UI state, so the write path is plumbed but the
  // visual form remains unchanged.
  const [shopName, setShopName] = useState(store.shop_name);
  const [rank, setRank] = useState(store.rank);
  const [accountType, setAccountType] = useState(store.account_type);
  const [flags, setFlags] = useState({
    order_online: store.order_online,
    returns: store.returns,
    chat: store.chat,
    asset_sharing: store.asset_sharing,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateStore({
        data: {
          id: store.id,
          shop_name: shopName,
          rank,
          account_type: accountType,
          ...flags,
        },
      }),
    onSuccess: () => {
      onSaved();
      toast.success(t("people.stores.tSaved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  return (
    <div className="space-y-4">
      {LANGS.map((lang) => {
        const info = detail.info?.[lang.code];
        return (
          <Card key={lang.code} className="border-0 bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{lang.label}</h3>
              <Badge variant="outline">{lang.code.toUpperCase()}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Fld label={t("people.stores.fldName")}>
                <Input dir={lang.dir} disabled defaultValue={info?.name ?? ""} />
              </Fld>
              <Fld label={t("people.stores.fldFeatures")}>
                <Input dir={lang.dir} disabled defaultValue={info?.features ?? ""} />
              </Fld>
              <Fld label={t("people.stores.fldAbout")} className="md:col-span-2">
                <Textarea rows={3} dir={lang.dir} disabled defaultValue={info?.about ?? ""} />
              </Fld>
              <Fld label={t("people.stores.fldTargetAudience")}>
                <Input dir={lang.dir} disabled defaultValue={info?.target_audience ?? ""} />
              </Fld>
              <Fld label={t("people.stores.fldSellingPromotions")}>
                <Input dir={lang.dir} disabled defaultValue={info?.selling_promotions ?? ""} />
              </Fld>
            </div>
          </Card>
        );
      })}

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
                value={rank}
                onChange={(e) => setRank(Number(e.target.value))}
              />
            </Fld>
          )}
          {adminOrStaff && (
            <Fld label={t("people.stores.fldAccountType")}>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as StoreRow["account_type"])}
                disabled={!canEdit}
              >
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
            checked={flags.order_online}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, order_online: v }))}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagReturns")}
            desc={t("people.stores.flagReturnsDesc")}
            checked={flags.returns}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, returns: v }))}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagChat")}
            desc={t("people.stores.flagChatDesc")}
            checked={flags.chat}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, chat: v }))}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagAssetSharing")}
            desc={t("people.stores.flagAssetSharingDesc")}
            checked={flags.asset_sharing}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, asset_sharing: v }))}
            disabled={!canEdit}
          />
        </div>
        <Can perm="stores.update">
          <div className="mt-6 flex justify-end border-t pt-4">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
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
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  desc: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {onCheckedChange ? (
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      ) : (
        <Switch defaultChecked={defaultChecked} disabled={disabled} />
      )}
    </div>
  );
}

// ── Tab 2 — Identity ─────────────────────────────────────────────────────────
function IdentityTab({
  storeId,
  status,
  onReviewed,
}: {
  storeId: string;
  status: StoreStatus;
  onReviewed: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const identityQuery = useQuery({
    queryKey: ["admin-store-identity", storeId],
    queryFn: () => getStoreIdentity({ data: { id: storeId } }),
    staleTime: 30 * 1000,
    retry: false,
  });
  const id: StoreIdentityFull | undefined = identityQuery.data;
  const reviewable = status === "PENDING_VERIFICATION";

  const approveMutation = useMutation({
    mutationFn: () => reviewIdentity({ data: { id: storeId, decision: "approve" } }),
    onSuccess: () => {
      onReviewed();
      void queryClient.invalidateQueries({ queryKey: ["admin-store-identity", storeId] });
      toast.success(t("people.stores.tApproved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const docs: { label: string; present: boolean }[] = [
    { label: t("people.stores.docFront"), present: id?.front_document_id != null },
    { label: t("people.stores.docBack"), present: id?.back_document_id != null },
    {
      label: t("people.stores.docSupporting"),
      present: (id?.supporting_document_ids?.length ?? 0) > 0,
    },
  ];

  return (
    <Card className="border-0 bg-card p-6 shadow-soft">
      <h3 className="mb-4 font-display text-lg font-semibold">{t("people.stores.idTitle")}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Fld label={t("people.stores.idIdentity")}>
          <Input value={id?.identity ?? ""} disabled className="font-mono" />
        </Fld>
        <Fld label={t("people.stores.idBusinessName")}>
          <Input value={id?.business_name ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idFirstName")}>
          <Input value={id?.first_name ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idMiddleName")}>
          <Input value={id?.middle_name ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idLastName")}>
          <Input value={id?.last_name ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idLicense")}>
          <Input value={id?.business_license_number ?? ""} disabled className="font-mono" />
        </Fld>
        <Fld label={t("people.stores.idResidentialAddress")} className="md:col-span-2">
          <Textarea rows={2} value={id?.residential_address ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idCountryOfIssue")}>
          <Input value={id?.country_of_issue ?? ""} disabled className="font-mono" />
        </Fld>
        <Fld label={t("people.stores.idExpiration")}>
          <Input value={id?.expiration_date ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idDob")}>
          <Input value={id?.dob ?? ""} disabled />
        </Fld>
        <Fld label={t("people.stores.idAccountType")}>
          <Input value={id?.identity ?? ""} disabled />
        </Fld>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("people.stores.idDocuments")}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {docs.map((d) => (
            <Dialog key={d.label}>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs font-medium">{d.label}</p>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="mt-1 h-7" disabled={!d.present}>
                    {t("people.stores.preview")}
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{d.label}</DialogTitle>
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
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={!reviewable || approveMutation.isPending}
            >
              <CheckCircle2 className="me-1.5 h-4 w-4" /> {t("people.stores.approveIdentity")}
            </Button>
            <RejectDialog storeId={storeId} disabled={!reviewable} onReviewed={onReviewed} />
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

function RejectDialog({
  storeId,
  disabled,
  onReviewed,
}: {
  storeId: string;
  disabled?: boolean;
  onReviewed: () => void;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const rejectMutation = useMutation({
    mutationFn: () => reviewIdentity({ data: { id: storeId, decision: "reject", reason } }),
    onSuccess: () => {
      onReviewed();
      toast.success(t("people.stores.tRejected"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });
  return (
    <Dialog onOpenChange={() => setReason("")}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive" disabled={disabled}>
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
              onClick={() => rejectMutation.mutate()}
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

function AddressesTab({ storeId }: { storeId: string }) {
  const t = useT();
  const canEdit = usePermissions().has("stores.update");
  const queryClient = useQueryClient();

  const addrQuery = useQuery({
    queryKey: ["admin-store-addresses", storeId],
    queryFn: () => listAddresses({ data: { store_id: storeId, page_size: 100 } }),
    staleTime: 30 * 1000,
  });
  const addresses: AdminAddress[] = addrQuery.data?.results ?? [];
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin-store-addresses", storeId] });

  const deleteMutation = useMutation({
    mutationFn: (addrId: string) => deleteAddress({ data: { id: addrId } }),
    onSuccess: () => {
      invalidate();
      toast.success(t("people.stores.tDeleted"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });
  const setDefaultMutation = useMutation({
    mutationFn: (addrId: string) =>
      updateAddress({ data: { id: addrId, is_default: true, store_id: storeId } }),
    onSuccess: () => {
      invalidate();
      toast.success(t("people.stores.tSaved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <AddressDialog storeId={storeId} onSaved={invalidate} />
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
            {addresses.map((a) => (
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
                          onClick={() => setDefaultMutation.mutate(a.id)}
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
                        onConfirm={() => deleteMutation.mutate(a.id)}
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

function AddressDialog({ storeId, onSaved }: { storeId: string; onSaved: () => void }) {
  const t = useT();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
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
  // CLOSES ENTRY 028 — the location picker options come from the region-scoped
  // composite Location lookup (reuses the courier locations endpoint, whose
  // `id` IS the Location id the address write expects).
  const locationsQuery = useQuery({
    queryKey: ["admin-location-lookup"],
    queryFn: () => listCourierLocations({ data: { page_size: 200 } }),
    staleTime: 5 * 60 * 1000,
  });
  const locationOptions = locationsQuery.data?.results ?? [];
  async function onSubmit(values: AddressValues) {
    try {
      await createAddress({
        data: {
          store_id: storeId,
          location_id: Number(values.location_id),
          latitude: values.latitude,
          longitude: values.longitude,
          recipient_name: values.recipient_name,
          phone_number: values.phone_number,
          governorate: values.governorate,
          area: values.area,
          postcode: values.postcode,
          street: values.street,
          building: values.building,
          floor: values.floor,
          apartment: values.apartment,
          note: values.note,
        },
      });
      onSaved();
      reset();
      toast.success(t("people.stores.tSaved"));
    } catch (err) {
      const info = parseServerError(err);
      if (info.fieldErrors) {
        for (const [field, msg] of Object.entries(info.fieldErrors)) {
          setError(field as keyof AddressValues, {
            message: Array.isArray(msg) ? msg[0] : String(msg),
          });
        }
      }
      toast.error(info.message);
    }
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
                <SelectValue placeholder={t("people.stores.addrLocation")} />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {[loc.country_name, loc.city_name].filter(Boolean).join(" · ") ||
                      `#${loc.id}`}
                  </SelectItem>
                ))}
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
interface DayRow {
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

function HoursTab({
  store,
  detail,
  onSaved,
}: {
  store: StoreRow;
  detail: AdminStoreDetail;
  onSaved: () => void;
}) {
  const t = useT();
  const canEdit = usePermissions().has("stores.update");

  // Seed the editable matrix from the BE working_days; a day with no row is
  // treated as closed.
  const initial: Record<string, DayRow> = useMemo(() => {
    const out: Record<string, DayRow> = {};
    for (const day of DAYS) {
      const wd = detail.working_days.find((w) => w.day === day);
      out[day] = wd
        ? { start_time: wd.start_time.slice(0, 5), end_time: wd.end_time.slice(0, 5), is_closed: false }
        : { start_time: "09:00", end_time: "18:00", is_closed: true };
    }
    return out;
  }, [detail.working_days]);

  const [rows, setRows] = useState<Record<string, DayRow>>(initial);
  useEffect(() => setRows(initial), [initial]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateStore({
        data: {
          id: store.id,
          working_days: DAYS.filter((d) => !rows[d].is_closed).map((d) => ({
            day: d,
            start_time: rows[d].start_time,
            end_time: rows[d].end_time,
          })),
        },
      }),
    onSuccess: () => {
      onSaved();
      toast.success(t("people.stores.tSaved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  function patch(day: string, p: Partial<DayRow>) {
    setRows((r) => ({ ...r, [day]: { ...r[day], ...p } }));
  }

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
        const wd = rows[day];
        return (
          <div
            key={day}
            className="grid grid-cols-1 items-center gap-3 border-b py-3 last:border-0 md:grid-cols-[120px_1fr_1fr_120px_auto]"
          >
            <Label className="font-medium">{t(`people.stores.day${day}`)}</Label>
            <Input
              type="time"
              dir="ltr"
              value={wd.start_time}
              onChange={(e) => patch(day, { start_time: e.target.value })}
              disabled={!canEdit || wd.is_closed}
            />
            <Input
              type="time"
              dir="ltr"
              value={wd.end_time}
              onChange={(e) => patch(day, { end_time: e.target.value })}
              disabled={!canEdit || wd.is_closed}
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={wd.is_closed}
                onCheckedChange={(v) => patch(day, { is_closed: v })}
                disabled={!canEdit}
              />
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
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {t("people.stores.hoursSave")}
          </Button>
        </div>
      </Can>
    </Card>
  );
}

// ── Tab 5 — Payment methods ──────────────────────────────────────────────────
// Per-store payment methods live under the Phase 6 /payment-methods surface
// (CLOSES ENTRY 027). The tab reuses the P6 store-scoped list endpoint
// (GET /payment-methods/?store_id=) — no duplicate P7 endpoint — and renders the
// store owner's real payment methods inline; the card still links to the full
// P6 management screen.
function PaymentsTab({ storeId }: { storeId: string }) {
  const t = useT();
  const perms = usePermissions();
  const canView = perms.has("payment_methods.view");
  const listQuery = useQuery({
    queryKey: ["admin-store-payment-methods", storeId],
    queryFn: () => listPaymentMethods({ data: { store_id: storeId, page_size: 50 } }),
    enabled: canView,
    staleTime: 30 * 1000,
  });
  const rows = listQuery.data?.results ?? [];
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
          {rows.map((p) => (
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
  legalTransitions,
  onTransition,
  onSaved,
}: {
  store: StoreRow;
  status: StoreStatus;
  legalTransitions: StoreStatus[];
  onTransition: (target: StoreStatus, reason: string) => void;
  onSaved: () => void;
}) {
  const t = useT();
  const perms = usePermissions();
  const canTransition = perms.has("stores.transition_status");
  const canEdit = perms.has("stores.update");
  const [target, setTarget] = useState<StoreStatus | "">("");
  const [reason, setReason] = useState("");
  const [flags, setFlags] = useState({
    order_online: store.order_online,
    returns: store.returns,
    chat: store.chat,
    asset_sharing: store.asset_sharing,
  });

  const flagsMutation = useMutation({
    mutationFn: () => updateStore({ data: { id: store.id, ...flags } }),
    onSuccess: () => {
      onSaved();
      toast.success(t("people.stores.tSaved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

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
                  {legalTransitions.map((s) => (
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
                  onTransition(target, reason);
                  setTarget("");
                  setReason("");
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
            checked={flags.order_online}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, order_online: v }))}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagReturns")}
            desc={t("people.stores.flagReturnsDesc")}
            checked={flags.returns}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, returns: v }))}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagChat")}
            desc={t("people.stores.flagChatDesc")}
            checked={flags.chat}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, chat: v }))}
            disabled={!canEdit}
          />
          <Flag
            label={t("people.stores.flagAssetSharing")}
            desc={t("people.stores.flagAssetSharingDesc")}
            checked={flags.asset_sharing}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, asset_sharing: v }))}
            disabled={!canEdit}
          />
        </div>
        <Can perm="stores.update">
          <div className="mt-4 flex justify-end">
            <Button onClick={() => flagsMutation.mutate()} disabled={flagsMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </Can>
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
