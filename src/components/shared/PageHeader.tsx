import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const crumbs = breadcrumb ?? deriveCrumbs(pathname);

  return (
    <div className="relative mb-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-surface" />
      <div className="relative">
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <a href="/dashboard" className="flex items-center gap-1 hover:text-foreground">
            <Home className="h-3 w-3" /> Home
          </a>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {c.to ? (
                <a href={c.to} className="hover:text-foreground">
                  {c.label}
                </a>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

function deriveCrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    label: p.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
    to: i === parts.length - 1 ? undefined : "/" + parts.slice(0, i + 1).join("/"),
  }));
}
