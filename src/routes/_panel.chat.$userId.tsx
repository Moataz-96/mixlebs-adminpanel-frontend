import { useState, type KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { NotFoundState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { parseServerError } from "@/lib/api/error";
import {
  getThread,
  listConversations,
  sendMessage,
  editMessage,
  deleteMessage,
  toDmThread,
  toDmMessage,
  type DmMessage,
} from "@/lib/api/chat.functions";

export const Route = createFileRoute("/_panel/chat/$userId")({
  head: () => ({ meta: [{ title: "Conversation — Mixlebs Admin" }] }),
  component: ChatConversation,
});

function ChatConversation() {
  const t = useT();
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => listConversations(),
    retry: false,
  });
  const summary = (conversationsQuery.data ?? []).find((c) => c.user_id === userId);
  const thread = summary ? toDmThread(summary) : undefined;

  const threadQuery = useQuery({
    queryKey: ["chat-thread", userId],
    queryFn: () => getThread({ data: { user_id: userId } }),
    retry: false,
  });

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (threadQuery.data) {
      setMessages((threadQuery.data.results ?? []).map((m) => toDmMessage(m, userId)));
    }
  }, [threadQuery.data, userId]);

  if (!thread) {
    return (
      <>
        <PageHeader title={t("content.chat.title")} />
        <div className="p-6 pt-0">
          {conversationsQuery.isPending ? null : <NotFoundState />}
        </div>
      </>
    );
  }

  async function send() {
    const body = draft.trim();
    if (!body) return;
    try {
      const created = await sendMessage({
        data: { user_id: userId, receiver_id: userId, message: body },
      });
      setMessages((m) => [...m, toDmMessage(created, userId)]);
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast.success(t("content.chat.msgSent"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
  async function saveEdit(id: string) {
    try {
      await editMessage({ data: { id: Number(id), message: editText } });
      setMessages((m) =>
        m.map((msg) => (msg.id === id ? { ...msg, body: editText, edited: true } : msg)),
      );
      setEditingId(null);
      toast.success(t("content.chat.msgEdited"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }
  async function remove(id: string) {
    try {
      await deleteMessage({ data: { id: Number(id) } });
      setMessages((m) => m.filter((msg) => msg.id !== id));
      toast.success(t("content.chat.msgDeleted"));
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  return (
    <>
      <PageHeader
        title={thread.name}
        description={t("content.chat.subtitle")}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/chat">
              <ArrowLeft className="me-1.5 h-4 w-4" /> {t("content.chat.title")}
            </Link>
          </Button>
        }
      />
      <div className="p-6 pt-0">
        <Card className="flex h-[calc(100vh-230px)] flex-col overflow-hidden border-0 shadow-soft">
          {/* top bar */}
          <div className="flex items-center gap-3 border-b p-4">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">
                  {thread.initials}
                </AvatarFallback>
              </Avatar>
              {thread.online && (
                <span className="absolute -end-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{thread.name}</p>
              <p className="text-xs text-muted-foreground">
                {thread.online ? t("content.chat.online") : t("content.chat.offline")}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <UserRound className="h-3.5 w-3.5" /> {t("content.chat.viewProfile")}
            </Button>
          </div>

          {/* message list */}
          <div className="flex-1 space-y-3 overflow-auto p-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("group flex", msg.own ? "justify-end" : "justify-start")}
              >
                <div className="flex max-w-[72%] flex-col gap-1">
                  {editingId === msg.id ? (
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="min-w-[220px]"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => saveEdit(msg.id)}
                        aria-label="Save"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm",
                        msg.own
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "bg-muted",
                      )}
                    >
                      {msg.body}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground",
                      msg.own ? "justify-end" : "justify-start",
                    )}
                  >
                    <span>{msg.at}</span>
                    {msg.edited && <span>· {t("content.chat.edited")}</span>}
                    {msg.own &&
                      (msg.read ? (
                        <CheckCheck className="h-3 w-3 text-info" />
                      ) : (
                        <Check className="h-3 w-3" />
                      ))}
                    {msg.own && editingId !== msg.id && (
                      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          className="hover:text-foreground"
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditText(msg.body);
                          }}
                          aria-label={t("content.chat.editMsg")}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <ConfirmDialog
                          trigger={
                            <button
                              type="button"
                              className="hover:text-destructive"
                              aria-label={t("content.chat.deleteMsg")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          }
                          title={t("content.chat.deleteMsgTitle")}
                          description={t("content.chat.deleteMsgDesc")}
                          confirmLabel={t("content.chat.deleteMsg")}
                          destructive
                          onConfirm={() => remove(msg.id)}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* composer */}
          <div className="flex items-end gap-2 border-t p-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={t("content.chat.attach")}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={t("content.chat.emoji")}
            >
              <Smile className="h-4 w-4" />
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={t("content.chat.composerPlaceholder")}
              className="max-h-32 min-h-10 resize-none"
            />
            <Button
              className="h-10 shrink-0 bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={send}
              aria-label={t("content.chat.send")}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
