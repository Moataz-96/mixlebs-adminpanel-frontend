// Store-onboarding server functions for Phase 1 (send-code / verify-phone /
// document upload / register / registration-status). Each .handler body runs
// SERVER-ONLY. The register handler auto-signs-in the new STORE user by writing
// the returned access/refresh into the HttpOnly auth cookies (so the status
// poll is authenticated). Tokens are never returned to the client.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { apiGet, apiPost, apiUpload } from "./_client";
import { toClientError } from "./error";

// ---------------------------------------------------------------------------
// Response shapes (hand-typed from the BE contract — see plan §5.5).
// ---------------------------------------------------------------------------

export interface SendCodePayload {
  detail: string;
  TIMEOUT?: number;
}

export interface VerifyPhonePayload {
  verification_ticket: string;
}

export interface UploadDocumentPayload {
  asset_id: string;
}

interface RegisterPayload {
  id: string;
  status: string;
  banner_label_key: string;
  access: string;
  refresh: string;
}

export interface RegistrationStatusPayload {
  id: string;
  shop_name: string;
  status: string;
  banner_label_key: string;
}

// Zod mirrors of the wizard payloads. Kept permissive (the BE is the source of
// truth for required-ness); strings pass through untouched.
const registerUserSchema = z.object({
  email: z.string(),
  phone: z.string(),
  password: z.string(),
  first_name: z.string(),
  last_name: z.string(),
});

const registerShopSchema = z.object({
  name_en: z.string(),
  name_ar: z.string(),
  about_en: z.string().optional(),
  about_ar: z.string().optional(),
  features_en: z.string().optional(),
  features_ar: z.string().optional(),
  target_audience_en: z.string().optional(),
  target_audience_ar: z.string().optional(),
  selling_promotions_en: z.string().optional(),
  selling_promotions_ar: z.string().optional(),
  category_id: z.string().optional(),
  default_language: z.string(),
});

const registerAddressSchema = z.object({
  location_id: z.string(),
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  recipient_name: z.string(),
  phone_number: z.string(),
  governorate: z.string(),
  area: z.string().optional(),
  postcode: z.string().optional(),
  street: z.string(),
  building: z.union([z.string(), z.number()]),
  floor: z.union([z.string(), z.number()]),
  apartment: z.union([z.string(), z.number()]),
  note: z.string().optional(),
});

const registerIdentitySchema = z.object({
  account_type: z.string(),
  identity: z.string(),
  first_name: z.string(),
  middle_name: z.string().optional(),
  last_name: z.string(),
  business_name: z.string().optional(),
  business_license_number: z.string().optional(),
  residential_address: z.string(),
  country_of_issue: z.string(),
  expiration_date: z.string(),
  dob: z.string(),
  identity_front_side_document_id: z.string(),
  identity_back_side_document_id: z.string(),
  supporting_document_ids: z.array(z.string()).optional(),
});

const registerPaymentSchema = z.object({
  brand: z.string(),
  holder_name: z.string(),
  exp_month: z.union([z.string(), z.number()]),
  exp_year: z.union([z.string(), z.number()]),
  token: z.string(),
  last4: z.string().optional(),
});

const registerSchema = z.object({
  verification_ticket: z.string(),
  user: registerUserSchema,
  shop: registerShopSchema,
  address: registerAddressSchema,
  identity: registerIdentitySchema,
  payment: registerPaymentSchema,
});

// ---------------------------------------------------------------------------
// OTP — send + verify.
// ---------------------------------------------------------------------------

export const sendPhoneCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ phone: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      return await apiPost<SendCodePayload>("/api/admin/v1/stores/send_code/", data);
    } catch (err) {
      throw toClientError(err);
    }
  });

export const verifyPhone = createServerFn({ method: "POST" })
  .inputValidator(z.object({ phone: z.string().min(1), code: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      return await apiPost<VerifyPhonePayload>("/api/admin/v1/stores/verify_phone/", data);
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// Document upload — multipart, field name `file`. The validator passes the
// FormData straight through (createServerFn supports FormData input).
// ---------------------------------------------------------------------------

export const uploadRegisterDocument = createServerFn({ method: "POST" })
  .inputValidator((form: unknown) => {
    if (!(form instanceof FormData)) throw new Error("Expected FormData");
    return form;
  })
  .handler(async ({ data }) => {
    try {
      return await apiUpload<UploadDocumentPayload>(
        "/api/admin/v1/stores/register_document/",
        data,
      );
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// register — atomic onboarding submit. Auto-signs-in the new STORE user.
// ---------------------------------------------------------------------------

export const registerStore = createServerFn({ method: "POST" })
  .inputValidator(registerSchema)
  .handler(async ({ data }) => {
    const { setAuthCookies } = await import("./cookies.server");
    try {
      const payload = await apiPost<RegisterPayload>("/api/admin/v1/stores/register/", data);
      // The new STORE user is auto-signed-in so /register/status can poll.
      setAuthCookies(payload.access, payload.refresh);
      return {
        id: payload.id,
        status: payload.status,
        banner_label_key: payload.banner_label_key,
      };
    } catch (err) {
      throw toClientError(err);
    }
  });

// ---------------------------------------------------------------------------
// registration status — polled by /register/status (auth required).
// ---------------------------------------------------------------------------

export const getRegistrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  return apiGet<RegistrationStatusPayload>("/api/admin/v1/stores/registration_status/");
});
