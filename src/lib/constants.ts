// Pure, static UI lookup constants (NOT backend data). These were previously
// colocated in src/lib/mock/* but they are FE-only enum label maps / picker
// fallbacks / seed shapes — the backend does not own them. Relocated here so the
// mock/* tree can be deleted (Phase 8 final mock purge). Nothing here makes a
// network call; backend-derived data lives in src/lib/api/*.functions.ts.

// --------------------------------------------------------------------------- #
// Account preferences pickers (§18.3). Region-scoped pickers fall back to these
// static options; the live location/language lists come from the locations
// server fns once a screen surfaces them. The master notification toggle and
// timezone are FE-only lookups.
// --------------------------------------------------------------------------- #
export const PREF_LOCATIONS = [
  { id: "loc_01", label: "Beirut, Lebanon" },
  { id: "loc_02", label: "Tripoli, Lebanon" },
  { id: "loc_03", label: "Saida, Lebanon" },
  { id: "loc_04", label: "Zahle, Lebanon" },
];

export const PREF_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "ar", label: "العربية" },
];

export const PREF_TIMEZONES = ["Asia/Beirut", "Asia/Riyadh", "Africa/Cairo", "Europe/Istanbul", "UTC"];

// Notification-preference matrix seed — one row per CommunicationTypeChoices,
// one boolean per channel (NOTIFICATION / EMAIL / SMS). The BE exposes only the
// master notification toggle (Preferences.notification); the per-category ×
// channel matrix is a FE-only presentation seeded from that master flag.
export type NotifChannel = "NOTIFICATION" | "EMAIL" | "SMS";
export interface NotifPrefRow {
  type: string;
  labelKey: string;
  NOTIFICATION: boolean;
  EMAIL: boolean;
  SMS: boolean;
}

export const NOTIF_PREF_ROWS: NotifPrefRow[] = [
  { type: "ORDER", labelKey: "account.typeOrder", NOTIFICATION: true, EMAIL: true, SMS: true },
  { type: "RETURN", labelKey: "account.typeReturn", NOTIFICATION: true, EMAIL: true, SMS: false },
  { type: "PAYMENT", labelKey: "account.typePayment", NOTIFICATION: true, EMAIL: true, SMS: false },
  {
    type: "STORE",
    labelKey: "account.typeStoreEvent",
    NOTIFICATION: true,
    EMAIL: false,
    SMS: false,
  },
  { type: "SUPPORT", labelKey: "account.typeSupport", NOTIFICATION: true, EMAIL: true, SMS: false },
  {
    type: "PROMOTION",
    labelKey: "account.typePromotion",
    NOTIFICATION: false,
    EMAIL: false,
    SMS: false,
  },
  { type: "SYSTEM", labelKey: "account.typeSystem", NOTIFICATION: true, EMAIL: false, SMS: false },
];

// --------------------------------------------------------------------------- #
// Sessions (§18.x). /account/sessions has NO backend endpoint — JWT is stateless
// (no server-side session store), so session listing/revocation is deferred
// (required_adminpanel_change.md ENTRY 030). The screen renders an empty static
// table; this shape stays FE-only.
// --------------------------------------------------------------------------- #
export interface SessionRow {
  id: string;
  created_at: string;
  ip: string;
  user_agent: string;
  last_seen: string;
  current: boolean;
}

export const ACCOUNT_SESSIONS: SessionRow[] = [];
