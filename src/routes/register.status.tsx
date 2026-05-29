import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Upload,
  MessageSquare,
  LogOut,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ShieldCheck,
  X,
  File as FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import { getRegistrationStatus, uploadRegisterDocument } from "@/lib/api/stores.functions";

export const Route = createFileRoute("/register/status")({
  head: () => ({ meta: [{ title: "Registration status — Mixlebs Admin" }] }),
  component: RegisterStatus,
});

// StoreStatusEnum → banner label key + visual treatment.
type StoreStatus =
  | "UNVERIFIED"
  | "PENDING_VERIFICATION"
  | "PENDING_PAYMENT"
  | "VERIFIED"
  | "BLOCKED";

const BANNERS: Record<
  StoreStatus,
  { key: string; tone: "warning" | "info" | "destructive" | "success"; Icon: typeof Clock }
> = {
  UNVERIFIED: { key: "auth.bannerActionRequired", tone: "warning", Icon: ShieldAlert },
  PENDING_VERIFICATION: { key: "auth.bannerPendingVerification", tone: "warning", Icon: Clock },
  PENDING_PAYMENT: { key: "auth.bannerAwaitingPayment", tone: "info", Icon: FileText },
  VERIFIED: { key: "auth.bannerVerified", tone: "success", Icon: ShieldCheck },
  BLOCKED: { key: "auth.bannerBlocked", tone: "destructive", Icon: ShieldAlert },
};

function RegisterStatus() {
  const t = useT();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);

  // GET /api/admin/v1/stores/registration_status/ — polled every 30s.
  const statusQuery = useQuery({
    queryKey: ["registration-status"],
    queryFn: () => getRegistrationStatus(),
    refetchInterval: 30_000,
    retry: false,
  });

  const store = {
    id: statusQuery.data?.id ?? "",
    shop_name: statusQuery.data?.shop_name ?? "",
    status: (statusQuery.data?.status ?? "PENDING_VERIFICATION") as StoreStatus,
  };
  // The registration_status endpoint does not return identity doc count / date
  // (see required_adminpanel_change.md) — static placeholder summary.
  const identity = { submitted_at: "—", documents_count: 0 };

  // Redirect to the dashboard once the store is verified.
  useEffect(() => {
    if (store.status === "VERIFIED") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [store.status, navigate]);

  const banner = BANNERS[store.status] ?? BANNERS.PENDING_VERIFICATION;
  const Icon = banner.Icon;
  const toneCls: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    info: "bg-primary/15 text-primary",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-success/15 text-success",
  };
  const badgeCls: Record<string, string> = {
    warning: "border-warning/40 text-warning",
    info: "border-primary/40 text-primary",
    destructive: "border-destructive/40 text-destructive",
    success: "border-success/40 text-success",
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-surface p-6">
      <Card className="w-full max-w-2xl border-0 bg-card p-8 shadow-soft">
        <div className="flex items-start gap-4">
          <div
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${toneCls[banner.tone]}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <Badge variant="outline" className={badgeCls[banner.tone]}>
              {t(banner.key)}
            </Badge>
            <h1 className="mt-2 font-display text-2xl font-bold">{t("auth.reviewingStore")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("auth.reviewingStoreDesc", { shop: store.shop_name })}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {t("auth.storeId")}: {store.id}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-muted/20 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("auth.submitted")}
          </p>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> {t("auth.storeProfileComplete")}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />{" "}
              {t("auth.identityDocsSummary", {
                count: identity.documents_count,
                date: identity.submitted_at,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> {t("auth.paymentPendingSetup")}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("auth.actionItems")}
          </p>
          <div className="space-y-2">
            <ActionItem
              icon={<Upload className="h-4 w-4" />}
              label={t("auth.uploadClearerId")}
              cta={t("auth.upload")}
              onClick={() => setUploadOpen(true)}
            />
            <ActionItem
              icon={<FileText className="h-4 w-4" />}
              label={t("auth.addPaymentMethod")}
              cta={t("auth.addMethod")}
              href="/payment-methods/new"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
          <Button variant="outline" asChild>
            <Link to="/chat">
              <MessageSquare className="me-1.5 h-4 w-4" /> {t("auth.contactSupport")}
            </Link>
          </Button>
          <Button variant="ghost" className="ms-auto text-muted-foreground" asChild>
            <Link to="/login">
              <LogOut className="me-1.5 h-4 w-4" /> {t("auth.signOut")}
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t("auth.autoRefresh")}</p>
      </Card>

      {uploadOpen && <UploadDocDialog onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

function UploadDocDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md rounded-2xl border-0 bg-card p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{t("auth.uploadDocTitle")}</h3>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label={t("common.cancel")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.uploadDocDesc")}</p>

        {file ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border bg-background/40 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
              <FileIcon className="h-4 w-4" />
            </div>
            <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => setFile(null)}
            >
              {t("auth.remove")}
            </Button>
          </div>
        ) : (
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-muted/20 p-6 text-center transition hover:bg-muted/40">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">{t("auth.uploadClick")}</p>
            <p className="text-xs text-muted-foreground">{t("auth.uploadHint")}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
                e.target.value = "";
              }}
            />
          </label>
        )}

        <Button
          className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow"
          disabled={!file || uploading}
          onClick={async () => {
            if (!file) return;
            setUploading(true);
            try {
              // POST /api/admin/v1/stores/register_document/ uploads the file.
              // NOTE: there is no P1 endpoint to ATTACH the re-uploaded doc to an
              // existing registration (see required_adminpanel_change.md), so the
              // asset is uploaded but not yet bound to the store.
              const form = new FormData();
              form.append("file", file);
              await uploadRegisterDocument({ data: form });
              toast.success(t("auth.docUploadedToast"));
              onClose();
            } catch {
              toast.error(t("auth.uploadHint"));
            } finally {
              setUploading(false);
            }
          }}
        >
          {t("auth.upload")}
        </Button>
      </Card>
    </div>
  );
}

function ActionItem({
  icon,
  label,
  cta,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  cta: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background/40 p-3">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="flex-1 text-sm">{label}</p>
      {href ? (
        <Button size="sm" variant="outline" asChild>
          <a href={href}>{cta}</a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onClick}>
          {cta}
        </Button>
      )}
    </div>
  );
}
