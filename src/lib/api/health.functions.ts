import { createServerFn } from "@tanstack/react-start";

import { apiGet } from "./_client";

// Shape of the public /health/ payload returned by the admin API.
export interface HealthPayload {
  status: string;
  region: string;
  version: string;
}

// Public health probe. No auth required; the admin API exposes this openly.
export const getHealth = createServerFn({ method: "GET" }).handler(async () => {
  return apiGet<HealthPayload>("/api/admin/v1/health/");
});
