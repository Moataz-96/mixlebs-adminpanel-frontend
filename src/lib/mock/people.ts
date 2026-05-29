// Local read-only mock data for the Stores & People domain (§10–11).
// Richer shapes than src/lib/mock-data.ts so the list/detail screens can show
// every column and tab the spec calls for. Re-declared here (not imported from
// app-context) per the domain rules.

export type StoreStatus =
  | "UNVERIFIED"
  | "PENDING_VERIFICATION"
  | "PENDING_PAYMENT"
  | "VERIFIED"
  | "BLOCKED";

export type AccountType = "INDIVIDUAL" | "COMPANY";

export interface StoreRow {
  id: string;
  shop_name: string;
  logo: string;
  status: StoreStatus;
  account_type: AccountType;
  rank: number;
  vendor: string | null;
  order_online: boolean;
  returns: boolean;
  chat: boolean;
  asset_sharing: boolean;
  products: number;
  orders: number;
  created_at: string;
  about: string;
}

export const STORES: StoreRow[] = [
  {
    id: "str_01",
    shop_name: "Beirut Pantry",
    logo: "BP",
    status: "VERIFIED",
    account_type: "COMPANY",
    rank: 1,
    vendor: "Mixlebs LB",
    order_online: true,
    returns: true,
    chat: true,
    asset_sharing: true,
    products: 142,
    orders: 86,
    created_at: "2025-02-14",
    about: "Premium Lebanese pantry products across Beirut & Mount Lebanon.",
  },
  {
    id: "str_02",
    shop_name: "Saida Sweets",
    logo: "SS",
    status: "VERIFIED",
    account_type: "INDIVIDUAL",
    rank: 2,
    vendor: "Mixlebs LB",
    order_online: true,
    returns: false,
    chat: true,
    asset_sharing: false,
    products: 76,
    orders: 51,
    created_at: "2025-03-02",
    about: "Traditional sweets, handmade daily in Saida.",
  },
  {
    id: "str_03",
    shop_name: "Tripoli Spices",
    logo: "TS",
    status: "PENDING_VERIFICATION",
    account_type: "INDIVIDUAL",
    rank: 3,
    vendor: null,
    order_online: false,
    returns: false,
    chat: false,
    asset_sharing: false,
    products: 54,
    orders: 28,
    created_at: "2025-04-21",
    about: "Aromatic spices and blends from the north.",
  },
  {
    id: "str_04",
    shop_name: "Cedar Goods Co.",
    logo: "CG",
    status: "VERIFIED",
    account_type: "COMPANY",
    rank: 4,
    vendor: "Cedar Holding",
    order_online: true,
    returns: true,
    chat: false,
    asset_sharing: true,
    products: 96,
    orders: 41,
    created_at: "2025-01-09",
    about: "Artisanal pantry goods and gifting boxes.",
  },
  {
    id: "str_05",
    shop_name: "Zahle Olive Press",
    logo: "ZO",
    status: "UNVERIFIED",
    account_type: "INDIVIDUAL",
    rank: 5,
    vendor: null,
    order_online: false,
    returns: false,
    chat: false,
    asset_sharing: false,
    products: 33,
    orders: 14,
    created_at: "2025-05-11",
    about: "Cold-pressed olive oil from the Bekaa valley.",
  },
  {
    id: "str_06",
    shop_name: "Byblos Roastery",
    logo: "BR",
    status: "PENDING_PAYMENT",
    account_type: "COMPANY",
    rank: 6,
    vendor: "Mixlebs LB",
    order_online: true,
    returns: true,
    chat: true,
    asset_sharing: false,
    products: 21,
    orders: 7,
    created_at: "2025-05-20",
    about: "Small-batch coffee roasted on the coast.",
  },
  {
    id: "str_07",
    shop_name: "Batroun Honey",
    logo: "BH",
    status: "BLOCKED",
    account_type: "INDIVIDUAL",
    rank: 7,
    vendor: null,
    order_online: false,
    returns: false,
    chat: false,
    asset_sharing: false,
    products: 12,
    orders: 2,
    created_at: "2025-04-03",
    about: "Raw mountain honey and bee products.",
  },
];

export const VENDORS = ["Mixlebs LB", "Cedar Holding"];

export interface StoreAddress {
  id: string;
  recipient_name: string;
  governorate: string;
  area: string;
  street: string;
  is_default: boolean;
  source: string;
}

export const STORE_ADDRESSES: StoreAddress[] = [
  {
    id: "addr_01",
    recipient_name: "Beirut Pantry — Warehouse",
    governorate: "Beirut",
    area: "Bourj Hammoud",
    street: "Industrial Zone Blvd, Hangar 4",
    is_default: true,
    source: "Onboarding",
  },
  {
    id: "addr_02",
    recipient_name: "Beirut Pantry — Storefront",
    governorate: "Beirut",
    area: "Achrafieh",
    street: "Gouraud St, Building 22",
    is_default: false,
    source: "Manual",
  },
];

export interface WorkingDay {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

export const WORKING_DAYS: WorkingDay[] = [
  { day: "MON", start_time: "09:00", end_time: "20:00", is_closed: false },
  { day: "TUE", start_time: "09:00", end_time: "20:00", is_closed: false },
  { day: "WED", start_time: "09:00", end_time: "20:00", is_closed: false },
  { day: "THU", start_time: "09:00", end_time: "20:00", is_closed: false },
  { day: "FRI", start_time: "09:00", end_time: "22:00", is_closed: false },
  { day: "SAT", start_time: "10:00", end_time: "22:00", is_closed: false },
  { day: "SUN", start_time: "00:00", end_time: "00:00", is_closed: true },
];

export interface StorePaymentMethod {
  id: string;
  brand: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export const STORE_PAYMENT_METHODS: StorePaymentMethod[] = [
  {
    id: "pm_01",
    brand: "Visa",
    holder_name: "Beirut Pantry SAL",
    exp_month: 8,
    exp_year: 2028,
    is_default: true,
  },
  {
    id: "pm_02",
    brand: "Mastercard",
    holder_name: "Beirut Pantry SAL",
    exp_month: 3,
    exp_year: 2027,
    is_default: false,
  },
];

// ── Users (§11) ────────────────────────────────────────────────────────────
export type UserType = "STAFF" | "STORE" | "CUSTOMER";

export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  type: UserType;
  is_active: boolean;
  is_superuser: boolean;
  register_completed: boolean;
  roles: string[];
  wallet_balance: number;
  password_reset_version: number;
  last_login: string;
  date_joined: string;
}

export const PEOPLE_USERS: UserRow[] = [
  {
    id: "u_01",
    first_name: "Karim",
    last_name: "Atlas",
    username: "karim.atlas",
    email: "karim@mixlebs.com",
    phone: "+96170100001",
    type: "STAFF",
    is_active: true,
    is_superuser: true,
    register_completed: true,
    roles: ["Superuser"],
    wallet_balance: 0,
    password_reset_version: 1,
    last_login: "2026-05-29 09:58",
    date_joined: "2024-11-02",
  },
  {
    id: "u_02",
    first_name: "Lara",
    last_name: "Khoury",
    username: "lara.khoury",
    email: "lara@mixlebs.com",
    phone: "+96170100002",
    type: "STAFF",
    is_active: true,
    is_superuser: false,
    register_completed: true,
    roles: ["Operations Manager"],
    wallet_balance: 0,
    password_reset_version: 2,
    last_login: "2026-05-29 09:48",
    date_joined: "2025-01-14",
  },
  {
    id: "u_03",
    first_name: "Faris",
    last_name: "Aoun",
    username: "faris.aoun",
    email: "faris@mixlebs.com",
    phone: "+96170100003",
    type: "STAFF",
    is_active: true,
    is_superuser: false,
    register_completed: true,
    roles: ["Support Agent"],
    wallet_balance: 0,
    password_reset_version: 1,
    last_login: "2026-05-29 09:01",
    date_joined: "2025-02-20",
  },
  {
    id: "u_04",
    first_name: "Beirut",
    last_name: "Pantry",
    username: "beirut.pantry",
    email: "owner@beirutpantry.lb",
    phone: "+96170100004",
    type: "STORE",
    is_active: true,
    is_superuser: false,
    register_completed: true,
    roles: ["Store Owner"],
    wallet_balance: 340.2,
    password_reset_version: 3,
    last_login: "2026-05-29 07:11",
    date_joined: "2025-02-14",
  },
  {
    id: "u_05",
    first_name: "Tripoli",
    last_name: "Spices",
    username: "tripoli.spices",
    email: "owner@tripolispices.lb",
    phone: "+96170100005",
    type: "STORE",
    is_active: false,
    is_superuser: false,
    register_completed: false,
    roles: ["Store Owner"],
    wallet_balance: 0,
    password_reset_version: 1,
    last_login: "2026-05-24 18:42",
    date_joined: "2025-04-21",
  },
];

export const ROLE_OPTIONS = [
  "Operations Manager",
  "Support Agent",
  "Finance",
  "Store Owner",
  "Content Editor",
];

export interface UserPolicy {
  id: string;
  name: string;
  type: "positive" | "negative";
  description: string;
}

export const USER_POLICIES: UserPolicy[] = [
  {
    id: "up_01",
    name: "Allow export",
    type: "positive",
    description: "Grants orders.export beyond role default.",
  },
  {
    id: "up_02",
    name: "Deny refunds",
    type: "negative",
    description: "Removes orders.refund even if a role grants it.",
  },
];

export interface DeviceTokenRow {
  id: string;
  token: string;
  device_type: "IOS" | "ANDROID" | "WEB";
  endpoint_arn: string;
  is_valid: boolean;
  created_at: string;
}

export const DEVICE_TOKENS: DeviceTokenRow[] = [
  {
    id: "dt_01",
    token: "af3b9c0d1e2f3a4b5c6d",
    device_type: "IOS",
    endpoint_arn: "arn:aws:sns:eu-west-1:1234:endpoint/APNS/mx/af3b",
    is_valid: true,
    created_at: "2026-04-10",
  },
  {
    id: "dt_02",
    token: "112233445566778899aa",
    device_type: "WEB",
    endpoint_arn: "arn:aws:sns:eu-west-1:1234:endpoint/GCM/mx/1122",
    is_valid: true,
    created_at: "2026-03-28",
  },
  {
    id: "dt_03",
    token: "ffeeddccbbaa00112233",
    device_type: "ANDROID",
    endpoint_arn: "arn:aws:sns:eu-west-1:1234:endpoint/GCM/mx/ffee",
    is_valid: false,
    created_at: "2026-01-05",
  },
];

export interface AuditEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  request_id: string;
  ip: string;
}

