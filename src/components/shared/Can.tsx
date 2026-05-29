import type { ReactNode } from "react";
import { useApp, can, type Role } from "@/lib/app-context";

export interface Permissions {
  has: (perm: string) => boolean;
  hasAny: (perms: string[]) => boolean;
  hasAll: (perms: string[]) => boolean;
  role: Role;
}

/**
 * Effective-permission hook. Mirrors the server `HasResourceActionPermission`
 * rule so gated UI never flashes then disappears. In the wired build this will
 * read the effective set from `/auth/me`; today it derives from the demo role.
 */
export function usePermissions(): Permissions {
  const { role } = useApp();
  return {
    has: (perm) => can(role, perm),
    hasAny: (perms) => perms.some((p) => can(role, p)),
    hasAll: (perms) => perms.every((p) => can(role, p)),
    role,
  };
}

interface CanProps {
  /** Full "resource.action" string. */
  perm?: string;
  /** Or split form. */
  resource?: string;
  action?: string;
  /** Passes if the user has ANY of these. */
  anyOf?: string[];
  children: ReactNode;
  /** Rendered instead when the gate denies. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Wrap any gated element. Hidden entirely (or replaced by `fallback`) when the
 * current user lacks the permission.
 *
 *   <Can perm="products.create"><Button>New product</Button></Can>
 *   <Can resource="orders" action="cancel">…</Can>
 *   <Can anyOf={["dashboard.view_own", "dashboard.view_all_stores"]}>…</Can>
 */
export function Can({ perm, resource, action, anyOf, children, fallback = null }: CanProps) {
  const { has, hasAny } = usePermissions();
  const single = perm ?? (resource && action ? `${resource}.${action}` : undefined);

  let allowed = true;
  if (anyOf && anyOf.length) allowed = hasAny(anyOf);
  else if (single) allowed = has(single);

  return <>{allowed ? children : fallback}</>;
}
