import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/_panel")({
  component: PanelLayout,
});

function PanelLayout() {
  const { isAuthed, authLoading } = useApp();
  const navigate = useNavigate();

  // Client-side route guard. Every panel route requires an authenticated
  // session (GET /auth/me). A 401 / missing-cookie session bounces to /login.
  // Wait for the initial /me probe so a logged-in user isn't bounced mid-fetch.
  useEffect(() => {
    if (!authLoading && !isAuthed) {
      const next = encodeURIComponent(window.location.pathname);
      navigate({ to: "/login", search: { next } as never, replace: true });
    }
  }, [isAuthed, authLoading, navigate]);

  if (authLoading || !isAuthed) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
