// Admin-domain mock data — shapes the shared mock-data.ts doesn't cover.
// Read-only; used to populate lookups / analytics / audit / feedback.
//
// The RBAC blocks (roles / role-policies / user-policies / permissions /
// permission-resources / pick-users) were removed in Phase 2 — those five
// screens now read live data via src/lib/api/rbac.functions.ts. The remaining
// blocks below belong to Phase 8 (audit / feedback / analytics / lookups).

// Shared HTTP-method enum reused by the audit-log filter (Phase 8).
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

export const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "al_001",
    timestamp: "2026-05-29 14:08:02",
    request_id: "req_9f2a3c",
    user: "Karim Atlas",
    method: "POST",
    url: "/api/v1/products/p_004/publish/",
    status: 200,
    latency_ms: 142,
    ip: "188.40.12.4",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124",
    payload_size: 312,
    response_size: 1840,
    request_body: '{ "status": "AVAILABLE" }',
    response_body:
      '{ "data": { "id": "p_004", "status": "AVAILABLE" }, "error": null, "error_type": null, "status": 200 }',
  },
  {
    id: "al_002",
    timestamp: "2026-05-29 13:51:44",
    request_id: "req_71b0de",
    user: "Lara Khoury",
    method: "PATCH",
    url: "/api/v1/orders/o_4500/transition/",
    status: 200,
    latency_ms: 98,
    ip: "82.137.5.11",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/126",
    payload_size: 88,
    response_size: 2210,
    request_body: '{ "to": "READY" }',
    response_body:
      '{ "data": { "order_status": "READY" }, "error": null, "error_type": null, "status": 200 }',
  },
  {
    id: "al_003",
    timestamp: "2026-05-29 13:44:10",
    request_id: "req_c33f01",
    user: "Faris Aoun",
    method: "POST",
    url: "/api/v1/chats/support/ss_02/pickup/",
    status: 200,
    latency_ms: 73,
    ip: "82.137.5.22",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/124",
    payload_size: 0,
    response_size: 640,
    request_body: "{}",
    response_body:
      '{ "data": { "status": "ASSIGNED" }, "error": null, "error_type": null, "status": 200 }',
  },
  {
    id: "al_004",
    timestamp: "2026-05-29 12:30:55",
    request_id: "req_20ab9f",
    user: "owner@beirutpantry.lb",
    method: "PATCH",
    url: "/api/v1/products/p_001/",
    status: 200,
    latency_ms: 210,
    ip: "176.40.2.91",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Safari/604.1",
    payload_size: 540,
    response_size: 1980,
    request_body: '{ "list_price": 39.0 }',
    response_body:
      '{ "data": { "id": "p_001" }, "error": null, "error_type": null, "status": 200 }',
  },
  {
    id: "al_005",
    timestamp: "2026-05-29 11:02:18",
    request_id: "req_5d8e74",
    user: "Lara Khoury",
    method: "DELETE",
    url: "/api/v1/coupons/OLIVE20/",
    status: 403,
    latency_ms: 41,
    ip: "82.137.5.11",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/126",
    payload_size: 0,
    response_size: 180,
    request_body: "{}",
    response_body:
      '{ "data": null, "error": "Forbidden", "error_type": "permission_denied", "status": 403 }',
  },
  {
    id: "al_006",
    timestamp: "2026-05-29 10:14:39",
    request_id: "req_aa19c2",
    user: "system",
    method: "GET",
    url: "/api/v1/dashboard/timeseries/",
    status: 500,
    latency_ms: 1320,
    ip: "10.0.0.4",
    user_agent: "celery-beat/5.3",
    payload_size: 0,
    response_size: 220,
    request_body: "{}",
    response_body:
      '{ "data": null, "error": "Internal error", "error_type": "server_error", "status": 500 }',
  },
  {
    id: "al_007",
    timestamp: "2026-05-29 09:48:01",
    request_id: "req_e7720b",
    user: "Karim Atlas",
    method: "PUT",
    url: "/api/v1/stores/str_03/status/",
    status: 200,
    latency_ms: 156,
    ip: "188.40.12.4",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124",
    payload_size: 96,
    response_size: 1500,
    request_body: '{ "status": "VERIFIED" }',
    response_body:
      '{ "data": { "status": "VERIFIED" }, "error": null, "error_type": null, "status": 200 }',
  },
];

export type FeedbackCategory = "GENERAL" | "BUG" | "FEATURE" | "PERFORMANCE" | "OTHER";

export interface AppFeedback {
  id: string;
  created_at: string;
  user_name: string;
  user_email: string;
  rating: number;
  category: FeedbackCategory;
  comment: string;
}

