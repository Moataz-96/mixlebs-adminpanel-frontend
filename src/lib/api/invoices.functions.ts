// Invoices server functions for Phase 5 (FE §8.5/§8.6). list + detail +
// download (PDF stream).
//
// list/detail use the shared _client.ts helpers (envelope-unwrapping). The
// download endpoint is the one exception: GET /invoices/{id}/download/ returns a
// raw `application/pdf` body, NOT a RestResponse envelope, so _client.unwrap
// (which parses JSON) cannot consume it. We therefore do a direct authed fetch
// here — reusing the same HttpOnly `mxa_access` cookie and DJANGO_BASE_URL that
// _client.ts uses — and return the PDF as base64 + filename through the
// createServerFn RPC boundary (binary blobs don't survive that boundary; a
// base64 string does). The client decodes it into a Blob and triggers the
// browser download from the existing "Download PDF" button. No JWT ever touches
// web storage — the access token is read server-side from the HttpOnly cookie.

import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { apiGet } from "./_client";
import { getServerConfig } from "../config.server";
import { toClientError } from "./error";

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type InvoiceTypeName = "ORDER" | "RETURN";

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  invoice_date: string | null;
  invoice_type: InvoiceTypeName | string;
  price: string | null;
  tax: string | null;
  fees: string | null;
  total: string | number | null;
  status: string | null;
  related_order_id: string | null;
  related_return_id: string | null;
  created_at: string | null;
}

export interface InvoiceItem {
  id: number;
  model_number: string | null;
  image: string | null;
  quantity: number;
  attributes: string | null;
  price: string | null;
  discount: string | null;
  line_total: string | number | null;
}

export interface InvoiceRecipient {
  id: number;
  recipient_username: string | null;
  recipient_userid: string | null;
  recipient_name: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  governorate: string | null;
  area: string | null;
  postcode: string | null;
  street: string | null;
  building: number | null;
  floor: number | null;
  apartment: number | null;
  note: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  payment_type: string | null;
  transfer_status: string | null;
  serial_number: string | null;
}

export interface InvoiceCoupon {
  id: number;
  code: string | null;
  discount_type: string | null;
  discount_value: string | null;
  min_order_cost: string | null;
  min_num_items: number | null;
  capped_at: string | null;
  expires: string | null;
}

export interface InvoiceDetail extends InvoiceListItem {
  items: InvoiceItem[];
  recipients: InvoiceRecipient[];
  coupon: InvoiceCoupon | null;
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// --------------------------------------------------------------------------- //
// listInvoices — GET /api/admin/v1/invoices/ (§8.5).
// --------------------------------------------------------------------------- //
export const listInvoices = createServerFn({ method: "GET" })
  .inputValidator(
    (d?: {
      q?: string;
      invoice_type?: string;
      status?: string;
      store_id?: string | null;
      date_from?: string;
      date_to?: string;
      page?: number;
      page_size?: number;
    }) => d ?? {},
  )
  .handler(async ({ data }) => {
    try {
      return await apiGet<Page<InvoiceListItem>>(
        `/api/admin/v1/invoices/${qs({
          q: data?.q,
          invoice_type: data?.invoice_type,
          status: data?.status,
          store_id: data?.store_id ?? undefined,
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

// --------------------------------------------------------------------------- //
// getInvoice — GET /api/admin/v1/invoices/{id}/ (§8.6).
// --------------------------------------------------------------------------- //
export const getInvoice = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiGet<InvoiceDetail>(`/api/admin/v1/invoices/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- //
// downloadInvoice — GET /api/admin/v1/invoices/{id}/download/ -> application/pdf.
// Returns { filename, contentType, base64 } so the binary survives the RPC
// boundary; the client turns it back into a Blob and downloads it.
// --------------------------------------------------------------------------- //
export interface InvoicePdf {
  filename: string;
  contentType: string;
  base64: string;
}

export const downloadInvoice = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<InvoicePdf> => {
    try {
      const base = getServerConfig().djangoBaseUrl.replace(/\/$/, "");
      const access = getCookie("mxa_access");
      const headers = new Headers({ Accept: "application/pdf" });
      if (access) headers.set("Authorization", `Bearer ${access}`);

      const res = await fetch(`${base}/api/admin/v1/invoices/${data.id}/download/`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        // The error path is the RestResponse envelope (JSON). Parse what we can
        // so the client toaster shows a real message.
        let message = `Request failed with status ${res.status}`;
        let errorType: string | null = null;
        try {
          const env = (await res.json()) as { error?: unknown; error_type?: string | null };
          errorType = env?.error_type ?? null;
          if (typeof env?.error === "string") message = env.error;
        } catch {
          // non-JSON body; keep the status message
        }
        throw toClientError({ message, errorType, fieldErrors: null });
      }

      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const contentType = res.headers.get("content-type") ?? "application/pdf";
      // Derive a filename from Content-Disposition when present.
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition);
      const filename = match ? decodeURIComponent(match[1]) : `invoice-${data.id}.pdf`;
      return { filename, contentType, base64 };
    } catch (err) {
      throw toClientError(err);
    }
  });
