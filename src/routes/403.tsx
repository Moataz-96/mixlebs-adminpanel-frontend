import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { useT } from "@/lib/i18n";

type ForbiddenSearch = { perms?: string };

export const Route = createFileRoute("/403")({
  head: () => ({ meta: [{ title: "Forbidden — Mixlebs Admin" }] }),
  validateSearch: (search: Record<string, unknown>): ForbiddenSearch => ({
    perms: typeof search.perms === "string" ? search.perms : undefined,
  }),
  component: Forbidden,
});

function Forbidden() {
  const t = useT();
  const { signOut } = useApp();
  const navigate = useNavigate();
  const { perms } = Route.useSearch();
  const missing = (perms ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldOff className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">{t("errors.forbidden.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.forbidden.desc")}</p>
        {missing.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("errors.forbidden.missing")}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {missing.map((p) => (
                <code key={p} className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                  {p}
                </code>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/dashboard">{t("errors.forbidden.goDashboard")}</Link>
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            {t("errors.forbidden.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
