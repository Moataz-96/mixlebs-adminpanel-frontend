import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  FolderTree,
  GripVertical,
  Undo2,
  RotateCcw,
  Eye,
  EyeOff,
  X,
  ImagePlus,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePermissions } from "@/components/shared/Can";
import { PageStates } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { usePageState } from "@/lib/page-state";
import { parseServerError } from "@/lib/api/error";
import {
  listCategories,
  updateCategory,
  createCategory,
  listProperties,
  listCategoryProperties,
  listCategoryPropertyLogs,
  type CategoryItem,
  type CategoryPropertyItem,
  type CategoryPropertyLogItem,
  type PropertyItem,
  type Page,
} from "@/lib/api/catalog.functions";

// Tree-node shape the §7.6 screen consumes (was mock/catalog CategoryNode).
interface CategoryNode {
  id: string;
  parent_id: string | null;
  identifier: string;
  name: string;
  products: number;
  is_published: boolean;
  returns: boolean;
  translations: { lang: string; name: string; description: string }[];
  properties: {
    id: string;
    property: string;
    is_required: boolean;
    is_characteristic: boolean;
    characteristic_order: number;
  }[];
}

// ENTRY 021: the property-suggestion log is now sourced from the BE
// (categories/{id}/property-logs/). Row shape the detail pane renders.
interface SuggestionLogRow {
  id: string;
  property: string;
  suggested_by: string;
  at: string;
}
function mapSuggestionLog(l: CategoryPropertyLogItem): SuggestionLogRow {
  return {
    id: String(l.id),
    property: l.property_key,
    suggested_by: l.user_name ?? l.user_email ?? "—",
    at: l.created_at ? l.created_at.slice(0, 10) : "",
  };
}

function unpage<T>(p: Page<T> | T[] | undefined): T[] {
  if (!p) return [];
  return Array.isArray(p) ? p : p.results;
}
function mapCategory(c: CategoryItem): CategoryNode {
  return {
    id: String(c.id),
    parent_id: c.parent != null ? String(c.parent) : null,
    identifier: c.identifier,
    name: c.name,
    products: 0,
    is_published: c.is_published,
    returns: c.returns,
    translations: (c.translations ?? []).map((tr) => ({
      lang: tr.language_code,
      name: tr.name,
      description: tr.description,
    })),
    // category-properties are loaded lazily per-node in the detail pane; the
    // tree itself does not need them.
    properties: [],
  };
}

export const Route = createFileRoute("/_panel/categories")({
  head: () => ({ meta: [{ title: "Categories — Mixlebs Admin" }] }),
  component: CategoriesPage,
});

const LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

