import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "start" | "end" | "center";
  className?: string;
  headClassName?: string;
  width?: string;
}

export interface BulkAction {
  label: ReactNode;
  onClick: (ids: string[]) => void;
  destructive?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** Enables the checkbox column + sticky bulk bar. */
  bulkActions?: BulkAction[];
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  /** Hide the pagination footer (e.g. tiny static lists). */
  paginate?: boolean;
  emptyState?: ReactNode;
}

const ALIGN: Record<string, string> = {
  start: "text-start",
  end: "text-end",
  center: "text-center",
};
const PAGE_SIZES = [10, 20, 50, 100];

/**
 * Generic, design-system-matched data table: sortable headers, row selection
 * with a sticky bulk-action bar, and a "Showing X–Y of Z" pagination footer
 * with per-page selector and jump-to-page. Built on the shadcn primitives so
 * it inherits the panel's look without a new dependency.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  bulkActions,
  rowActions,
  onRowClick,
  pageSize = 20,
  paginate = true,
  emptyState,
}: DataTableProps<T>) {
  const t = useT();
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return data;
    const arr = [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sort.dir === "desc" ? arr.reverse() : arr;
  }, [data, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * size;
  const rows = paginate ? sorted.slice(start, start + size) : sorted;

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const allOnPage = rows.length > 0 && rows.every((r) => selected[getRowId(r)]);

  function toggleSort(id: string) {
    setSort((s) =>
      s?.id === id ? { id, dir: s.dir === "asc" ? "desc" : "asc" } : { id, dir: "asc" },
    );
  }

  const colSpan = columns.length + (bulkActions ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <div>
      {bulkActions && selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-medium">{t("common.selected", { n: selectedIds.length })}</span>
          <span className="text-muted-foreground">·</span>
          {bulkActions.map((a, i) => (
            <Button
              key={i}
              size="sm"
              variant="ghost"
              className={cn("h-7", a.destructive && "text-destructive")}
              onClick={() => a.onClick(selectedIds)}
            >
              {a.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="ms-auto h-7" onClick={() => setSelected({})}>
            {t("common.clear")}
          </Button>
        </div>
      )}

      <Card className="overflow-hidden border-0 shadow-soft">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {bulkActions && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPage}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const next = { ...prev };
                          rows.forEach((r) => (next[getRowId(r)] = !!v));
                          return next;
                        });
                      }}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                )}
                {columns.map((c) => (
                  <TableHead
                    key={c.id}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(ALIGN[c.align ?? "start"], c.headClassName)}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.id)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {c.header}
                        {sort?.id === c.id ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                ))}
                {rowActions && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-32 p-0">
                    {emptyState ?? (
                      <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                        {t("table.noResults")}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const id = getRowId(row);
                  return (
                    <TableRow
                      key={id}
                      className={cn("group", onRowClick && "cursor-pointer")}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {bulkActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={!!selected[id]}
                            onCheckedChange={(v) => setSelected((s) => ({ ...s, [id]: !!v }))}
                            aria-label="Select row"
                          />
                        </TableCell>
                      )}
                      {columns.map((c) => (
                        <TableCell
                          key={c.id}
                          className={cn(ALIGN[c.align ?? "start"], c.className)}
                        >
                          {c.cell(row)}
                        </TableCell>
                      ))}
                      {rowActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {rowActions(row)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {paginate && total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {t("table.showing", { from: start + 1, to: Math.min(start + size, total), total })}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">{t("table.perPage")}</span>
            <Select
              value={String(size)}
              onValueChange={(v) => {
                setSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              aria-label={t("table.prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              {t("table.page")} {current} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
              aria-label={t("table.next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
