import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  accent?: boolean;
}

export function KpiCard({ label, value, delta, trend = "flat", icon, accent }: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition hover:shadow-elevated",
        accent && "bg-gradient-primary text-primary-foreground border-transparent shadow-glow",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-xs uppercase tracking-[0.14em]",
              accent ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
          {delta && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                accent
                  ? "text-primary-foreground/80"
                  : trend === "up"
                    ? "text-success"
                    : trend === "down"
                      ? "text-destructive"
                      : "text-muted-foreground",
              )}
            >
              {trend === "up" && "▲ "}
              {trend === "down" && "▼ "}
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl",
              accent ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {!accent && (
        <div className="pointer-events-none absolute -end-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-primary opacity-[0.06] blur-2xl" />
      )}
    </div>
  );
}
