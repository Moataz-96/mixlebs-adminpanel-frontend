import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ForbiddenState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";
import { CHANNEL_SETTINGS, type ChannelSetting, type CommChannel } from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/communications/channels")({
  head: () => ({ meta: [{ title: "Channels — Mixlebs Admin" }] }),
  component: ChannelsPage,
});

const ICON: Record<CommChannel, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  NOTIFICATION: Bell,
};
const LABEL: Record<CommChannel, string> = {
  EMAIL: "content.channels.chEmail",
  SMS: "content.channels.chSms",
  NOTIFICATION: "content.channels.chNotification",
};

function ChannelsPage() {
  const t = useT();
  const { role } = useApp();
  const [rows, setRows] = useState<ChannelSetting[]>(CHANNEL_SETTINGS);

  function setEnabled(key: CommChannel, enabled: boolean) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, enabled } : r)));
    toast.success(
      enabled ? t("content.channels.enabledToast") : t("content.channels.disabledToast"),
    );
  }

  if (role !== "admin") {
    return (
      <>
        <PageHeader
          title={t("content.channels.title")}
          description={t("content.channels.subtitle")}
        />
        <div className="p-6 pt-0">
          <ForbiddenState perms={["templates.view"]} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("content.channels.title")}
        description={t("content.channels.subtitle")}
        actions={
          <Button
            className="bg-gradient-primary text-primary-foreground shadow-glow"
            onClick={() => toast.success(t("content.channels.savedToast"))}
          >
            <Save className="me-1.5 h-4 w-4" /> {t("content.channels.save")}
          </Button>
        }
      />
      <div className="p-6 pt-0">
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((c) => {
            const Icon = ICON[c.key];
            return (
              <Card key={c.key} className="border-0 bg-card p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-semibold">{t(LABEL[c.key])}</h3>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t("content.channels.enabled")}
                        <Switch
                          checked={c.enabled}
                          onCheckedChange={(v) => setEnabled(c.key, !!v)}
                        />
                      </label>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("content.channels.provider")}: {c.provider}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs">{t("content.channels.sender")}</Label>
                        <Input
                          dir="ltr"
                          defaultValue={c.sender}
                          className="mt-1 h-9"
                          disabled={!c.enabled}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("content.channels.dailyQuota")}</Label>
                        <Input
                          dir="ltr"
                          type="number"
                          defaultValue={c.daily_quota}
                          className="mt-1 h-9"
                          disabled={!c.enabled}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("content.channels.throttle")}</Label>
                        <Input
                          dir="ltr"
                          type="number"
                          defaultValue={c.throttle_per_min}
                          className="mt-1 h-9"
                          disabled={!c.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <p className="mt-4 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          {t("content.channels.forwardNote")}
        </p>
      </div>
    </>
  );
}
