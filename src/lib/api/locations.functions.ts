// Locations server functions (plan §4 Phase 8 / FE §17).
//
// Countries / Cities (region-scoped to CURRENT_SERVICE_REGION), Currencies /
// Languages (global), Regions (read scoped to the active region; PATCH the
// active row). Reads gated by locations.view; writes are super-admin
// (locations.update). Field names mirror openapi.json Country / City / Currency
// / Language / Region. The BE stores a single `name` per lookup (no separate
// ar column); the FROZEN UI renders name_en + name_ar, so the mapper fills both
// from the single BE name and the write sends `name` from name_en. Re-exports
// the FROZEN UI shapes (AdminCountry/City/Currency/Language/Region) and mappers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiDelete, apiGet, apiPatch, apiPost } from "./_client";
import { toClientError } from "./error";
import type { Page } from "./stores.admin.functions";

// --------------------------------------------------------------------------- #
// BE shapes (openapi.json)
// --------------------------------------------------------------------------- #
export interface BeCountry {
  id: number;
  name: string;
  code: string;
  region_id: number;
}
export interface BeCity {
  id: number;
  name: string;
  code: string;
  region_id: number;
}
export interface BeCurrency {
  id: number;
  name: string;
  code: string;
}
export interface BeLanguage {
  id: number;
  name: string;
  code: string;
}
export interface BeRegion {
  id: number;
  code: string;
  name: string;
  currency: string | null;
  default_language_code: string;
  supported_language_codes: string[];
  center_latitude: string;
  center_longitude: string;
}

// --------------------------------------------------------------------------- #
// FROZEN UI shapes (formerly in mock/admin.ts)
// --------------------------------------------------------------------------- #
export interface AdminCountry {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
  region: string;
}
export interface AdminCity {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
  region: string;
}
export interface AdminCurrency {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
}
export interface AdminLanguage {
  id: string;
  code: string;
  name: string;
}
export interface AdminRegion {
  id: string;
  name: string;
  code: string;
  country: string;
  active: boolean;
}

export function toAdminCountry(c: BeCountry): AdminCountry {
  return { id: String(c.id), name_en: c.name, name_ar: c.name, code: c.code, region: String(c.region_id) };
}
export function toAdminCity(c: BeCity): AdminCity {
  return { id: String(c.id), name_en: c.name, name_ar: c.name, code: c.code, region: String(c.region_id) };
}
export function toAdminCurrency(c: BeCurrency): AdminCurrency {
  return { id: String(c.id), name_en: c.name, name_ar: c.name, code: c.code };
}
export function toAdminLanguage(l: BeLanguage): AdminLanguage {
  return { id: String(l.id), code: l.code, name: l.name };
}
export function toAdminRegion(r: BeRegion): AdminRegion {
  // The list is scoped to the active region (read path), so any row returned is
  // the active one. `country` falls back to the region name (no country FK).
  return { id: String(r.id), name: r.name, code: r.code, country: r.name, active: true };
}

// --------------------------------------------------------------------------- #
// Generic helpers
// --------------------------------------------------------------------------- #
function pageQuery(): string {
  return "?page_size=200";
}

const nameCodeWrite = z.object({ name: z.string(), code: z.string() });

// --------------------------------------------------------------------------- #
// Countries
// --------------------------------------------------------------------------- #
export const listCountries = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<Page<BeCountry>>(`/api/admin/v1/admin/locations/countries/${pageQuery()}`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const createCountry = createServerFn({ method: "POST" })
  .inputValidator(nameCodeWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeCountry>(`/api/admin/v1/admin/locations/countries/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateCountry = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number(), body: nameCodeWrite.partial() }))
  .handler(async ({ data }) => {
    try {
      return await apiPatch<BeCountry>(
        `/api/admin/v1/admin/locations/countries/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteCountry = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/admin/locations/countries/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Cities
// --------------------------------------------------------------------------- #
export const listCities = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<Page<BeCity>>(`/api/admin/v1/admin/locations/cities/${pageQuery()}`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const createCity = createServerFn({ method: "POST" })
  .inputValidator(nameCodeWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeCity>(`/api/admin/v1/admin/locations/cities/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateCity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number(), body: nameCodeWrite.partial() }))
  .handler(async ({ data }) => {
    try {
      return await apiPatch<BeCity>(`/api/admin/v1/admin/locations/cities/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteCity = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/admin/locations/cities/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Currencies
// --------------------------------------------------------------------------- #
export const listCurrencies = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<Page<BeCurrency>>(
      `/api/admin/v1/admin/locations/currencies/${pageQuery()}`,
    );
  } catch (err) {
    throw toClientError(err);
  }
});

export const createCurrency = createServerFn({ method: "POST" })
  .inputValidator(nameCodeWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeCurrency>(`/api/admin/v1/admin/locations/currencies/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateCurrency = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number(), body: nameCodeWrite.partial() }))
  .handler(async ({ data }) => {
    try {
      return await apiPatch<BeCurrency>(
        `/api/admin/v1/admin/locations/currencies/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteCurrency = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/admin/locations/currencies/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Languages
// --------------------------------------------------------------------------- #
export const listLanguages = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<Page<BeLanguage>>(`/api/admin/v1/admin/locations/languages/${pageQuery()}`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const createLanguage = createServerFn({ method: "POST" })
  .inputValidator(nameCodeWrite)
  .handler(async ({ data }) => {
    try {
      return await apiPost<BeLanguage>(`/api/admin/v1/admin/locations/languages/`, data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const updateLanguage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number(), body: nameCodeWrite.partial() }))
  .handler(async ({ data }) => {
    try {
      return await apiPatch<BeLanguage>(
        `/api/admin/v1/admin/locations/languages/${data.id}/`,
        data.body,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

export const deleteLanguage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    try {
      return await apiDelete<null>(`/api/admin/v1/admin/locations/languages/${data.id}/`);
    } catch (err) {
      throw toClientError(err);
    }
  });

// --------------------------------------------------------------------------- #
// Regions (read scoped to active region; no create/delete)
// --------------------------------------------------------------------------- #
export const listRegions = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await apiGet<Page<BeRegion>>(`/api/admin/v1/admin/locations/regions/${pageQuery()}`);
  } catch (err) {
    throw toClientError(err);
  }
});

export const updateRegion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      body: z.object({ name: z.string().optional(), currency: z.string().optional() }),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await apiPatch<BeRegion>(`/api/admin/v1/admin/locations/regions/${data.id}/`, data.body);
    } catch (err) {
      throw toClientError(err);
    }
  });
