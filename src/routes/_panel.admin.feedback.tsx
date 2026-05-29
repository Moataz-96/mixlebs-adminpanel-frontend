import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageSquare, Star, Bug, Reply, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, ForbiddenState } from "@/components/shared/states";
import { Can, usePermissions } from "@/components/shared/Can";
import { usePageState } from "@/lib/page-state";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { APP_FEEDBACK, type AppFeedback, type FeedbackCategory } from "@/lib/mock/admin";

export const Route = createFileRoute("/_panel/admin/feedback")({
  head: () => ({ meta: [{ title: "App feedback — Mixlebs Admin" }] }),
  component: FeedbackPage,
});

const CATEGORIES: FeedbackCategory[] = ["GENERAL", "BUG", "FEATURE", "PERFORMANCE", "OTHER"];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < n ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

function FeedbackPage() {
  const t = useT();
  const { has } = usePermissions();
  const state = usePageState();
  const [selected, setSelected] = useState<AppFeedback | null>(null);
  const [reply, setReply] = useState("");

  const [rating, setRating] = useState("all");
  const [category, setCategory] = useState("all");
  const [user, setUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const rows = useMemo(
    () =>
      APP_FEEDBACK.filter((f) => {
        if (rating !== "all" && f.rating !== Number(rating)) return false;
        if (category !== "all" && f.category !== category) return false;
        if (user && !`${f.user_name} ${f.user_email}`.toLowerCase().includes(user.toLowerCase()))
          return false;
        if (dateFrom && f.created_at.slice(0, 10) < dateFrom) return false;
        if (dateTo && f.created_at.slice(0, 10) > dateTo) return false;
        return true;
      }),
    [rating, category, user, dateFrom, dateTo],
  );

  if (!has("feedback.view")) {
    return (
      <div className="p-6">
        <PageHeader title={t("admin.feedback.title")} description={t("admin.feedback.subtitle")} />
        <ForbiddenState perms={["feedback.view"]} />
      </div>
    );
  }

  const avg = (
    APP_FEEDBACK.reduce((a, f) => a + f.rating, 0) / Math.max(1, APP_FEEDBACK.length)
  ).toFixed(1);
  const bugs = APP_FEEDBACK.filter((f) => f.category === "BUG").length;

  function catLabel(c: FeedbackCategory) {
    return t(`admin.feedback.cat${c}`);
  }

  function sendReply() {
    toast.success(t("admin.feedback.sent"));
    setReply("");
    setSelected(null);
  }

  const columns: Column<AppFeedback>[] = [
    {
      id: "created_at",
      header: t("admin.feedback.colCreated"),
      cell: (f) => <span className="font-mono text-xs">{f.created_at}</span>,
      sortValue: (f) => f.created_at,
    },
    {
      id: "user",
      header: t("admin.feedback.colUser"),
      cell: (f) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">
              {f.user_name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">{f.user_name}</p>
            <p className="text-xs text-muted-foreground">{f.user_email}</p>
          </div>
        </div>
      ),
      sortValue: (f) => f.user_name,
    },
    {
      id: "rating",
      header: t("admin.feedback.colRating"),
      cell: (f) => <Stars n={f.rating} />,
      sortValue: (f) => f.rating,
    },
    {
      id: "category",
      header: t("admin.feedback.colCategory"),
      cell: (f) => (
        <Badge variant="outline" className="text-[10px]">
          {catLabel(f.category)}
        </Badge>
      ),
      sortValue: (f) => f.category,
    },
    {
      id: "comment",
      header: t("admin.feedback.colComment"),
      cell: (f) => (
        <span className="block max-w-[320px] truncate text-sm text-muted-foreground">
          {f.comment}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title={t("admin.feedback.title")} description={t("admin.feedback.subtitle")} />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={t("admin.feedback.kTotal")}
          value={APP_FEEDBACK.length}
          icon={<MessageSquare className="h-5 w-5" />}
          accent
        />
        <KpiCard
          label={t("admin.feedback.kAvgRating")}
          value={avg}
          icon={<Star className="h-5 w-5" />}
        />
        <KpiCard
          label={t("admin.feedback.kBugs")}
          value={bugs}
          icon={<Bug className="h-5 w-5" />}
          trend={bugs > 0 ? "down" : "flat"}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admin.feedback.fRating")}</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.common.all")}</SelectItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("admin.feedback.fCategory")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.common.all")}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {catLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-df" className="text-xs">
              {t("admin.feedback.fDateFrom")}
            </Label>
            <Input
              id="f-df"
              type="date"
              dir="ltr"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-dt" className="text-xs">
              {t("admin.feedback.fDateTo")}
            </Label>
            <Input
              id="f-dt"
              type="date"
              dir="ltr"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-user" className="text-xs">
              {t("admin.feedback.fUser")}
            </Label>
            <Input
              id="f-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder={t("admin.feedback.searchPlaceholder")}
              className="h-9"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <PageStates
          state={state}
          missingPerms={["feedback.view"]}
          empty={
            <div className="rounded-2xl border border-dashed bg-muted/30 p-16 text-center text-sm text-muted-foreground">
              {t("admin.feedback.emptyDesc")}
            </div>
          }
        >
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(f) => f.id}
            onRowClick={setSelected}
            rowActions={(f) => (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setSelected(f)}
                  aria-label={t("admin.common.open")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Can perm="feedback.respond">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setSelected(f)}
                    aria-label={t("admin.common.respond")}
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                </Can>
              </div>
            )}
          />
        </PageStates>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{t("admin.feedback.drawerTitle")}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selected.created_at}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 py-6">
                <div className="flex items-center justify-between">
                  <Stars n={selected.rating} />
                  <Badge variant="outline" className="text-[10px]">
                    {catLabel(selected.category)}
                  </Badge>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("admin.feedback.userContext")}
                  </p>
                  <p className="mt-2 text-sm font-medium">{selected.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selected.user_email}</p>
                </div>
                <p className="text-sm leading-relaxed">{selected.comment}</p>

                <Can perm="feedback.respond" fallback={null}>
                  <div className="space-y-2 border-t pt-5">
                    <Label htmlFor="reply">{t("admin.feedback.reply")}</Label>
                    <Textarea
                      id="reply"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={t("admin.feedback.replyPh")}
                      rows={4}
                    />
                    <Button
                      onClick={sendReply}
                      disabled={!reply.trim()}
                      className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                    >
                      <Reply className="me-1.5 h-4 w-4" /> {t("admin.feedback.send")}
                    </Button>
                  </div>
                </Can>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
