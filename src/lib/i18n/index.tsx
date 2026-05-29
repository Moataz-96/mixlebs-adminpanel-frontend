import { useCallback } from "react";
import { useApp } from "@/lib/app-context";
import { messages, lookup, type Dict } from "./messages";

export type TFunction = (
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
) => string;

function interpolate(value: string, vars?: Record<string, string | number>): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Translation hook bound to the active locale (from AppProvider).
 *
 *   const t = useT();
 *   t("products.title")                       → "Products"
 *   t("orders.count", { n: 12 })              → "12 orders"
 *   t("missing.key", undefined, "Fallback")   → "Fallback"
 *
 * Resolution order: active locale → English → explicit fallback → the key.
 */
export function useT(): TFunction {
  const { locale } = useApp();
  return useCallback<TFunction>(
    (key, vars, fallback) => {
      const dict: Dict = messages[locale] ?? messages.en;
      const val = lookup(dict, key) ?? lookup(messages.en, key) ?? fallback ?? key;
      return interpolate(val, vars);
    },
    [locale],
  );
}

export { messages } from "./messages";