export const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "ae_01",
    timestamp: "2026-05-29 14:08:02",
    method: "POST",
    url: "/api/admin/v1/products/p_004/publish/",
    status: 200,
    request_id: "req_9af31c",
    ip: "188.40.12.4",
  },
  {
    id: "ae_02",
    timestamp: "2026-05-29 13:51:44",
    method: "PATCH",
    url: "/api/admin/v1/orders/o_4500/status/",
    status: 200,
    request_id: "req_771ab2",
    ip: "82.137.5.11",
  },
  {
    id: "ae_03",
    timestamp: "2026-05-29 13:44:10",
    method: "GET",
    url: "/api/admin/v1/orders/",
    status: 200,
    request_id: "req_120fd9",
    ip: "82.137.5.22",
  },
  {
    id: "ae_04",
    timestamp: "2026-05-29 12:30:55",
    method: "PATCH",
    url: "/api/admin/v1/users/u_02/",
    status: 403,
    request_id: "req_55cc1e",
    ip: "176.40.2.91",
  },
];

// ── Customers (§11.4 / §11.5) ────────────────────────────────────────────────
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender;
  dob: string;
  orders: number;
  total_spent: number;
  wallet_balance: number;
  is_return_blocked: boolean;
  date_joined: string;
}

export const PEOPLE_CUSTOMERS: CustomerRow[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `c_${1000 + i}`,
  name: [
    "Layla Haddad",
    "Omar Khoury",
    "Nour Saade",
    "Rami Geagea",
    "Aya Mansour",
    "Karim Daher",
    "Sara Aoun",
    "Hadi Nasr",
    "Maya Fares",
    "Ziad Khalil",
    "Rana Hatem",
    "Jad Salloum",
  ][i],
  email: `user${i}@mixlebs.demo`,
  phone: `+9617010${String(1000 + i * 13).slice(-4)}`,
  gender: (
    [
      "FEMALE",
      "MALE",
      "FEMALE",
      "MALE",
      "FEMALE",
      "MALE",
      "FEMALE",
      "MALE",
      "FEMALE",
      "MALE",
      "FEMALE",
      "MALE",
    ] as Gender[]
  )[i],
  dob: `199${i % 10}-0${(i % 9) + 1}-1${i % 9}`,
  orders: 2 + ((i * 7) % 14),
  total_spent: 45 + ((i * 31) % 800),
  wallet_balance: (i * 17) % 120,
  is_return_blocked: i === 6,
  date_joined: `2025-${String(((i * 2) % 12) + 1).padStart(2, "0")}-12`,
}));

// ── Subscribers (§11.6) ──────────────────────────────────────────────────────
export interface SubscriberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  recieve_notifications: boolean;
  recieve_emails: boolean;
  recieve_sms: boolean;
  subscribed_at: string;
}

export const SUBSCRIBERS: SubscriberRow[] = PEOPLE_CUSTOMERS.slice(0, 9).map((c, i) => ({
  id: `sub_${i}`,
  name: c.name,
  email: c.email,
  phone: c.phone,
  recieve_notifications: i % 4 !== 0,
  recieve_emails: i % 2 === 0,
  recieve_sms: i % 3 === 0,
  subscribed_at: c.date_joined,
}));

// Legal status transitions for the Settings tab (§10.2 Tab 6).
export const STORE_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  UNVERIFIED: ["PENDING_VERIFICATION", "BLOCKED"],
  PENDING_VERIFICATION: ["VERIFIED", "UNVERIFIED", "BLOCKED"],
  PENDING_PAYMENT: ["VERIFIED", "BLOCKED"],
  VERIFIED: ["BLOCKED"],
  BLOCKED: ["UNVERIFIED", "VERIFIED"],
};
