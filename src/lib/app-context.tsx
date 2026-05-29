import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { me, logout } from "@/lib/api/auth.functions";

export type Role = "admin" | "staff" | "store";
export type Theme = "light" | "dark";
export type Locale = "en" | "ar";

export interface Store {
  id: string;
  name: string;
  logo: string;
  status: "Verified" | "Pending" | "Unverified" | "Blocked";
}

export type StoreStatus = "Verified" | "Pending" | "Unverified" | "Blocked";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  currentStoreId: string | null;
  setCurrentStoreId: (id: string | null) => void;
  stores: Store[];
  /** True once GET /auth/me succeeds. Drives route guards. */
  isAuthed: boolean;
  /** True while the initial /auth/me probe is still in flight (avoids a premature /login bounce). */
  authLoading: boolean;
  /** Refetch /auth/me after the login/register server fn has set the cookies. */
  signIn: () => void;
  /** Revoke + clear cookies server-side, then drop the cached /auth/me. */
  signOut: () => void;
}

const AppContext = createContext<AppState | null>(null);

export const DEMO_STORES: Store[] = [
  { id: "str_01", name: "Beirut Pantry", logo: "BP", status: "Verified" },
  { id: "str_02", name: "Saida Sweets", logo: "SS", status: "Verified" },
  { id: "str_03", name: "Tripoli Spices", logo: "TS", status: "Pending" },
  { id: "str_04", name: "Cedar Goods Co.", logo: "CG", status: "Verified" },
  { id: "str_05", name: "Zahle Olive Press", logo: "ZO", status: "Unverified" },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [locale, setLocaleState] = useState<Locale>("en");
  const [currentStoreId, setCurrentStoreId] = useState<string | null>("str_01");

  // Real auth state: GET /api/admin/v1/auth/me/ via the server fn. A 401 (no /
  // expired cookies) rejects the query, so `isAuthed` is false and route guards
  // bounce to /login. The cookies are HttpOnly — no token ever touches JS.
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const isAuthed = !!meQuery.data && !meQuery.isError;
  const authLoading = meQuery.isPending;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t =
      (localStorage.getItem("mx.theme") as Theme) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const l = (localStorage.getItem("mx.locale") as Locale) || "en";
    const r = (localStorage.getItem("mx.role") as Role) || "admin";
    setThemeState(t);
    setLocaleState(l);
    setRole(r);
  }, []);

  // The login/register server fn has already set the auth cookies; refetch /me.
  const signIn = () => {
    void queryClient.invalidateQueries({ queryKey: ["me"] });
  };
  // Revoke + clear cookies server-side, then drop the cached /me so guards fire.
  const signOut = () => {
    void logout()
      .catch(() => undefined)
      .finally(() => {
        queryClient.setQueryData(["me"], null);
        void queryClient.invalidateQueries({ queryKey: ["me"] });
      });
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    if (typeof window !== "undefined") {
      localStorage.setItem("mx.theme", theme);
      localStorage.setItem("mx.locale", locale);
      localStorage.setItem("mx.role", role);
    }
  }, [theme, locale, role]);

  const value = useMemo<AppState>(
    () => ({
      role,
      setRole,
      theme,
      setTheme: setThemeState,
      locale,
      setLocale: setLocaleState,
      currentStoreId,
      setCurrentStoreId,
      stores: DEMO_STORES,
      isAuthed,
      authLoading,
      signIn,
      signOut,
    }),
    [role, theme, locale, currentStoreId, isAuthed, authLoading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// Permission helpers — see spec section 2.
const STORE_DENIED = new Set([
  "categories.update",
  "properties.update",
  "collections.create_platform",
  "coupons.create_platform",
  "couriers.update",
  "stores.review_identity",
  "stores.transition_status",
  "users.reset_password",
  "users.create_staff",
  "users.assign_role",
  "users.assign_user_policy",
  "customers.view",
  "customers.block_returns",
  "search_history.view",
  "locations.update",
  "roles.view",
  "role_policies.view",
  "user_policies.view",
  "permissions.view",
  "permission_resources.view",
  "resources.update",
  "notifications.send",
  "notifications.send_broadcast",
  "templates.view",
  "chat.support_inbox_view",
  "audit_log.view",
  "feedback.view",
  "wallet.view_any",
  "dashboard.view_all_stores",
]);

const STAFF_DENIED = new Set([
  "users.assign_role",
  "users.assign_user_policy",
  "roles.view",
  "role_policies.view",
  "user_policies.view",
  "permissions.view",
  "permission_resources.view",
  "templates.view",
  "notifications.send_broadcast",
]);

export function can(role: Role, perm: string): boolean {
  if (role === "admin") return true;
  if (role === "store") return !STORE_DENIED.has(perm);
  if (role === "staff") return !STAFF_DENIED.has(perm);
  return false;
}
