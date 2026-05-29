import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Ticket,
  TrendingUp,
  Clock,
  Archive,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can, usePermissions } from "@/components/shared/Can";
import { PageStates, TableSkeleton } from "@/components/shared/states";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { COUPON_ROWS, STORE_OPTIONS, type CouponRow } from "@/lib/mock/finance";

export const Route = createFileRoute("/_panel/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Mixlebs Admin" }] }),
  component: CouponsPage,
});

function formatDiscount(c: CouponRow) {
  return c.discount_type === "PERCENTAGE"
    ? `${c.discount_value}%`
    : `$${c.discount_value.toFixed(2)}`;
}

function CouponsPage() {
  const t = useT();
  const navigate = useNavigate();
  const state = usePageState();
  const [q, setQ] = useState("");
  const [discountType, setDiscountType] = useState<"ALL" | "MONETARY" | "PERCENTAGE">("ALL");
  const [validity, setValidity] = useState<"ALL" | "valid" | "invalid">("ALL");
  const [scope, setScope] = useState<"ALL" | "PLATFORM" | "STORE">("ALL");
  const [store, setStore] = useState<string>("ALL");
  const [expiresFrom, setExpiresFrom] = useState("");
  const [expiresTo, setExpiresTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const filtered = useMemo(() => {
    return COUPON_ROWS.filter((c) => {
      if (q && !c.code.toLowerCase().includes(q.toLowerCase())) return false;
      if (discountType !== "ALL" && c.discount_type !== discountType) return false;
      if (validity === "valid" && !c.is_valid) return false;
      if (validity === "invalid" && c.is_valid) return false;
      if (scope !== "ALL" && c.scope !== scope) return false;
      if (store !== "ALL" && c.store !== store) return false;
      if (expiresFrom && c.expires.slice(0, 10) < expiresFrom) return false;
      if (expiresTo && c.expires.slice(0, 10) > expiresTo) return false;
      if (createdFrom && c.created_at.slice(0, 10) < createdFrom) return false;
      if (createdTo && c.created_at.slice(0, 10) > createdTo) return false;
      return true;
    });
  }, [q, discountType, validity, scope, store, expiresFrom, expiresTo, createdFrom, createdTo]);

  const active = COUPON_ROWS.filter((c) => c.is_valid).length;
  const scheduled = COUPON_ROWS.filter(
    (c) => c.is_valid && c.starts_at.slice(0, 10) > "2026-05-29",
  ).length;
  const expired = COUPON_ROWS.filter((c) => !c.is_valid).length;
  const redemptions = COUPON_ROWS.reduce((a, c) => a + c.times_used, 0);

  const columns: Column<CouponRow>[] = [
    {
      id: "code",
      header: t("finance.coupons.colCode"),
      sortValue: (c) => c.code,
      cell: (c) => (
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold tracking-wider">
          {c.code}
        </span>
      ),
    },
    {
      id: "discount",
      header: t("finance.coupons.colDiscount"),
      align: "end",
      sortValue: (c) => c.discount_value,
      cell: (c) => (
        <span className="font-mono font-semibold tabular-nums">{formatDiscount(c)}</span>
      ),
    },
    {
      id: "scope",
      header: t("finance.coupons.colScope"),
      sortValue: (c) => c.scope,
      cell: (c) =>
        c.scope === "PLATFORM" ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {t("finance.coupons.scopePlatform")}
          </Badge>
        ) : (
          <Badge variant="outline">{t("finance.coupons.scopeStore")}</Badge>
        ),
    },
    {
      id: "store",
      header: t("finance.coupons.colStore"),
      cell: (c) => <span className="text-sm">{c.store ?? "—"}</span>,
    },
    {
      id: "minOrder",
      header: t("finance.coupons.colMinOrder"),
      align: "end",
      sortValue: (c) => c.min_order_cost,
      cell: (c) => <span className="font-mono tabular-nums">${c.min_order_cost.toFixed(2)}</span>,
    },
    {
      id: "minItems",
      header: t("finance.coupons.colMinItems"),
      align: "end",
      sortValue: (c) => c.min_num_items,
      cell: (c) => <span className="font-mono tabular-nums">{c.min_num_items}</span>,
    },
    {
      id: "capped",
      header: t("finance.coupons.colCapped"),
      align: "end",
      cell: (c) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {c.capped_at != null ? `$${c.capped_at.toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      id: "maxUses",
      header: t("finance.coupons.colMaxUses"),
      align: "end",
      sortValue: (c) => c.max_uses,
      cell: (c) => (
        <span className="font-mono tabular-nums">
          {c.max_uses === 0 ? t("finance.coupons.unlimited") : c.max_uses.toLocaleString()}
        </span>
      ),
    },
    {
      id: "maxPerUser",
      header: t("finance.coupons.colMaxPerUser"),
      align: "end",
      sortValue: (c) => c.max_uses_per_user,
      cell: (c) => <span className="font-mono tabular-nums">{c.max_uses_per_user}</span>,
    },
    {
      id: "timesUsed",
      header: t("finance.coupons.colTimesUsed"),
      align: "end",
      sortValue: (c) => c.times_used,
      cell: (c) => <span className="font-mono tabular-nums">{c.times_used.toLocaleString()}</span>,
    },
    {
      id: "validity",
      header: t("finance.coupons.colValidity"),
      sortValue: (c) => (c.is_valid ? 1 : 0),
      cell: (c) =>
        c.is_valid ? (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/15 text-success font-mono text-[10px] uppercase tracking-wider"
          >
            {t("finance.coupons.fValid")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-border bg-muted text-muted-foreground font-mono text-[10px] uppercase tracking-wider"
          >
            {t("finance.coupons.fInvalid")}
          </Badge>
        ),
    },
    {
      id: "expires",
      header: t("finance.coupons.colExpires"),
      align: "end",
      sortValue: (c) => c.expires,
      cell: (c) => <span className="text-xs text-muted-foreground">{c.expires.slice(0, 10)}</span>,
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t("finance.coupons.title")}
        description={t("finance.coupons.description")}
        actions={
          <>
            <Can perm="coupons.create_platform">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/coupons/new", search: { scope: "PLATFORM" } })}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t("finance.coupons.newPlatformCoupon")}
              </Button>
            </Can>
            <Can perm="coupons.create">
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={() => navigate({ to: "/coupons/new", search: { scope: undefined } })}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t("finance.coupons.newCoupon")}
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("finance.coupons.kpiActive")}
          value={active}
          icon={<Ticket className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("finance.coupons.kpiRedemptions")}
          value={redemptions.toLocaleString()}
          delta={t("finance.coupons.allTime")}
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label={t("finance.coupons.kpiScheduled")}
          value={scheduled}
          delta={t("finance.coupons.startsSoon")}
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label={t("finance.coupons.kpiExpired")}
          value={expired}
          icon={<Archive className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        <DataToolbar
          search={q}
          onSearch={setQ}
          placeholder={t("finance.coupons.searchPlaceholder")}
          count={filtered.length}
          countLabel={t("finance.coupons.countLabel")}
          filters={
            <>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as typeof discountType)}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("finance.coupons.fAllDiscountTypes")}</SelectItem>
                  <SelectItem value="MONETARY">{t("finance.couponEditor.typeMonetary")}</SelectItem>
                  <SelectItem value="PERCENTAGE">
                    {t("finance.couponEditor.typePercentage")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={validity} onValueChange={(v) => setValidity(v as typeof validity)}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("finance.coupons.fAllValidity")}</SelectItem>
                  <SelectItem value="valid">{t("finance.coupons.fValid")}</SelectItem>
                  <SelectItem value="invalid">{t("finance.coupons.fInvalid")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("finance.coupons.fAllScopes")}</SelectItem>
                  <SelectItem value="PLATFORM">{t("finance.coupons.scopePlatform")}</SelectItem>
                  <SelectItem value="STORE">{t("finance.coupons.scopeStore")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("finance.coupons.fAllStores")}</SelectItem>
                  {STORE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={expiresFrom}
                onChange={(e) => setExpiresFrom(e.target.value)}
                className="h-9 w-[150px]"
                aria-label={t("finance.coupons.fExpiresFrom")}
                title={t("finance.coupons.fExpiresFrom")}
              />
              <Input
                type="date"
                value={expiresTo}
                onChange={(e) => setExpiresTo(e.target.value)}
                className="h-9 w-[150px]"
                aria-label={t("finance.coupons.fExpiresTo")}
                title={t("finance.coupons.fExpiresTo")}
              />
              <Input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="h-9 w-[150px]"
                aria-label={t("finance.coupons.fCreatedFrom")}
                title={t("finance.coupons.fCreatedFrom")}
              />
              <Input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="h-9 w-[150px]"
                aria-label={t("finance.coupons.fCreatedTo")}
                title={t("finance.coupons.fCreatedTo")}
              />
            </>
          }
        />

        <PageStates
          state={state}
          skeleton={<TableSkeleton rows={6} cols={7} />}
          empty={<EmptyCoupons />}
          missingPerms={["coupons.view"]}
        >
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(c) => c.id}
            emptyState={<EmptyCoupons />}
            rowActions={(c) => <CouponRowActions coupon={c} />}
          />
        </PageStates>
      </div>
    </div>
  );
}

function CouponRowActions({ coupon }: { coupon: CouponRow }) {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  return (
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
        <DropdownMenuItem
          onClick={() => navigate({ to: "/coupons/$id/redemptions", params: { id: coupon.code } })}
        >
          <Eye className="me-2 h-3.5 w-3.5" /> {t("finance.coupons.actView")}
        </DropdownMenuItem>
        {has("coupons.update") && (
          <DropdownMenuItem
            onClick={() => navigate({ to: "/coupons/$id/edit", params: { id: coupon.code } })}
          >
            <Pencil className="me-2 h-3.5 w-3.5" /> {t("finance.coupons.actEdit")}
          </DropdownMenuItem>
        )}
        {has("coupons.update") && (
          <ConfirmDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Ban className="me-2 h-3.5 w-3.5" /> {t("finance.coupons.actDisable")}
              </DropdownMenuItem>
            }
            title={t("finance.coupons.disableConfirmTitle")}
            description={t("finance.coupons.disableConfirmDesc", { code: coupon.code })}
            confirmLabel={t("finance.coupons.actDisable")}
            onConfirm={() => toast.success(t("finance.coupons.disabled", { code: coupon.code }))}
          />
        )}
        {has("coupons.create") && (
          <DropdownMenuItem
            onClick={() => toast.success(t("finance.coupons.duplicated", { code: coupon.code }))}
          >
            <Copy className="me-2 h-3.5 w-3.5" /> {t("finance.coupons.actDuplicate")}
          </DropdownMenuItem>
        )}
        {has("coupons.delete") && (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                  <Trash2 className="me-2 h-3.5 w-3.5" /> {t("finance.coupons.actDelete")}
                </DropdownMenuItem>
              }
              title={t("finance.coupons.deleteConfirmTitle")}
              destructive
              typeToConfirm={coupon.code}
              confirmLabel={t("finance.coupons.actDelete")}
              onConfirm={() => toast.success(t("finance.coupons.deleted", { code: coupon.code }))}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyCoupons() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <Ticket className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{t("finance.coupons.emptyTitle")}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("finance.coupons.emptyDesc")}
      </p>
      <Can perm="coupons.create">
        <Button
          className="mt-5 bg-gradient-primary text-primary-foreground shadow-glow"
          onClick={() => navigate({ to: "/coupons/new", search: { scope: undefined } })}
        >
          <Plus className="me-1.5 h-4 w-4" /> {t("finance.coupons.newCoupon")}
        </Button>
      </Can>
    </div>
  );
}
