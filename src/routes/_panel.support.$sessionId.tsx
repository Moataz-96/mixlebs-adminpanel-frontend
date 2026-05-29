import { useState, type KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Send,
  UserCheck,
  CheckCircle2,
  Paperclip,
  MessageSquareQuote,
  Ban,
  Phone,
  Mail,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { NotFoundState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Can } from "@/components/shared/Can";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";
import {
  SUPPORT_INBOX,
  STAFF_MEMBERS,
  RECENT_ORDERS,
  type SupportSession as Session,
  type SessionMessage,
  type SupportStatus,
} from "@/lib/mock/content";

export const Route = createFileRoute("/_panel/support/$sessionId")({
  head: () => ({ meta: [{ title: "Support session — Mixlebs Admin" }] }),
  component: SupportSessionPage,
});

function SupportSessionPage() {
  const t = useT();
  const { role } = useApp();
  const { sessionId } = Route.useParams();
  const base = SUPPORT_INBOX.find((x) => x.id === sessionId);

  const [session, setSession] = useState<Session | null>(base ?? null);
  const [messages, setMessages] = useState<SessionMessage[]>(base?.messages ?? []);
  const [draft, setDraft] = useState("");

  if (!session) {
    return (
      <>
        <PageHeader title={t("content.session.title")} />
        <div className="p-6 pt-0">
          <NotFoundState />
        </div>
      </>
    );
  }

  const initials = session.customer
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const isUnassigned = session.status === "OPEN" && !session.assigned_to;

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [
      ...m,
      {
        id: `sm_${Date.now()}`,
        sender_role: "STAFF",
        message: body,
        type: "text",
        is_read: false,
        at: "now",
      },
    ]);
    setDraft("");
    toast.success(t("content.session.msgSent"));
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
  function setStatus(status: SupportStatus, extra: Partial<Session> = {}) {
    setSession((s) => (s ? { ...s, status, ...extra } : s));
  }

  return (
    <>
      <PageHeader
        title={t("content.session.title")}
        description={`#${session.id} · ${session.customer}`}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/support">
              <ArrowLeft className="me-1.5 h-4 w-4" /> {t("content.session.backToInbox")}
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 p-6 pt-0 xl:grid-cols-[300px_1fr_280px]">
        {/* LEFT — customer info + metadata */}
        <aside className="space-y-4">
          <Card className="border-0 bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-gradient-primary text-sm text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{session.customer}</p>
                <StatusBadge status={session.status} />
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> <span dir="ltr">{session.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />{" "}
                <span dir="ltr" className="truncate">
                  {session.email}
                </span>
              </li>
            </ul>
          </Card>

          <Card className="border-0 bg-card p-5 shadow-soft">
            <h3 className="mb-3 font-display text-base font-semibold">
              {t("content.session.metadata")}
            </h3>
            <dl className="space-y-2 text-xs">
              <Meta label={t("content.session.mStarted")} value={session.started_at} />
              <Meta label={t("content.session.mOpened")} value={session.opened_at} />
              <Meta label={t("content.session.mAwaiting")} value={session.awaiting_since} />
              <Meta label={t("content.session.mClosed")} value={session.closed_at} />
              <Meta
                label={t("content.session.mRating")}
                value={session.rating != null ? `${session.rating} ★` : null}
              />
              <Meta label={t("content.session.mFeedback")} value={session.feedback} />
            </dl>
          </Card>
        </aside>

        {/* CENTRE — thread */}
        <Card className="grid h-[calc(100vh-220px)] grid-rows-[auto_1fr_auto] overflow-hidden border-0 shadow-soft">
          <div className="flex items-center gap-3 border-b p-4">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold">{session.customer}</p>
            </div>
            <StatusBadge status={session.status} />
          </div>

          <div className="space-y-3 overflow-auto p-5">
            {messages.map((m) => {
              if (m.sender_role === "SYSTEM") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
                      {m.message} · {m.at}
                    </div>
                  </div>
                );
              }
              const own = m.sender_role === "STAFF";
              return (
                <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                  <div className="flex max-w-[72%] flex-col gap-1">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm",
                        own
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "bg-muted",
                      )}
                    >
                      {m.message}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground",
                        own ? "justify-end" : "justify-start",
                      )}
                    >
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[8px] uppercase tracking-wider"
                      >
                        {t(`content.session.role${m.sender_role}`)}
                      </Badge>
                      <span>{m.at}</span>
                      {own && m.is_read && <CheckCheck className="h-3 w-3 text-info" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t p-3">
            <Can
              perm="chat.support_message"
              fallback={
                <p className="px-1 text-xs text-muted-foreground">
                  {t("content.session.composerPlaceholder")}
                </p>
              }
            >
              <div className="mb-2 flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5">
                      <MessageSquareQuote className="h-3.5 w-3.5" />{" "}
                      {t("content.session.quickReplies")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {[1, 2, 3].map((n) => (
                      <DropdownMenuItem
                        key={n}
                        onSelect={() => setDraft(t(`content.session.quickReply${n}`))}
                        className="whitespace-normal text-xs"
                      >
                        {t(`content.session.quickReply${n}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={t("content.session.attach")}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  placeholder={t("content.session.composerPlaceholder")}
                  className="max-h-32 min-h-10 resize-none"
                />
                <Button
                  className="h-10 shrink-0 bg-gradient-primary text-primary-foreground shadow-glow"
                  onClick={send}
                  aria-label={t("content.session.send")}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Can>
          </div>
        </Card>

        {/* RIGHT — quick actions */}
        <aside className="space-y-3">
          <Card className="border-0 bg-card p-5 shadow-soft">
            <h3 className="mb-4 font-display text-base font-semibold">
              {t("content.session.actions")}
            </h3>
            <div className="space-y-2.5">
              {isUnassigned && (
                <Can perm="chat.support_pickup">
                  <Button
                    className="w-full justify-start gap-2 bg-gradient-primary text-primary-foreground shadow-glow"
                    onClick={() => {
                      setStatus("ASSIGNED", { assigned_to: "me", opened_at: "now" });
                      toast.success(t("content.session.pickedUp"));
                    }}
                  >
                    <UserCheck className="h-4 w-4" /> {t("content.session.pickUp")}
                  </Button>
                </Can>
              )}

              <Can perm="chat.support_close">
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      disabled={
                        session.status === "CLOSED" || session.status === "AWAITING_FEEDBACK"
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" /> {t("content.session.close")}
                    </Button>
                  }
                  title={t("content.session.closeTitle")}
                  description={t("content.session.closeDesc")}
                  confirmLabel={t("content.session.close")}
                  onConfirm={() => {
                    setStatus("AWAITING_FEEDBACK", { awaiting_since: "now" });
                    toast.success(t("content.session.closed"));
                  }}
                />
              </Can>

              {role === "admin" && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                    {t("content.session.transfer")}
                  </p>
                  <Select
                    onValueChange={(v) => {
                      setSession((s) => (s ? { ...s, assigned_to: v } : s));
                      toast.success(t("content.session.transferred"));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("content.session.transferPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_MEMBERS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="w-full justify-start gap-2 text-destructive">
                    <Ban className="h-4 w-4" /> {t("content.session.markSpam")}
                  </Button>
                }
                title={t("content.session.markSpamTitle")}
                description={t("content.session.markSpamDesc")}
                confirmLabel={t("content.session.markSpam")}
                destructive
                onConfirm={() => {
                  setStatus("CLOSED", { closed_at: "now" });
                  toast.success(t("content.session.markedSpam"));
                }}
              />

              <div>
                <p className="mb-1.5 mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("content.session.linkOrder")}
                </p>
                <Select onValueChange={() => toast.success(t("content.session.linkedOrder"))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("content.session.linkOrderPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RECENT_ORDERS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value ?? t("content.none")}</dd>
    </div>
  );
}
