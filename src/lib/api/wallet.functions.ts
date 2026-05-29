// Wallet server functions for Phase 6 (FE §9.6). Read-only: summary + paginated
// transactions, with date-range + type + label filters.
//
// Each .handler body runs SERVER-ONLY; _client.ts returns the unwrapped DRF
// `data`. Field names mirror adminpanel_promotions.serializers WalletSummary /
// WalletTransaction exactly. Money fields are STRINGS (DRF DecimalField).
//
// NOTE: the WalletTransaction `type` enum is LOWERCASE on the BE ("credit" /
// "debit"); the §9.6 table renders uppercase labels, so the route maps it.
//
// wallet.view_own scopes to the caller's own wallet (user_id omitted). STORE/
// STAFF passing another user_id requires wallet.view_any (enforced BE-side).
//
// ENTRY 008: the BE has no per-transaction `balance_after` column and no wallet
// adjustment write endpoint — the §9.6 "Balance after" column + "Adjustments"
// tab stay as static placeholders (logged in required_adminpanel_change.md).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet } from "./_client";
import { toClientError } from "./error";

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface WalletSummary {
  user_id: string;
  balance: string;
  currency: string;
  last_credited_at: string | null;
  last_debited_at: string | null;
}

export type WalletTxType = "credit" | "debit";

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  label: string;
  amount: string;
  created_at: string | null;
}

// --------------------------------------------------------------------------- //
// getWalletSummary — GET /api/admin/v1/wallet/summary/ (§9.6 summary card).
// --------------------------------------------------------------------------- //
export const getWalletSummary = createServerFn({ method: "GET" })
  .inputValidator(z.object({ user_id: z.string().nullable().optional() }).optional())
  .handler(async ({ data }) => {
    try {
      return await apiGet<WalletSummary>(
        `/api/admin/v1/wallet/summary/${qs({ user_id: data?.user_id ?? undefined })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// listWalletTransactions — GET /api/admin/v1/wallet/transactions/ (§9.6 tab 1).
// --------------------------------------------------------------------------- //
export const listWalletTransactions = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        user_id: z.string().nullable().optional(),
        type: z.string().optional(), // "credit" | "debit"
        q: z.string().optional(), // label icontains
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        page: z.number().optional(),
        page_size: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<WalletTransaction>>(
        `/api/admin/v1/wallet/transactions/${qs({
          user_id: data?.user_id ?? undefined,
          type: data?.type,
          q: data?.q,
          date_from: data?.date_from,
          date_to: data?.date_to,
          page: data?.page,
          page_size: data?.page_size,
        })}`,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });
