import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Megaphone,
  Mail,
  MessageSquare,
  Bell,
  Pencil,
  Send,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageStates, EmptyState, ForbiddenState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseServerError } from "@/lib/api/error";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  toCommTemplate,
  COMM_TYPES,
  COMM_CHANNELS,
  COMM_PLACEHOLDERS,
  type CommTemplate,
  type CommChannel,
} from "@/lib/api/templates.functions";

export const Route = createFileRoute("/_panel/communications/templates")({
  head: () => ({ meta: [{ title: "Communication templates — Mixlebs Admin" }] }),
  component: TemplatesPage,
});

const CHANNEL_ICON: Record<CommChannel, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  NOTIFICATION: Bell,
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

function TemplatesPage() {
  const t = useT();
  const { role } = useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CommTemplate[]>([]);

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplates({ data: {} }),
    enabled: role === "admin",
    retry: false,
  });
  useEffect(() => {
    if (templatesQuery.data) setRows((templatesQuery.data.results ?? []).map(toCommTemplate));
  }, [templatesQuery.data]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => !search || `${r.type} ${r.channel}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  async function toggleEnabled(id: string) {
    const cur = rows.find((r) => r.id === id);
    if (!cur) return;
    const next = !cur.is_enabled;
    try {
      await updateTemplate({ data: { id: Number(id), body: { is_enabled: next } } });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, is_enabled: next } : r)));
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(
        next ? t("content.templates.enabledToast") : t("content.templates.disabledToast"),
      );
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  const columns: Column<CommTemplate>[] = [
    {
      id: "type",
      header: t("content.templates.colType"),
      sortValue: (r) => r.type,
      cell: (r) => <span className="font-medium">{r.type.replace(/_/g, " ")}</span>,
    },
    {
      id: "channel",
      header: t("content.templates.colChannel"),
      cell: (r) => {
        const Icon = CHANNEL_ICON[r.channel];
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-[10px] uppercase">
              {t(`content.templates.channel${r.channel}`)}
            </Badge>
          </span>
        );
      },
    },
    {
      id: "enabled",
      header: t("content.templates.colEnabled"),
      cell: (r) =>
        r.is_enabled ? (
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success text-[10px]"
          >
            {t("content.templates.enabled")}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {t("content.templates.disabled")}
          </Badge>
        ),
    },
    {
      id: "translations",
      header: t("content.templates.colTranslations"),
      align: "center",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {t("content.templates.translationsCount", { n: r.translations.length })}
        </span>
      ),
    },
    {
      id: "edited",
      header: t("content.templates.colEdited"),
      sortValue: (r) => r.last_edited,
      cell: (r) => <span className="text-xs text-muted-foreground">{r.last_edited}</span>,
    },
  ];

  function rowActions(r: CommTemplate) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-60 group-hover:opacity-100"
            aria-label="Row actions"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <TemplateEditorDialog
            template={r}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="me-2 h-4 w-4" /> {t("content.templates.edit")}
              </DropdownMenuItem>
            }
          />
          <SendTestDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Send className="me-2 h-4 w-4" /> {t("content.templates.sendTest")}
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem onSelect={() => toggleEnabled(r.id)}>
            {t("content.templates.toggleEnabled")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (role !== "admin") {
    return (
      <>
        <PageHeader
          title={t("content.templates.title")}
          description={t("content.templates.subtitle")}
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
        title={t("content.templates.title")}
        description={t("content.templates.subtitle")}
        actions={
          <TemplateEditorDialog
            trigger={
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Plus className="me-1.5 h-4 w-4" /> {t("content.templates.newTemplate")}
              </Button>
            }
          />
        }
      />
      <div className="p-6 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("content.templates.kpiTotal")}
            value={rows.length}
            icon={<Megaphone className="h-5 w-5" />}
            accent
          />
          <KpiCard
            label={t("content.templates.kpiEnabled")}
            value={rows.filter((r) => r.is_enabled).length}
          />
          <KpiCard
            label={t("content.templates.kpiEmail")}
            value={rows.filter((r) => r.channel === "EMAIL").length}
            icon={<Mail className="h-5 w-5" />}
          />
          <KpiCard
            label={t("content.templates.kpiSms")}
            value={rows.filter((r) => r.channel === "SMS").length}
            icon={<MessageSquare className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            placeholder={t("content.templates.searchPlaceholder")}
            count={filtered.length}
            countLabel={t("content.templates.countLabel")}
          />
          <PageStates
            state="populated"
            empty={
              <EmptyState
                title={t("content.templates.emptyTitle")}
                description={t("content.templates.emptyDesc")}
                icon={<Megaphone className="h-6 w-6" />}
              />
            }
          >
            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(r) => r.id}
              rowActions={rowActions}
            />
          </PageStates>
        </div>
      </div>
    </>
  );
}

// ─── Editor dialog (type / channel / is_enabled + translations) ──
const editorSchema = z.object({
  type: z.string().min(1),
  channel: z.enum(["NOTIFICATION", "EMAIL", "SMS"]),
  is_enabled: z.boolean(),
  title_en: z.string(),
  content_en: z.string(),
  title_ar: z.string(),
  content_ar: z.string(),
});
type EditorValues = z.infer<typeof editorSchema>;

function TemplateEditorDialog({
  template,
  trigger,
}: {
  template?: CommTemplate;
  trigger: React.ReactNode;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const en = template?.translations.find((x) => x.lang === "en");
  const ar = template?.translations.find((x) => x.lang === "ar");
  const enRef = useRef<HTMLTextAreaElement>(null);
  const arRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      type: template?.type ?? "ORDER_PLACED",
      channel: template?.channel ?? "EMAIL",
      is_enabled: template?.is_enabled ?? true,
      title_en: en?.title ?? "",
      content_en: en?.content ?? "",
      title_ar: ar?.title ?? "",
      content_ar: ar?.content ?? "",
    },
  });
  const { register, handleSubmit, setValue, watch } = form;

  function insertVar(lang: "en" | "ar", v: string) {
    const ref = lang === "en" ? enRef : arRef;
    const name = `content_${lang}` as const;
    const cur = watch(name);
    const el = ref.current;
    const pos = el?.selectionStart ?? cur.length;
    setValue(name, cur.slice(0, pos) + `{${v}}` + cur.slice(pos));
    toast.success(t("content.templates.variableInserted"));
  }

  async function onSubmit(values: EditorValues) {
    const translations = [
      { language_code: "en", title: values.title_en, content: values.content_en },
      { language_code: "ar", title: values.title_ar, content: values.content_ar },
    ].filter((tr) => tr.title.trim() !== "" || tr.content.trim() !== "");
    const body = {
      type: values.type,
      channel: values.channel,
      is_enabled: values.is_enabled,
      translations,
    };
    try {
      if (template) {
        await updateTemplate({ data: { id: Number(template.id), body } });
      } else {
        await createTemplate({ data: body });
      }
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(t("content.templates.saved"));
      setOpen(false);
    } catch (err) {
      toast.error(parseServerError(err).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("content.templates.editorTitle")}</DialogTitle>
          <DialogDescription>{t("content.templates.editorDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("content.templates.fType")}
              </Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {ty.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("content.templates.fChannel")}
              </Label>
              <Select
                value={watch("channel")}
                onValueChange={(v) => setValue("channel", v as CommChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMM_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`content.templates.channel${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
            {t("content.templates.fEnabled")}
            <Switch
              checked={watch("is_enabled")}
              onCheckedChange={(v) => setValue("is_enabled", !!v)}
            />
          </label>

          <Tabs defaultValue="en">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="en">{t("content.langEn")}</TabsTrigger>
              <TabsTrigger value="ar">{t("content.langAr")}</TabsTrigger>
            </TabsList>
            {(["en", "ar"] as const).map((l) => (
              <TabsContent key={l} value={l} className="mt-4 space-y-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("content.templates.fTitle")}
                  </Label>
                  <Input dir={l === "ar" ? "rtl" : "ltr"} {...register(`title_${l}` as const)} />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("content.templates.fContent")}
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="outline" className="h-7 gap-1">
                          {t("content.templates.insertVariable")}{" "}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                        {COMM_PLACEHOLDERS.map((p) => (
                          <DropdownMenuItem key={p} onSelect={() => insertVar(l, p)}>
                            <code className="font-mono text-xs">{`{${p}}`}</code>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Textarea
                    ref={l === "en" ? enRef : arRef}
                    rows={5}
                    dir={l === "ar" ? "rtl" : "ltr"}
                    placeholder={t("content.templates.contentPlaceholder")}
                    value={watch(`content_${l}` as const)}
                    onChange={(e) => setValue(`content_${l}` as const, e.target.value)}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter>
            <SendTestDialog
              trigger={
                <Button type="button" variant="outline">
                  <Send className="me-1.5 h-4 w-4" /> {t("content.templates.sendTest")}
                </Button>
              }
            />
            <Button
              type="submit"
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {t("content.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Send test dialog ────────────────────────────────────────────
const testSchema = z.object({
  target: z
    .string()
    .refine((v) => EMAIL_RE.test(v) || PHONE_RE.test(v.replace(/\s/g, "")), "errTarget"),
});
type TestValues = z.infer<typeof testSchema>;

function SendTestDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TestValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { target: "" },
  });

  function onSubmit() {
    toast.success(t("content.templates.sendTestToast"));
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("content.templates.sendTestTitle")}</DialogTitle>
          <DialogDescription>{t("content.templates.sendTestDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">{t("content.templates.fTarget")}</Label>
            <Input
              dir="ltr"
              placeholder={t("content.templates.targetPlaceholder")}
              {...register("target")}
            />
            {errors.target && (
              <p className="mt-1 text-xs text-destructive">{t("content.templates.errTarget")}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Send className="me-1.5 h-4 w-4" /> {t("content.templates.sendTestSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
