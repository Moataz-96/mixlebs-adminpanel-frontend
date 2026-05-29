import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { me, logout } from "@/lib/api/auth.functions";
import { listStores, type AdminStoreListItem } from "@/lib/api/stores.admin.functions";

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

// ---------------------------------------------------------------------------
// Store-picker data source (plan §6.2). The old DEMO_STORES constant is gone —
// the picker is fed live from GET /api/admin/v1/stores/ for STAFF/ADMIN and
// from me.store for a STORE user. The topbar (AppTopbar) + dashboard consume
// `stores` as a Store[] ({ id, name, logo, status }), so the live rows are
// mapped down to that exact shape and the existing currentStoreId /
// setCurrentStoreId API is unchanged. P7 Wire reuses this same `stores` hook.
// ---------------------------------------------------------------------------

// BE StoreStatusEnum → the panel's coarse StoreStatus the StatusBadge expects.
function mapStoreStatus(status: string | null | undefined): StoreStatus {
  switch (status) {
    case "VERIFIED":
      return "Verified";
    case "BLOCKED":
      return "Blocked";
    case "PENDING_VERIFICATION":
    case "PENDING_PAYMENT":
      return "Pending";
    default:
      return "Unverified";
  }
}

// The demo carried a 2-letter monogram as `logo`; derive it from the shop name.
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function mapAdminStore(s: AdminStoreListItem): Store {
  return {
    id: s.id,
    name: s.shop_name,
    logo: monogram(s.shop_name),
    status: mapStoreStatus(s.status),
  };
}

// CustomUser.type → panel Role. STAFF and ADMIN both map to the platform-staff
// surface; STORE is the seller surface. CUSTOMER never reaches the panel.
function roleFromUserType(type: unknown): Role {
  if (type === "STORE") return "store";
  if (type === "STAFF") return "staff";
  return "admin";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [locale, setLocaleState] = useState<Locale>("en");
  // null == "all stores" for STAFF/ADMIN. A STORE user is pinned to their own
  // store id once /auth/me resolves (effect below).
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);

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

  // Live effective permission set + superuser flag from /auth/me. These are the
  // single source of truth for can()/usePermissions() — see plan §6.2. The role
  // is derived from the authenticated user's type so the existing role-based
  // guards keep working with zero JSX changes.
  const permissions = useMemo(() => meQuery.data?.permissions ?? [], [meQuery.data]);
  const isSuperuser = meQuery.data?.user?.is_superuser === true;

  // Live store list driving the topbar / dashboard store-picker. STAFF/ADMIN
  // get the paginated GET /stores/ list; STORE users never see the picker, so
  // their list is just their own store from /auth/me. The query is gated on
  // being authenticated + non-STORE so a STORE/CUSTOMER session never calls it.
  const userType = meQuery.data?.user?.type;
  const isStorePicker = isAuthed && userType !== "STORE";
  const storesQuery = useQuery({
    queryKey: ["stores", "available"],
    queryFn: () => listStores({ data: { page_size: 100, ordering: "rank" } }),
    enabled: isStorePicker,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stores = useMemo<Store[]>(() => {
    if (userType === "STORE") {
      const s = meQuery.data?.store;
      if (s?.id) {
        const name = (s.shop_name as string) ?? "";
        return [{ id: String(s.id), name, logo: monogram(name), status: mapStoreStatus(s.status) }];
      }
      return [];
    }
    return (storesQuery.data?.results ?? []).map(mapAdminStore);
  }, [userType, meQuery.data?.store, storesQuery.data]);

  useEffect(() => {
    // Push the live permission set into the module-scoped holder the exported
    // can() reads, so <Can> / usePermissions() resolve against /auth/me.
    setPermissionContext(permissions, isSuperuser);
  }, [permissions, isSuperuser]);

  useEffect(() => {
    if (meQuery.data?.user?.type) {
      setRole(roleFromUserType(meQuery.data.user.type));
    }
  }, [meQuery.data]);

  // A STORE user can only ever act on their own store — pin the picker to it.
  useEffect(() => {
    if (userType === "STORE" && meQuery.data?.store?.id) {
      setCurrentStoreId(String(meQuery.data.store.id));
    }
  }, [userType, meQuery.data?.store?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t =
      (localStorage.getItem("mx.theme") as Theme) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const l = (localStorage.getItem("mx.locale") as Locale) || "en";
    setThemeState(t);
    setLocaleState(l);
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
      stores,
      isAuthed,
      authLoading,
      signIn,
      signOut,
    }),
    [role, theme, locale, currentStoreId, stores, isAuthed, authLoading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Permission source of truth — the live effective set from GET /auth/me.
//
// AppProvider pushes me.permissions + me.user.is_superuser into this holder via
// setPermissionContext(); the exported can() (consumed by <Can> /
// usePermissions() in components/shared/Can.tsx, unchanged) reads it. A perm is
// granted iff its "resource.action" string is in the live set, with superusers
// bypassing to true. The old static STORE_DENIED / STAFF_DENIED denial lists
// are gone — gating now mirrors the server `HasResourceActionPermission` rule.
// ---------------------------------------------------------------------------

let permissionSet = new Set<string>();
let superuser = false;

function setPermissionContext(perms: string[], isSuperuser: boolean) {
  permissionSet = new Set(perms);
  superuser = isSuperuser;
}

/**
 * True iff `perm` ("resource.action") is in the effective set from /auth/me.
 * Superusers bypass to true. `role` is accepted for signature compatibility
 * with the existing <Can> / usePermissions() callers but is not consulted —
 * the flat permission set is authoritative.
 */
export function can(_role: Role, perm: string): boolean {
  if (superuser) return true;
  return permissionSet.has(perm);
}
