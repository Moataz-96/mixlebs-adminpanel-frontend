import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import {
  Bell,
  Check,
  ShoppingCart,
  Undo2,
  Store as StoreIcon,
  Ticket,
  AlertCircle,
  ExternalLink,
  Send,
  CalendarClock,
  Settings2,
  Inbox,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";
import {
  NOTIF_INBOX,
  COMM_TEMPLATES,
  COMM_CHANNELS,
  type NotifItem,
  type NotifType,
  type CommChannel,
} from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Mixlebs Admin" }] }),
  component: NotificationsPage,
});

const TYPE_ICON: Record<NotifType, typeof Bell> = {
  order: ShoppingCart,
  return: Undo2,
  store: StoreIcon,
  promo: Ticket,
  system: AlertCircle,
};
const NOTIF_TYPES: NotifType[] = ["order", "return", "store", "promo", "system"];
const DEMO_USERS = ["Layla Haddad", "Omar Khoury", "Nour Saade", "Rami Geagea", "Aya Mansour"];

function NotificationsPage() {
  const t = useT();
  const { has } = usePermissions();
  const canCompose = has("notifications.send");

  return (
    <>
      <PageHeader
        title={t("content.notif.title")}
        description={t("content.notif.subtitle", {
          unread: NOTIF_INBOX.filter((n) => !n.is_opened).length,
          total: NOTIF_INBOX.length,
        })}
      />
      <div className="p-6 pt-0">
        {canCompose ? (
          <Tabs defaultValue="inbox">
            <TabsList className="mb-5 bg-muted/50">
              <TabsTrigger value="inbox">
                <Inbox className="me-1.5 h-4 w-4" /> {t("content.notif.tabInbox")}
              </TabsTrigger>
              <TabsTrigger value="compose">
                <PenLine className="me-1.5 h-4 w-4" /> {t("content.notif.tabCompose")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="inbox">
              <InboxTab />
            </TabsContent>
            <TabsContent value="compose">
              <ComposeTab />
            </TabsContent>
          </Tabs>
        ) : (
          <InboxTab />
        )}
      </div>
    </>
  );
}

function InboxTab() {
  const t = useT();
  const state = usePageState();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [channel, setChannel] = useState("all");
  const [opened, setOpened] = useState("all");
  const [rows, setRows] = useState<NotifItem[]>(NOTIF_INBOX);

  const filtered = useMemo(
    () =>
      rows.filter((n) => {
        if (search && !`${n.title} ${n.body}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (type !== "all" && n.type !== type) return false;
        if (channel !== "all" && n.channel !== channel) return false;
        if (opened === "yes" && !n.is_opened) return false;
        if (opened === "no" && n.is_opened) return false;
        return true;
      }),
    [rows, search, type, channel, opened],
  );

  function markRead(id: string) {
    setRows((rs) => rs.map((n) => (n.id === id ? { ...n, is_opened: true } : n)));
    toast.success(t("content.notif.markedRead"));
  }
  function markAll() {
    setRows((rs) => rs.map((n) => ({ ...n, is_opened: true })));
    toast.success(t("content.notif.markedAllRead"));
  }

  const columns: Column<NotifItem>[] = [
    {
      id: "type",
      header: t("content.notif.colType"),
      width: "48px",
      cell: (n) => {
        const Icon = TYPE_ICON[n.type];
        return (
          <div
            className={`grid h-9 w-9 place-items-center rounded-xl ${!n.is_opened ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        );
      },
    },
    {
      id: "title",
      header: t("content.notif.colTitle"),
      sortValue: (n) => n.title,
      cell: (n) => (
        <div className="flex items-center gap-2">
          <span className={n.is_opened ? "font-medium" : "font-semibold"}>{n.title}</span>
          {!n.is_opened && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </div>
      ),
    },
    {
      id: "body",
      header: t("content.notif.colBody"),
      cell: (n) => <p className="max-w-md truncate text-sm text-muted-foreground">{n.body}</p>,
    },
    {
      id: "status",
      header: t("content.notif.colStatus"),
      cell: (n) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${n.sent_status === "SENT" ? "border-success/30 bg-success/10 text-success" : n.sent_status === "FAILED" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning"}`}
        >
          {t(`content.notif.sent${n.sent_status}`)}
        </Badge>
      ),
    },
    {
      id: "opened",
      header: t("content.notif.colOpened"),
      align: "center",
      cell: (n) =>
        n.is_opened ? (
          <Check className="mx-auto h-4 w-4 text-success" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "created",
      header: t("content.notif.colCreated"),
      sortValue: (n) => n.created_at,
      cell: (n) => <span className="text-xs text-muted-foreground">{n.created_at}</span>,
    },
  ];

  function rowActions(n: NotifItem) {
    return (
      <div className="flex items-center justify-end gap-1">
        {!n.is_opened && (
          <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={() => markRead(n.id)}>
            <Check className="h-3.5 w-3.5" /> {t("content.notif.markRead")}
          </Button>
        )}
        {n.link && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5"
            onClick={() => toast.info(t("content.notif.opening"))}
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t("content.notif.openLink")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("content.notif.tabInbox")}
          value={rows.length}
          icon={<Bell className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("content.notif.unopened")}
          value={rows.filter((n) => !n.is_opened).length}
        />
        <KpiCard
          label={t("content.notif.sentFAILED")}
          value={rows.filter((n) => n.sent_status === "FAILED").length}
          trend="down"
        />
      </div>

      <DataToolbar
        search={search}
        onSearch={setSearch}
        placeholder={t("content.notif.searchPlaceholder")}
        count={filtered.length}
        countLabel={t("content.notif.countLabel")}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder={t("content.notif.filterType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("content.notif.allTypes")}</SelectItem>
                {NOTIF_TYPES.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {ty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder={t("content.notif.filterChannel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("content.notif.allChannels")}</SelectItem>
                {COMM_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`content.templates.channel${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={opened} onValueChange={setOpened}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder={t("content.notif.filterOpened")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("content.notif.allStatuses")}</SelectItem>
                <SelectItem value="yes">{t("content.notif.opened")}</SelectItem>
                <SelectItem value="no">{t("content.notif.unopened")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={markAll}>
              <Check className="h-3.5 w-3.5" /> {t("content.notif.markAllRead")}
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
              <Link to="/account/notifications-prefs">
                <Settings2 className="h-3.5 w-3.5" /> {t("content.notif.prefs")}
              </Link>
            </Button>
          </>
        }
      />

      <PageStates
        state={state}
        empty={
          <EmptyState
            title={t("content.notif.emptyTitle")}
            description={t("content.notif.emptyDesc")}
            icon={<Bell className="h-6 w-6" />}
          />
        }
      >
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(n) => n.id}
          rowActions={rowActions}
          emptyState={
            <div className="grid h-32 place-items-center text-sm text-muted-foreground">
              {t("content.notif.emptyTitle")}
            </div>
          }
        />
      </PageStates>
    </div>
  );
}

interface ComposeForm {
  target_type: "User" | "Store" | "Audience";
  target_id: string;
  audience: string[];
  template_id: string;
  variables: string;
  channels: CommChannel[];
}

function ComposeTab() {
  const t = useT();
  const { role, stores } = useApp();
  const { has } = usePermissions();
  const canBroadcast = has("notifications.send_broadcast");

  const { watch, setValue, handleSubmit } = useForm<ComposeForm>({
    defaultValues: {
      target_type: "User",
      target_id: "",
      audience: [],
      template_id: "",
      variables: "",
      channels: ["NOTIFICATION"],
    },
  });
  const targetType = watch("target_type");
  const audience = watch("audience");
  const channels = watch("channels");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(values: ComposeForm): boolean {
    const e: Record<string, string> = {};
    if (values.target_type === "Audience") {
      if (values.audience.length === 0) e.audience = t("content.notif.errAudience");
    } else if (!values.target_id) {
      e.target = t("content.notif.errTarget");
    }
    if (values.channels.length === 0) e.channels = t("content.notif.errChannels");
    if (values.variables.trim()) {
      try {
        JSON.parse(values.variables);
      } catch {
        e.variables = t("content.notif.errJson");
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(action: "send" | "schedule") {
    return (values: ComposeForm) => {
      if (!validate(values)) return;
      toast.success(action === "send" ? t("content.notif.sent") : t("content.notif.scheduled"));
    };
  }

  function toggleChannel(c: CommChannel, on: boolean) {
    setValue("channels", on ? [...channels, c] : channels.filter((x) => x !== c));
  }
  function toggleAudience(a: string, on: boolean) {
    setValue("audience", on ? [...audience, a] : audience.filter((x) => x !== a));
  }

  return (
    <Card className="max-w-2xl border-0 bg-card p-6 shadow-soft">
      <h3 className="font-display text-lg font-semibold">{t("content.notif.composeTitle")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("content.notif.composeDesc")}</p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submit("send"))} noValidate>
        <div>
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("content.notif.fTargetType")}
          </Label>
          <RadioGroup
            value={targetType}
            onValueChange={(v) => setValue("target_type", v as ComposeForm["target_type"])}
            className="flex flex-wrap gap-4"
          >
            {(["User", "Store", "Audience"] as const).map((tt) => {
              const disabled = tt === "Audience" && (role !== "admin" || !canBroadcast);
              return (
                <label
                  key={tt}
                  className={`flex items-center gap-2 text-sm ${disabled ? "opacity-40" : "cursor-pointer"}`}
                >
                  <RadioGroupItem value={tt} disabled={disabled} />
                  {t(`content.notif.target${tt}`)}
                </label>
              );
            })}
          </RadioGroup>
        </div>

        {targetType === "Audience" ? (
          <div>
            <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("content.notif.fAudience")}
            </Label>
            <div className="flex flex-wrap gap-4">
              {(["CUSTOMER", "STORE", "STAFF"] as const).map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={audience.includes(a)}
                    onCheckedChange={(v) => toggleAudience(a, !!v)}
                  />
                  {t(`content.notif.aud${a}`)}
                </label>
              ))}
            </div>
            {errors.audience && <p className="mt-1 text-xs text-destructive">{errors.audience}</p>}
            {!canBroadcast && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("content.notif.broadcastNote")}
              </p>
            )}
          </div>
        ) : (
          <div>
            <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("content.notif.fTargetId")}
            </Label>
            <Select value={watch("target_id")} onValueChange={(v) => setValue("target_id", v)}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    targetType === "Store"
                      ? t("content.notif.targetIdPlaceholderStore")
                      : t("content.notif.targetIdPlaceholderUser")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {targetType === "Store"
                  ? stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  : DEMO_USERS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            {errors.target && <p className="mt-1 text-xs text-destructive">{errors.target}</p>}
          </div>
        )}

        <div>
          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("content.notif.fTemplate")}
          </Label>
          <Select value={watch("template_id")} onValueChange={(v) => setValue("template_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("content.notif.templatePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("content.notif.noTemplate")}</SelectItem>
              {COMM_TEMPLATES.map((tp) => (
                <SelectItem key={tp.id} value={tp.id}>
                  {tp.type.replace(/_/g, " ")} · {t(`content.templates.channel${tp.channel}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("content.notif.fVariables")}
          </Label>
          <Textarea
            dir="ltr"
            rows={4}
            className="font-mono text-sm"
            placeholder={t("content.notif.variablesPlaceholder")}
            value={watch("variables")}
            onChange={(e) => setValue("variables", e.target.value)}
          />
          {errors.variables && <p className="mt-1 text-xs text-destructive">{errors.variables}</p>}
        </div>

        <div>
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("content.notif.fChannels")}
          </Label>
          <div className="flex flex-wrap gap-4">
            {COMM_CHANNELS.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={channels.includes(c)}
                  onCheckedChange={(v) => toggleChannel(c, !!v)}
                />
                {t(`content.templates.channel${c}`)}
              </label>
            ))}
          </div>
          {errors.channels && <p className="mt-1 text-xs text-destructive">{errors.channels}</p>}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Send className="me-1.5 h-4 w-4" /> {t("content.notif.send")}
          </Button>
          <Button type="button" variant="outline" onClick={handleSubmit(submit("schedule"))}>
            <CalendarClock className="me-1.5 h-4 w-4" /> {t("content.notif.schedule")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