export const APP_FEEDBACK: AppFeedback[] = [
  {
    id: "fb_01",
    created_at: "2026-05-29 09:12",
    user_name: "Layla Haddad",
    user_email: "layla@mixlebs.demo",
    rating: 5,
    category: "GENERAL",
    comment: "Loving the new search, results are instant and relevant.",
  },
  {
    id: "fb_02",
    created_at: "2026-05-28 18:40",
    user_name: "Omar Khoury",
    user_email: "omar@mixlebs.demo",
    rating: 2,
    category: "FEATURE",
    comment: "Please add a filter by store on the product list — hard to find sellers.",
  },
  {
    id: "fb_03",
    created_at: "2026-05-28 11:02",
    user_name: "Nour Saade",
    user_email: "nour@mixlebs.demo",
    rating: 4,
    category: "PERFORMANCE",
    comment: "Checkout felt much faster this week, good job.",
  },
  {
    id: "fb_04",
    created_at: "2026-05-27 22:15",
    user_name: "Rami Geagea",
    user_email: "rami@mixlebs.demo",
    rating: 1,
    category: "BUG",
    comment: "App crashes when I open the wallet tab on Android 13.",
  },
  {
    id: "fb_05",
    created_at: "2026-05-27 08:33",
    user_name: "Aya Mansour",
    user_email: "aya@mixlebs.demo",
    rating: 3,
    category: "OTHER",
    comment: "Would be nice to have dark mode on the storefront too.",
  },
  {
    id: "fb_06",
    created_at: "2026-05-26 16:50",
    user_name: "Karim Daher",
    user_email: "karim.d@mixlebs.demo",
    rating: 5,
    category: "GENERAL",
    comment: "Best grocery app in Lebanon, keep it up.",
  },
];

export interface ProductVisits {
  id: string;
  product: string;
  total_visits: number;
  unique_users: number;
  anonymous: number;
  last_visit: string;
  conversion: number; // percent
}

export const PRODUCT_VISITS: ProductVisits[] = [
  {
    id: "p_001",
    product: "Saffron Threads, Persian Grade A",
    total_visits: 18420,
    unique_users: 9120,
    anonymous: 6210,
    last_visit: "2026-05-29 13:55",
    conversion: 4.8,
  },
  {
    id: "p_004",
    product: "Sumac Powder 250g",
    total_visits: 12030,
    unique_users: 6740,
    anonymous: 4010,
    last_visit: "2026-05-29 13:40",
    conversion: 6.1,
  },
  {
    id: "p_002",
    product: "Cold-Pressed Olive Oil 1L",
    total_visits: 9880,
    unique_users: 5120,
    anonymous: 3300,
    last_visit: "2026-05-29 12:18",
    conversion: 3.2,
  },
  {
    id: "p_006",
    product: "Pistachio Halva 400g",
    total_visits: 7440,
    unique_users: 3980,
    anonymous: 2210,
    last_visit: "2026-05-29 11:02",
    conversion: 5.5,
  },
  {
    id: "p_008",
    product: "Tahini, Stone-Ground 600g",
    total_visits: 5210,
    unique_users: 2870,
    anonymous: 1640,
    last_visit: "2026-05-28 19:30",
    conversion: 2.9,
  },
];

export interface StoreVisits {
  id: string;
  store: string;
  total_visits: number;
  unique_users: number;
  anonymous: number;
  last_visit: string;
  subscriber_conversion: number; // percent
}

export const STORE_VISITS: StoreVisits[] = [
  {
    id: "str_01",
    store: "Beirut Pantry",
    total_visits: 42100,
    unique_users: 21300,
    anonymous: 14200,
    last_visit: "2026-05-29 14:01",
    subscriber_conversion: 8.4,
  },
  {
    id: "str_04",
    store: "Cedar Goods Co.",
    total_visits: 28800,
    unique_users: 14900,
    anonymous: 9800,
    last_visit: "2026-05-29 13:22",
    subscriber_conversion: 6.1,
  },
  {
    id: "str_02",
    store: "Saida Sweets",
    total_visits: 19450,
    unique_users: 10200,
    anonymous: 7100,
    last_visit: "2026-05-29 12:40",
    subscriber_conversion: 5.2,
  },
  {
    id: "str_03",
    store: "Tripoli Spices",
    total_visits: 11200,
    unique_users: 6100,
    anonymous: 4300,
    last_visit: "2026-05-29 10:11",
    subscriber_conversion: 3.8,
  },
];

export interface SearchTerm {
  id: string;
  query: string;
  count: number;
  unique_users: number;
  avg_results: number;
  last_searched: string;
}

