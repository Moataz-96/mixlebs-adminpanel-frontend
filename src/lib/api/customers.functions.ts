// Admin customers server functions (plan §4 Phase 7 / FE §11).
//
// GET /customers/, GET /customers/{id}/, POST /customers/{id}/block_returns/.
// Read-mostly; gated by customers.view / customers.block_returns (STAFF only).
// Field names mirror openapi.json Customer / CustomerBlockReturns.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

export type CustomerGender = "MALE" | "FEMALE" | "OTHER" | null;

export interface AdminCustomer {
  id: string;
  user_id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  gender: CustomerGender;
  dob: string | null;
  is_return_blocked: boolean;
  is_active: boolean;
  wallet: string;
  date_joined: string;
  last_login: string | null;
}

const listInput = z
  .object({
    q: z.string().optional(),
    gender: z.string().optional(),
    is_return_blocked: z.boolean().optional(),
    ordering: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
  })
  .optional();

function listQuery(data: z.infer<typeof listInput>): string {
  const sp = new URLSearchParams();
  if (data?.q) sp.set("q", data.q);
  if (data?.gender) sp.set("gender", data.gender);
  if (data?.is_return_blocked !== undefined)
    sp.set("is_return_blocked", String(data.is_return_blocked));
  if (data?.ordering) sp.set("ordering", data.ordering);
  if (data?.page) sp.set("page", String(data.page));
  if (data?.page_size) sp.set("page_size", String(data.page_size));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const listCustomers = createServerFn({ method: "GET" })
  .inputValidator(listInput)
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<AdminCustomer>>(`/api/admin/v1/customers/${listQuery(data)}`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const getCustomer = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<AdminCustomer>(`/api/admin/v1/customers/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const blockReturns = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_return_blocked: boolean }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiPost<AdminCustomer>(`/api/admin/v1/customers/${data.id}/block_returns/`, {
        is_return_blocked: data.is_return_blocked,
      });
    } catch (err) {
      throw toClientError(err);
    }
  });
