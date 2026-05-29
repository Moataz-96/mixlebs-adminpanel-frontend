import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n";
import { NOTIF_PREF_ROWS, type NotifChannel, type NotifPrefRow } from "@/lib/mock/account";

export const Route = createFileRoute("/_panel/account/notifications-prefs")({
  head: () => ({ meta: [{ title: "Notification preferences — Mixlebs Admin" }] }),
  component: NotificationPrefsPage,
});

const CHANNELS: { key: NotifChannel; labelKey: string }[] = [
  { key: "NOTIFICATION", labelKey: "account.npChannelNotification" },
  { key: "EMAIL", labelKey: "account.npChannelEmail" },
  { key: "SMS", labelKey: "account.npChannelSms" },
];

function NotificationPrefsPage() {
  const t = useT();
  const [rows, setRows] = useState<NotifPrefRow[]>(() => NOTIF_PREF_ROWS.map((r) => ({ ...r })));

  function toggle(type: string, channel: NotifChannel, value: boolean) {
    setRows((prev) => prev.map((r) => (r.type === type ? { ...r, [channel]: value } : r)));
  }

  function onSave() {
    toast.success(t("account.npSaved"));
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t("account.npTitle")}
        description={t("account.npSubtitle")}
        actions={
          <Button
            onClick={onSave}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <Save className="me-1.5 h-4 w-4" /> {t("account.npSave")}
          </Button>
        }
      />

      <Card className="overflow-hidden border-0 shadow-soft">
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>{t("account.npCategory")}</div>
          {CHANNELS.map((c) => (
            <div key={c.key} className="text-center">
              {t(c.labelKey)}
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <div
            key={r.type}
            className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-4 border-b px-5 py-4 last:border-0"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" /> {t(r.labelKey)}
            </p>
            {CHANNELS.map((c) => (
              <div key={c.key} className="flex justify-center">
                <Checkbox
                  checked={r[c.key]}
                  onCheckedChange={(v) => toggle(r.type, c.key, !!v)}
                  aria-label={`${t(r.labelKey)} — ${t(c.labelKey)}`}
                />
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
