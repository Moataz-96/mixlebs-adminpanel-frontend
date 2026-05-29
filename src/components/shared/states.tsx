import type { ReactNode } from "react";
import { AlertTriangle, Lock, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { useT } from "@/lib/i18n";

/** Skeleton rows for a list/table while loading (default 5 rows). */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card className="overflow-hidden border-0 shadow-soft">
      <div className="border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={c === 0 ? "h-9 w-9 rounded-lg" : "h-4 flex-1"} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** KPI / card grid skeleton. */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-0 p-5 shadow-soft">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}

export function ErrorState({
  requestId,
  errorType,
  message,
}: {
  requestId?: string;
  errorType?: string;
  message?: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background text-destructive shadow-soft">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{t("states.errorTitle")}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {message ?? t("states.errorDesc")}
      </p>
      <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>
        {t("common.retry")}
      </Button>
      {(requestId || errorType) && (
        <details className="mt-5 w-full max-w-sm text-start">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            {t("states.technicalDetails")}
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/60 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify({ request_id: requestId, error_type: errorType }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function ForbiddenState({ perms }: { perms?: string[] }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background text-warning shadow-soft">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{t("states.forbiddenTitle")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("states.forbiddenDesc")}</p>
      {perms && perms.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {perms.map((p) => (
            <code key={p} className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {p}
            </code>
          ))}
        </div>
      )}
      <Button className="mt-5" asChild>
        <a href="/dashboard">{t("states.goDashboard")}</a>
      </Button>
    </div>
  );
}

export function NotFoundState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-background text-muted-foreground shadow-soft">
        <SearchX className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{t("states.notFoundTitle")}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("states.notFoundDesc")}</p>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          {t("states.goBack")}
        </Button>
        <Button asChild>
          <a href="/dashboard">{t("states.goDashboard")}</a>
        </Button>
      </div>
    </div>
  );
}

export { EmptyState };

/**
 * Renders the right placeholder for the current page state, otherwise children.
 * Drive `state` from `usePageState()` so the `?state=` previewer works in dev.
 */
export function PageStates({
  state,
  children,
  empty,
  skeleton,
  missingPerms,
}: {
  state: string;
  children: ReactNode;
  empty?: ReactNode;
  skeleton?: ReactNode;
  missingPerms?: string[];
}) {
  if (state === "loading") return <>{skeleton ?? <TableSkeleton />}</>;
  if (state === "empty") return <>{empty ?? <EmptyState />}</>;
  if (state === "error") return <ErrorState requestId="req_demo_001" errorType="server_error" />;
  if (state === "forbidden") return <ForbiddenState perms={missingPerms} />;
  if (state === "notfound") return <NotFoundState />;
  return <>{children}</>;
}