export const SEARCH_TERMS: SearchTerm[] = [
  {
    id: "s_01",
    query: "saffron",
    count: 1820,
    unique_users: 1240,
    avg_results: 3,
    last_searched: "2026-05-29 13:58",
  },
  {
    id: "s_02",
    query: "olive oil",
    count: 1240,
    unique_users: 980,
    avg_results: 18,
    last_searched: "2026-05-29 13:40",
  },
  {
    id: "s_03",
    query: "halva",
    count: 880,
    unique_users: 690,
    avg_results: 4,
    last_searched: "2026-05-29 12:20",
  },
  {
    id: "s_04",
    query: "tahini",
    count: 640,
    unique_users: 510,
    avg_results: 12,
    last_searched: "2026-05-29 11:05",
  },
  {
    id: "s_05",
    query: "sumac",
    count: 510,
    unique_users: 420,
    avg_results: 6,
    last_searched: "2026-05-29 10:48",
  },
  {
    id: "s_06",
    query: "rose water",
    count: 420,
    unique_users: 360,
    avg_results: 0,
    last_searched: "2026-05-29 09:30",
  },
  {
    id: "s_07",
    query: "pomegranate molasses",
    count: 380,
    unique_users: 300,
    avg_results: 5,
    last_searched: "2026-05-28 21:12",
  },
  {
    id: "s_08",
    query: "zaatar",
    count: 320,
    unique_users: 270,
    avg_results: 8,
    last_searched: "2026-05-28 18:44",
  },
  {
    id: "s_09",
    query: "kunafa tray",
    count: 140,
    unique_users: 120,
    avg_results: 0,
    last_searched: "2026-05-28 14:02",
  },
];

export interface AdminOption {
  id: string;
  event: string;
  identifier: string;
  name_en: string;
  name_ar: string;
}

export const ADMIN_OPTIONS: AdminOption[] = [
  {
    id: "op_01",
    event: "order.cancellation_reason",
    identifier: "out_of_stock",
    name_en: "Out of stock",
    name_ar: "غير متوفر",
  },
  {
    id: "op_02",
    event: "order.cancellation_reason",
    identifier: "customer_request",
    name_en: "Customer changed mind",
    name_ar: "تغيّر رأي العميل",
  },
  {
    id: "op_03",
    event: "return.reason",
    identifier: "damaged",
    name_en: "Damaged on arrival",
    name_ar: "تالف عند الوصول",
  },
  {
    id: "op_04",
    event: "return.reason",
    identifier: "wrong_item",
    name_en: "Wrong item",
    name_ar: "صنف خاطئ",
  },
  {
    id: "op_05",
    event: "store.business_type",
    identifier: "llc",
    name_en: "Limited liability company",
    name_ar: "شركة ذات مسؤولية محدودة",
  },
];

export interface AdminCountry {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
  region: string;
}

export const ADMIN_COUNTRIES: AdminCountry[] = [
  { id: "co_lb", name_en: "Lebanon", name_ar: "لبنان", code: "LB", region: "Levant" },
  {
    id: "co_ae",
    name_en: "United Arab Emirates",
    name_ar: "الإمارات العربية المتحدة",
    code: "AE",
    region: "Gulf",
  },
  {
    id: "co_sa",
    name_en: "Saudi Arabia",
    name_ar: "المملكة العربية السعودية",
    code: "SA",
    region: "Gulf",
  },
  { id: "co_jo", name_en: "Jordan", name_ar: "الأردن", code: "JO", region: "Levant" },
];

export interface AdminCity {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
  region: string;
}

export const ADMIN_CITIES: AdminCity[] = [
  { id: "ci_bei", name_en: "Beirut", name_ar: "بيروت", code: "BEY", region: "Levant" },
  { id: "ci_tri", name_en: "Tripoli", name_ar: "طرابلس", code: "TRP", region: "Levant" },
  { id: "ci_sai", name_en: "Saida", name_ar: "صيدا", code: "SDA", region: "Levant" },
  { id: "ci_zah", name_en: "Zahle", name_ar: "زحلة", code: "ZHL", region: "Levant" },
  { id: "ci_dub", name_en: "Dubai", name_ar: "دبي", code: "DXB", region: "Gulf" },
];

export interface AdminCurrency {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
}

export const ADMIN_CURRENCIES: AdminCurrency[] = [
  { id: "cu_usd", name_en: "US Dollar", name_ar: "دولار أمريكي", code: "USD" },
  { id: "cu_lbp", name_en: "Lebanese Pound", name_ar: "ليرة لبنانية", code: "LBP" },
  { id: "cu_aed", name_en: "UAE Dirham", name_ar: "درهم إماراتي", code: "AED" },
  { id: "cu_sar", name_en: "Saudi Riyal", name_ar: "ريال سعودي", code: "SAR" },
];

export interface AdminLanguage {
  id: string;
  code: string;
  name: string;
}

export const ADMIN_LANGUAGES: AdminLanguage[] = [
  { id: "la_en", code: "en", name: "English" },
  { id: "la_ar", code: "ar", name: "العربية" },
  { id: "la_fr", code: "fr", name: "Français" },
];

export interface AdminRegion {
  id: string;
  name: string;
  code: string;
  country: string;
  active: boolean;
}

export const ADMIN_REGIONS: AdminRegion[] = [
  { id: "rg_eg", name: "Egypt", code: "EG", country: "Egypt", active: false },
  { id: "rg_sa", name: "Saudi Arabia", code: "SA", country: "Saudi Arabia", active: true },
];
