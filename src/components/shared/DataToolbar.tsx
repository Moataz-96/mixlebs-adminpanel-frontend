import type { ReactNode } from "react";
import { Search, SlidersHorizontal, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  count?: number;
  countLabel?: string;
}

export function DataToolbar({
  search,
  onSearch,
  placeholder = "Search…",
  filters,
  actions,
  count,
  countLabel = "results",
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-soft">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search ?? ""}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={placeholder}
          className="h-9 ps-9 border-transparent bg-muted/50 focus-visible:bg-background"
        />
      </div>
      {filters}
      {typeof count === "number" && (
        <span className="hidden whitespace-nowrap px-1 text-xs text-muted-foreground sm:inline">
          {count.toLocaleString()} {countLabel}
        </span>
      )}
      <Button variant="outline" size="sm" className="h-9 gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5" /> View
      </Button>
      <Button variant="outline" size="sm" className="h-9 gap-1.5">
        <Download className="h-3.5 w-3.5" /> Export
      </Button>
      {actions}
    </div>
  );
}
