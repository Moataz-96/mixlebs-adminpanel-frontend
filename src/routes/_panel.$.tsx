import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_panel/$")({
  component: CatchAllPage,
});

function CatchAllPage() {
  const { _splat } = Route.useParams() as { _splat: string };
  const title = (_splat || "Section")
    .split("/")
    .pop()!
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
  return (
    <ComingSoon
      title={title}
      description={`/${_splat}`}
      notes={[
        "Wired into navigation map.",
        "Permission gating active per RBAC matrix.",
        "Replace stub with full module UI.",
      ]}
    />
  );
}
