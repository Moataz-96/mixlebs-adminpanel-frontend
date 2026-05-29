import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { Construction } from "lucide-react";
import { EmptyState } from "./EmptyState";

export function ComingSoon({
  title,
  description,
  notes,
  actions,
}: {
  title: string;
  description?: string;
  notes?: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="p-6">
      <PageHeader title={title} description={description} actions={actions} />
      <EmptyState
        title="Screen scaffolded"
        description="This route is wired into the navigation map and the design system. Replace with the production UI when the matching endpoints land."
        icon={<Construction className="h-6 w-6" />}
      />
      {notes && notes.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Spec checklist
          </p>
          <ul className="space-y-2 text-sm">
            {notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
