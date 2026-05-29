// Audit log server function (plan §4 Phase 8 / FE §19).
//
// GET /audit_log/ (audit_log.view). PLACEHOLDER: no DB-backed endpoint-logging
// model exists (the endpoint-logging middleware writes to console/file/kafka
// savers, never to Postgres), so the endpoint returns an empty paginated
// envelope (required_adminpanel_change.md ENTRY 012). The screen renders an
// empty state. Re-exports the FROZEN UI shapes (AuditEntry, ResourceMethod).

import { createServerFn } from "@tanstack/react-start";

import { apiGet } from "./_client";
import { toClientError } from "./error";

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/admin.ts)
// --------------------------------------------------------------------------- #
export type ResourceMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export const RESOURCE_METHODS: ResourceMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

export interface AuditEntry {
  id: string;
  timestamp: string;
  request_id: string;
  user: string;
  method: ResourceMethod;
  url: string;
  status: number;
  latency_ms: number;
  ip: string;
  user_agent: string;
  payload_size: number;
  response_size: number;
  request_body: string;
  response_body: string;
}

export interface AuditPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditEntry[];
  detail?: string;
}

export const listAuditLog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // ENTRY 012 — returns { count: 0, results: [], detail: "audit_log_not_persisted" }.
    return await apiGet<AuditPage>(`/api/admin/v1/audit_log/`);
  } catch (err) {
    throw toClientError(err);
  }
});
