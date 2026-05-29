import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance — Mixlebs Admin" }] }),
  component: Maintenance,
});

function Maintenance() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">{t("errors.maintenance.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("errors.maintenance.desc")} {t("errors.maintenance.eta")}
        </p>
        <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">
          {t("errors.maintenance.status")}
        </p>
      </div>
    </div>
  );
}
