import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/404")({
  head: () => ({ meta: [{ title: "Not found — Mixlebs Admin" }] }),
  component: NotFound,
});

function NotFound() {
  const t = useT();
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">{t("errors.notFound.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.notFound.desc")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => router.history.back()}>
            {t("errors.notFound.goBack")}
          </Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/dashboard">{t("errors.notFound.goDashboard")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