function CategoriesPage() {
  const t = useT();
  const state = usePageState();
  const { has } = usePermissions();
  const canEdit = has("categories.update");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createCategory({
        data: { identifier: `category-${Date.now()}`, is_published: false, returns: false },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(t("catalog.categories.saved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ data: { page_size: 200 } }),
    staleTime: 60 * 1000,
  });
  const nodes = useMemo<CategoryNode[]>(
    () => (categoriesQuery.data?.results ?? []).map(mapCategory),
    [categoriesQuery.data],
  );
  const roots = useMemo(() => nodes.filter((n) => !n.parent_id), [nodes]);
  const childrenOf = (id: string) => nodes.filter((n) => n.parent_id === id);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(roots.map((r) => [r.id, true])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Once the live tree resolves, default the selection + expand roots (the
  // useState initializers ran before the query returned).
  useEffect(() => {
    if (selectedId === null && roots[0]?.id) {
      setSelectedId(roots[0].id);
      setExpanded((e) => ({ ...e, ...Object.fromEntries(roots.map((r) => [r.id, true])) }));
    }
  }, [roots, selectedId]);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  function setAll(open: boolean) {
    setExpanded(Object.fromEntries(nodes.map((n) => [n.id, open])));
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t("catalog.categories.title")}
        description={t("catalog.categories.desc")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAll(true)}>
              {t("catalog.categories.expandAll")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll(false)}>
              {t("catalog.categories.collapseAll")}
            </Button>
            {canEdit && (
              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                <Plus className="me-1.5 h-4 w-4" /> {t("catalog.categories.newTopLevel")}
              </Button>
            )}
          </div>
        }
      />

      <PageStates
        state={state}
        skeleton={
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Card className="h-80 border-0 shadow-soft" />
            <Card className="h-80 border-0 shadow-soft" />
          </div>
        }
        missingPerms={["categories.view"]}
      >
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* LEFT — tree */}
          <Card className="border-0 p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">
                {t("catalog.categories.treeTitle")}
              </h3>
              {!canEdit && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Lock className="h-3 w-3" /> {t("catalog.categories.readOnlyBadge")}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              {roots.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  childrenOf={childrenOf}
                  expanded={expanded}
                  onToggle={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  canEdit={canEdit}
                  depth={0}
                />
              ))}
            </div>
          </Card>

          {/* RIGHT — detail */}
          {selected ? (
            <CategoryDetail key={selected.id} node={selected} nodes={nodes} canEdit={canEdit} />
          ) : (
            <Card className="grid place-items-center border-0 p-10 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">{t("catalog.categories.selectHint")}</p>
            </Card>
          )}
        </div>
      </PageStates>
    </div>
  );
}

function TreeNode({
  node,
  childrenOf,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  canEdit,
  depth,
}: {
  node: CategoryNode;
  childrenOf: (id: string) => CategoryNode[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canEdit: boolean;
  depth: number;
}) {
  const kids = childrenOf(node.id);
  const open = expanded[node.id];
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => e.key === "Enter" && onSelect(node.id)}
        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition ${isSelected ? "bg-primary/10" : "hover:bg-muted/60"}`}
        style={{ marginInlineStart: depth * 16 }}
      >
        {kids.length > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="text-muted-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {canEdit && (
          <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
        )}
        <FolderTree className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">{node.name}</span>
          <span className="ms-2 font-mono text-[10px] text-muted-foreground">
            {node.identifier}
          </span>
        </div>
        {node.returns && <span className="text-[10px] text-info">↩</span>}
        {node.is_published ? (
          <Eye className="h-3.5 w-3.5 text-success" aria-label="Published" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Unpublished" />
        )}
      </div>
      {open &&
        kids.map((k) => (
          <TreeNode
            key={k.id}
            node={k}
            childrenOf={childrenOf}
            expanded={expanded}
            onToggle={onToggle}
            selectedId={selectedId}
            onSelect={onSelect}
            canEdit={canEdit}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

function CategoryDetail({
  node,
  nodes,
  canEdit,
}: {
  node: CategoryNode;
  nodes: CategoryNode[];
  canEdit: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [returns, setReturns] = useState(node.returns);
  const [published, setPublished] = useState(node.is_published);
  const parentOptions = nodes.filter((c) => c.id !== node.id);
  const fieldDisabled = !canEdit;

  // Category-properties for this node (nested endpoint). Falls back to [] until
  // it resolves; add/remove stay local (full nested CRUD is light here).
  const propsQuery = useQuery({
    queryKey: ["categories", node.id, "properties"],
    queryFn: () => listCategoryProperties({ data: { categoryId: Number(node.id) } }),
    staleTime: 30 * 1000,
  });
  const allPropsQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => listProperties(),
    staleTime: 60 * 1000,
  });
  // ENTRY 021: the property-suggestion log for this category.
  const logsQuery = useQuery({
    queryKey: ["categories", node.id, "property-logs"],
    queryFn: () => listCategoryPropertyLogs({ data: { categoryId: Number(node.id) } }),
    staleTime: 30 * 1000,
  });
  const suggestionLog = useMemo<SuggestionLogRow[]>(
    () => unpage<CategoryPropertyLogItem>(logsQuery.data).map(mapSuggestionLog),
    [logsQuery.data],
  );
  const [props, setProps] = useState(node.properties);
  useEffect(() => {
    const live = unpage<CategoryPropertyItem>(propsQuery.data).map((cp) => ({
      id: String(cp.id),
      property: String(cp.property_key ?? cp.property),
      is_required: !!cp.is_required,
      is_characteristic: !!cp.is_characteristic,
      characteristic_order: Number(cp.characteristic_order ?? 0),
    }));
    if (live.length) setProps(live);
  }, [propsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCategory({
        data: { id: Number(node.id), body: { returns, is_published: published } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(t("catalog.categories.saved"));
    },
    onError: (err) => toast.error(parseServerError(err).message),
  });

  function addProperty() {
    const available = unpage<PropertyItem>(allPropsQuery.data);
    const free = available.find((p) => !props.some((x) => x.property === p.key));
    if (!free) return;
    setProps((ps) => [
      ...ps,
      {
        id: `cp_new_${ps.length}`,
        property: free.key,
        is_required: false,
        is_characteristic: false,
        characteristic_order: ps.length + 1,
      },
    ]);
  }

  return (
    <Card className="border-0 p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">
          {t("catalog.categories.detailTitle")}
        </h3>
        {canEdit ? (
          <Button
            size="sm"
            className="bg-gradient-primary text-primary-foreground"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t("common.save")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("catalog.categories.readOnlyHint")}
          </span>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Fld label={t("catalog.categories.fParent")}>
          <Select defaultValue={node.parent_id ?? "none"} disabled={fieldDisabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("catalog.categories.parentNone")}</SelectItem>
              {parentOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Fld>
        <Fld
          label={t("catalog.categories.fIdentifier")}
          hint={t("catalog.categories.identifierHint")}
        >
          <Input
            dir="ltr"
            className="font-mono"
            defaultValue={node.identifier}
            disabled={fieldDisabled}
          />
        </Fld>
        <Fld label={t("catalog.categories.fIcon")}>
          <Input dir="ltr" placeholder="asset id" defaultValue="" disabled={fieldDisabled} />
        </Fld>
        <div>
          <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("catalog.categories.fImage")}
          </Label>
          <button
            type="button"
            disabled={fieldDisabled}
            className="grid h-24 w-full place-items-center gap-1 rounded-xl border border-dashed bg-muted/30 text-muted-foreground transition hover:border-primary/40 disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label={t("catalog.categories.fReturns")}
          hint={t("catalog.categories.returnsHint")}
          checked={returns}
          disabled={fieldDisabled}
          onChange={setReturns}
        />
        <ToggleRow
          label={t("catalog.categories.fPublished")}
          checked={published}
          disabled={fieldDisabled}
          onChange={setPublished}
        />
      </div>

      {/* Translations */}
      <Section title={t("catalog.categories.translations")}>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-start">{LANGS[0].label}</th>
                <th className="p-2 text-start">{t("catalog.categories.tName")}</th>
                <th className="p-2 text-start">{t("catalog.categories.tDescription")}</th>
              </tr>
            </thead>
            <tbody>
              {LANGS.map((l) => {
                const tr = node.translations.find((x) => x.lang === l.code);
                return (
                  <tr key={l.code} className="border-t">
                    <td className="p-2 align-top font-mono text-xs uppercase text-muted-foreground">
                      {l.code}
                    </td>
                    <td className="p-2">
                      <Input
                        dir={l.code === "ar" ? "rtl" : "ltr"}
                        defaultValue={tr?.name ?? ""}
                        disabled={fieldDisabled}
                        className="h-8"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        dir={l.code === "ar" ? "rtl" : "ltr"}
                        defaultValue={tr?.description ?? ""}
                        disabled={fieldDisabled}
                        className="h-8"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Category properties */}
      <Section
        title={t("catalog.categories.properties")}
        hint={t("catalog.categories.propertiesHint")}
        action={
          canEdit && (
            <Button size="sm" variant="outline" onClick={addProperty}>
              <Plus className="me-1 h-3.5 w-3.5" /> {t("catalog.categories.addProperty")}
            </Button>
          )
        }
      >
        {props.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.none")}</p>
        ) : (
          <div className="space-y-2">
            {props.map((cp) => (
              <div
                key={cp.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-background/40 p-3"
              >
                {canEdit && <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />}
                <span className="min-w-[120px] flex-1 font-medium">{cp.property}</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch defaultChecked={cp.is_required} disabled={fieldDisabled} />{" "}
                  {t("catalog.categories.colRequired")}
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch defaultChecked={cp.is_characteristic} disabled={fieldDisabled} />{" "}
                  {t("catalog.categories.colCharacteristic")}
                </label>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("catalog.categories.colOrder")}
                  </Label>
                  <Input
                    type="number"
                    dir="ltr"
                    defaultValue={cp.characteristic_order}
                    disabled={fieldDisabled}
                    className="h-8 w-16"
                  />
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setProps((ps) => ps.filter((x) => x.id !== cp.id))}
                    aria-label={t("common.remove")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Property suggestion log */}
      <Section
        title={t("catalog.categories.suggestionLog")}
        hint={t("catalog.categories.suggestionLogHint")}
      >
        {suggestionLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("catalog.categories.noSuggestions")}</p>
        ) : (
          <ul className="space-y-1.5">
            {suggestionLog.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
              >
                {s.id.endsWith("1") ? (
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="font-medium">{s.property}</span>
                <span className="text-muted-foreground">· {s.suggested_by}</span>
                <span className="ms-auto font-mono text-xs text-muted-foreground">{s.at}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="font-display text-base font-semibold">{title}</h4>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Fld({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
