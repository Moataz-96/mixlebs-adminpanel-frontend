import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Bold, Italic, Heading, List, ListOrdered, Link2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ForbiddenState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/components/shared/Can";
import { useT } from "@/lib/i18n";
import { parseServerError, fieldMessage } from "@/lib/api/error";
import {
  createResource,
  updateResource,
  type ResourceEntry,
} from "@/lib/api/content.functions";

export const Route = createFileRoute("/_panel/help/faq/new")({
  head: () => ({ meta: [{ title: "New FAQ — Mixlebs Admin" }] }),
  component: () => <FaqEditor mode="create" />,
});

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z
  .object({
    slug: z.string().min(1, "errRequired").regex(SLUG_RE, "errSlug"),
    section: z.enum(["FAQ", "Privacy Policy", "Terms", "Article"]),
    content_type: z.enum(["QA", "Article"]),
    order: z.coerce.number().int().min(0),
    title_en: z.string(),
    content_en: z.string(),
    title_ar: z.string(),
    content_ar: z.string(),
  })
  .refine((v) => v.title_en.trim() !== "" || v.title_ar.trim() !== "", {
    message: "errTitleRequired",
    path: ["title_en"],
  });
type Values = z.input<typeof schema>;

export function FaqEditor({ mode, value }: { mode: "create" | "edit"; value?: ResourceEntry }) {
  const t = useT();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canEdit = has("resources.update");

  const en = value?.translations.find((tr) => tr.lang === "en");
  const ar = value?.translations.find((tr) => tr.lang === "ar");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: value?.slug ?? "",
      section: value?.section ?? "FAQ",
      content_type: value?.content_type ?? "QA",
      order: value?.order ?? 10,
      title_en: en?.title ?? "",
      content_en: en?.content ?? "",
      title_ar: ar?.title ?? "",
      content_ar: ar?.content ?? "",
    },
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = form;
  const [preview, setPreview] = useState(false);

  function err(name: keyof Values) {
    const m = errors[name]?.message;
    return m ? t(`content.faqEditor.${m}`) : undefined;
  }

  async function onSubmit(values: Values) {
    // The BE stores section as a free string + content_type QA|ARTICLE + an
    // audience[] + per-language translations. Build that payload from the
    // FROZEN UI form (en/ar title+content collapse into translations[]).
    const translations = [
      { language_code: "en", title: values.title_en, content: values.content_en },
      { language_code: "ar", title: values.title_ar, content: values.content_ar },
    ].filter((tr) => tr.title.trim() !== "" || tr.content.trim() !== "");
    const body = {
      slug: values.slug,
      section: values.section,
      content_type: (values.content_type === "QA" ? "QA" : "ARTICLE") as "QA" | "ARTICLE",
      order: Number(values.order),
      audience: value?.audiences ?? [],
      translations,
    };
    try {
      if (mode === "create") {
        await createResource({ data: body });
        toast.success(t("content.faqEditor.created"));
      } else if (value) {
        await updateResource({ data: { id: Number(value.id), body } });
        toast.success(t("content.faqEditor.saved"));
      }
      navigate({ to: "/help/faq" });
    } catch (err) {
      const info = parseServerError(err);
      const slugErr = fieldMessage(info.fieldErrors, "slug");
      if (slugErr) {
        setError("slug", { message: "slugTaken" });
        toast.error(t("content.faqEditor.slugTaken"));
        return;
      }
      toast.error(info.message);
    }
  }

  if (!canEdit) {
    return (
      <>
        <PageHeader
          title={
            mode === "create" ? t("content.faqEditor.newTitle") : t("content.faqEditor.editTitle")
          }
        />
        <div className="p-6 pt-0">
          <ForbiddenState perms={["resources.update"]} />
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={
          mode === "create" ? t("content.faqEditor.newTitle") : t("content.faqEditor.editTitle")
        }
        description={
          mode === "create" ? t("content.faqEditor.newDesc") : t("content.faqEditor.editDesc")
        }
        actions={
          <>
            <Button type="button" variant="ghost" asChild>
              <Link to="/help/faq">
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t("content.back")}
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="me-1.5 h-4 w-4" />{" "}
              {mode === "create" ? t("content.create") : t("content.save")}
            </Button>
          </>
        }
      />
      <div className="grid gap-6 p-6 pt-0 lg:grid-cols-[1fr_320px]">
        <Card className="border-0 bg-card p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">
              {t("content.faqEditor.translations")}
            </h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={preview} onCheckedChange={setPreview} />
              {t("content.faqEditor.previewToggle")}
            </label>
          </div>

          <Tabs defaultValue="en">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="en">{t("content.langEn")}</TabsTrigger>
              <TabsTrigger value="ar">{t("content.langAr")}</TabsTrigger>
            </TabsList>
            {(["en", "ar"] as const).map((l) => (
              <TabsContent key={l} value={l} className="mt-5 space-y-4">
                <Fld
                  label={t("content.faqEditor.fTitle")}
                  error={l === "en" ? err("title_en") : undefined}
                >
                  <Input
                    dir={l === "ar" ? "rtl" : "ltr"}
                    placeholder={t("content.faqEditor.titlePlaceholder")}
                    {...register(`title_${l}` as const)}
                  />
                </Fld>
                <Fld label={t("content.faqEditor.fContent")}>
                  {preview ? (
                    <div
                      className="min-h-[220px] rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed"
                      dir={l === "ar" ? "rtl" : "ltr"}
                    >
                      {watch(`content_${l}` as const) || (
                        <span className="text-muted-foreground">
                          {t("content.faqEditor.previewEmpty")}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Controller
                      control={control}
                      name={`content_${l}` as const}
                      render={({ field }) => (
                        <RichTextArea
                          value={field.value}
                          onChange={field.onChange}
                          dir={l === "ar" ? "rtl" : "ltr"}
                        />
                      )}
                    />
                  )}
                </Fld>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        <aside className="space-y-6">
          <Card className="border-0 bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-display text-base font-semibold">
              {t("content.faqEditor.fSection")}
            </h3>
            <Fld label={t("content.faqEditor.fSlug")} error={err("slug")}>
              <Input
                dir="ltr"
                placeholder={t("content.faqEditor.slugPlaceholder")}
                className="font-mono"
                {...register("slug")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("content.faqEditor.slugHint")}
              </p>
            </Fld>
            <div className="mt-4">
              <Fld label={t("content.faqEditor.fSection")}>
                <Controller
                  control={control}
                  name="section"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FAQ">{t("content.faqEditor.sectionFAQ")}</SelectItem>
                        <SelectItem value="Privacy Policy">
                          {t("content.faqEditor.sectionPrivacy")}
                        </SelectItem>
                        <SelectItem value="Terms">{t("content.faqEditor.sectionTerms")}</SelectItem>
                        <SelectItem value="Article">
                          {t("content.faqEditor.sectionArticle")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Fld>
            </div>
            <div className="mt-4">
              <Fld label={t("content.faqEditor.fContentType")}>
                <Controller
                  control={control}
                  name="content_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QA">{t("content.faqEditor.typeQA")}</SelectItem>
                        <SelectItem value="Article">
                          {t("content.faqEditor.typeArticle")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Fld>
            </div>
            <div className="mt-4">
              <Fld label={t("content.faqEditor.fOrder")}>
                <Input type="number" dir="ltr" {...register("order")} />
              </Fld>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function RichTextArea({
  value,
  onChange,
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  dir: "ltr" | "rtl";
}) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = before) {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart,
      e = el.selectionEnd;
    const sel = value.slice(s, e);
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
  }
  function prefix(p: string) {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    onChange(value.slice(0, lineStart) + p + value.slice(lineStart));
  }

  const tools: { icon: typeof Bold; label: string; run: () => void }[] = [
    { icon: Bold, label: t("content.faqEditor.tbBold"), run: () => wrap("**") },
    { icon: Italic, label: t("content.faqEditor.tbItalic"), run: () => wrap("_") },
    { icon: Heading, label: t("content.faqEditor.tbHeading"), run: () => prefix("## ") },
    { icon: List, label: t("content.faqEditor.tbBulletList"), run: () => prefix("- ") },
    { icon: ListOrdered, label: t("content.faqEditor.tbNumberList"), run: () => prefix("1. ") },
    { icon: Link2, label: t("content.faqEditor.tbLink"), run: () => wrap("[", "](https://)") },
  ];

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center gap-0.5 border-b bg-muted/40 p-1">
        {tools.map((tool, i) => (
          <Button
            key={i}
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={tool.run}
            aria-label={tool.label}
            title={tool.label}
          >
            <tool.icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
      <Textarea
        ref={ref}
        rows={10}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("content.faqEditor.contentPlaceholder")}
        className="rounded-none border-0 focus-visible:ring-0"
      />
    </div>
  );
}

function Fld({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
