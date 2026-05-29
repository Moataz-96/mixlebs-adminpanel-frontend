// Local, read-only mock fixtures for the Account screens (§18). These mirror
// the backend shapes (DeviceToken, JWT refresh sessions) so the wiring engineer
// can search-replace field names with no JSX changes.

export interface DeviceTokenRow {
  id: string;
  device_type: "IOS" | "ANDROID" | "WEB";
  label: string;
  is_valid: boolean;
  created_at: string;
}

export const ACCOUNT_DEVICES: DeviceTokenRow[] = [
  {
    id: "dev_01",
    device_type: "WEB",
    label: "Chrome 124 · macOS 14.4",
    is_valid: true,
    created_at: "2026-05-29 09:14",
  },
  {
    id: "dev_02",
    device_type: "IOS",
    label: "Safari Mobile · iOS 17.4",
    is_valid: true,
    created_at: "2026-05-28 21:02",
  },
  {
    id: "dev_03",
    device_type: "ANDROID",
    label: "Chrome Mobile · Android 14",
    is_valid: true,
    created_at: "2026-05-20 11:30",
  },
  {
    id: "dev_04",
    device_type: "WEB",
    label: "Firefox 125 · Windows 11",
    is_valid: false,
    created_at: "2026-04-12 16:48",
  },
];

export interface SessionRow {
  id: string;
  created_at: string;
  ip: string;
  user_agent: string;
  last_seen: string;
  current: boolean;
}

export const ACCOUNT_SESSIONS: SessionRow[] = [
  {
    id: "ses_01",
    created_at: "2026-05-29 09:14",
    ip: "188.40.12.4",
    user_agent: "Chrome 124 · macOS",
    last_seen: "Just now",
    current: true,
  },
  {
    id: "ses_02",
    created_at: "2026-05-28 21:02",
    ip: "82.137.5.11",
    user_agent: "Safari · iOS 17.4",
    last_seen: "12 min ago",
    current: false,
  },
  {
    id: "ses_03",
    created_at: "2026-05-24 14:48",
    ip: "82.137.5.22",
    user_agent: "Safari · iPadOS 17.3",
    last_seen: "Yesterday",
    current: false,
  },
];

// Region-scoped pickers (Preferences §18.3). Real values come from
// configSlice.region.supported_languages / locations lookup once wired.
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

export const PREF_TIMEZONES = [
  "Asia/Beirut",
  "Asia/Riyadh",
  "Africa/Cairo",
  "Europe/Istanbul",
  "UTC",
];

// Notification-preference matrix seed — one row per CommunicationTypeChoices,
// one boolean per channel (NOTIFICATION / EMAIL / SMS).
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

// Read-only profile facts (§18.1).
export const ACCOUNT_PROFILE = {
  id: "usr_8f3a21c0-4b2e-4c9a-9f1d-2e7b6a5c4d3e",
  username: "karim.atlas",
  type: "ADMIN" as "ADMIN" | "STAFF" | "STORE",
  register_completed: true,
  date_joined: "2025-01-12",
  last_login: "2026-05-29 09:14",
  first_name: "Karim",
  last_name: "Atlas",
  email: "karim@mixlebs.com",
  phone: "+961 70 100 000",
};
