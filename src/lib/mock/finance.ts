// Domain-local mock data for Promotions & Finance (§9). Read-only; enriches the
// shared mock-data shapes with the exact fields the §9 columns/forms require so
// the wiring engineer has a 1:1 field map. Owned by the Promotions & Finance
// builder — safe to extend here without touching the shared mock-data.ts.

export type DiscountType = "MONETARY" | "PERCENTAGE";
export type CouponScope = "PLATFORM" | "STORE";
export type PaymentType = "COD" | "CC" | "QR" | "NS";

export interface CouponRow {
  id: string;
  code: string;
  scope: CouponScope;
  store?: string;
  discount_type: DiscountType;
  discount_value: number;
  capped_at?: number | null;
  min_order_cost: number;
  min_num_items: number;
  max_uses: number; // 0 = unlimited
  max_uses_per_user: number;
  times_used: number;
  is_valid: boolean;
  new_customers_only: boolean;
  eligible_payment_types: PaymentType[];
  applicable_categories: string[];
  applicable_products: string[];
  excluded_products: string[];
  starts_at: string; // ISO-ish (yyyy-mm-ddThh:mm)
  expires: string;
  created_at: string;
}

export const COUPON_ROWS: CouponRow[] = [
  {
    id: "cp_01",
    code: "SAFFRON15",
    scope: "STORE",
    store: "Beirut Pantry",
    discount_type: "PERCENTAGE",
    discount_value: 15,
    capped_at: 25,
    min_order_cost: 30,
    min_num_items: 1,
    max_uses: 500,
    max_uses_per_user: 1,
    times_used: 84,
    is_valid: true,
    new_customers_only: false,
    eligible_payment_types: ["COD", "CC"],
    applicable_categories: ["Spices"],
    applicable_products: [],
    excluded_products: [],
    starts_at: "2026-05-01T00:00",
    expires: "2026-06-30T23:59",
    created_at: "2026-04-20T09:12",
  },
  {
    id: "cp_02",
    code: "WELCOME10",
    scope: "PLATFORM",
    discount_type: "MONETARY",
    discount_value: 10,
    capped_at: null,
    min_order_cost: 0,
    min_num_items: 0,
    max_uses: 5000,
    max_uses_per_user: 1,
    times_used: 1240,
    is_valid: true,
    new_customers_only: true,
    eligible_payment_types: ["COD", "CC", "QR", "NS"],
    applicable_categories: [],
    applicable_products: [],
    excluded_products: [],
    starts_at: "2026-01-01T00:00",
    expires: "2026-12-31T23:59",
    created_at: "2025-12-15T11:00",
  },
  {
    id: "cp_03",
    code: "RAMADAN25",
    scope: "PLATFORM",
    discount_type: "PERCENTAGE",
    discount_value: 25,
    capped_at: 50,
    min_order_cost: 50,
    min_num_items: 2,
    max_uses: 3120,
    max_uses_per_user: 2,
    times_used: 3120,
    is_valid: false,
    new_customers_only: false,
    eligible_payment_types: ["CC"],
    applicable_categories: ["Sweets", "Pantry"],
    applicable_products: [],
    excluded_products: [],
    starts_at: "2026-03-01T00:00",
    expires: "2026-04-15T23:59",
    created_at: "2026-02-10T08:30",
  },
  {
    id: "cp_04",
    code: "OLIVE20",
    scope: "STORE",
    store: "Zahle Olive Press",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    capped_at: 15,
    min_order_cost: 25,
    min_num_items: 1,
    max_uses: 200,
    max_uses_per_user: 1,
    times_used: 0,
    is_valid: true,
    new_customers_only: false,
    eligible_payment_types: ["COD", "CC"],
    applicable_categories: ["Olive Oil"],
    applicable_products: [],
    excluded_products: [],
    starts_at: "2026-06-15T00:00",
    expires: "2026-07-15T23:59",
    created_at: "2026-05-22T14:05",
  },
  {
    id: "cp_05",
    code: "FREESHIP",
    scope: "PLATFORM",
    discount_type: "MONETARY",
    discount_value: 5,
    capped_at: null,
    min_order_cost: 40,
    min_num_items: 0,
    max_uses: 0,
    max_uses_per_user: 3,
    times_used: 612,
    is_valid: true,
    new_customers_only: false,
    eligible_payment_types: ["COD", "CC", "QR", "NS"],
    applicable_categories: [],
    applicable_products: [],
    excluded_products: [],
    starts_at: "2026-04-01T00:00",
    expires: "2026-09-30T23:59",
    created_at: "2026-03-28T10:45",
  },
];

export interface PaymentMethodRow {
  id: string;
  store: string;
  store_id: string;
  brand: "Visa" | "Mastercard" | "Other";
  holder_name: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

export const PAYMENT_METHOD_ROWS: PaymentMethodRow[] = [
  {
    id: "pm_01",
    store: "Beirut Pantry",
    store_id: "str_01",
    brand: "Visa",
    holder_name: "Beirut Pantry SAL",
    last4: "4242",
    exp_month: 8,
    exp_year: 2028,
    is_default: true,
    created_at: "2026-02-11",
  },
  {
    id: "pm_02",
    store: "Beirut Pantry",
    store_id: "str_01",
    brand: "Mastercard",
    holder_name: "K. Atlas",
    last4: "5454",
    exp_month: 3,
    exp_year: 2027,
    is_default: false,
    created_at: "2026-03-02",
  },
  {
    id: "pm_03",
    store: "Saida Sweets",
    store_id: "str_02",
    brand: "Visa",
    holder_name: "Saida Sweets Co.",
    last4: "1881",
    exp_month: 11,
    exp_year: 2027,
    is_default: true,
    created_at: "2026-01-19",
  },
  {
    id: "pm_04",
    store: "Tripoli Spices",
    store_id: "str_03",
    brand: "Other",
    holder_name: "Tripoli Spices",
    last4: "",
    exp_month: 6,
    exp_year: 2029,
    is_default: true,
    created_at: "2026-04-08",
  },
];

export interface WalletTxRow {
  id: string;
  date: string;
  type: "CREDIT" | "DEBIT";
  label: string;
  amount: number;
  balance_after: number;
  related_kind?: "order" | "return";
  related_ref?: string;
}

export const WALLET_TX_ROWS: WalletTxRow[] = [
  {
    id: "wtx_001",
    date: "2026-05-28 14:10",
    type: "CREDIT",
    label: "Order settled",
    amount: 84.5,
    balance_after: 396.0,
    related_kind: "order",
    related_ref: "MX-4501",
  },
  {
    id: "wtx_002",
    date: "2026-05-27 09:00",
    type: "DEBIT",
    label: "Platform fee",
    amount: 12.5,
    balance_after: 311.5,
    related_kind: undefined,
    related_ref: undefined,
  },
  {
    id: "wtx_003",
    date: "2026-05-27 09:00",
    type: "CREDIT",
    label: "Payout — Orders MX-4490..4498",
    amount: 240.0,
    balance_after: 324.0,
    related_kind: "order",
    related_ref: "MX-4498",
  },
  {
    id: "wtx_004",
    date: "2026-05-25 16:20",
    type: "DEBIT",
    label: "Return refund",
    amount: 19.8,
    balance_after: 84.0,
    related_kind: "return",
    related_ref: "MX-4486",
  },
  {
    id: "wtx_005",
    date: "2026-05-24 10:05",
    type: "CREDIT",
    label: "Manual adjustment",
    amount: 50.0,
    balance_after: 103.8,
  },
];

export const WALLET_SUMMARY = {
  balance: 396.0,
  currency: "USD",
  last_credited_at: "2026-05-28 14:10",
  last_debited_at: "2026-05-27 09:00",
};

export interface CourierRow {
  id: string;
  name: string;
  rank: number;
  eta_days: number;
  base_fee: number;
  region_id: string;
  regions: number; // count of associated locations / delivery areas
  is_active: boolean;
  logo: string;
}

export const COURIER_ROWS: CourierRow[] = [
  {
    id: "cou_01",
    name: "Beirut Express",
    rank: 1,
    eta_days: 1,
    base_fee: 3.0,
    region_id: "reg_lb",
    regions: 12,
    is_active: true,
    logo: "BE",
  },
  {
    id: "cou_02",
    name: "Cedar Logistics",
    rank: 2,
    eta_days: 2,
    base_fee: 4.5,
    region_id: "reg_lb",
    regions: 28,
    is_active: true,
    logo: "CL",
  },
  {
    id: "cou_03",
    name: "Mountain Routes",
    rank: 3,
    eta_days: 3,
    base_fee: 5.0,
    region_id: "reg_lb",
    regions: 6,
    is_active: false,
    logo: "MR",
  },
];

export interface DeliveryAreaRow {
  id: string;
  location: string;
  is_default: boolean;
}

export const DELIVERY_AREAS: DeliveryAreaRow[] = [
  { id: "da_01", location: "Beirut", is_default: true },
  { id: "da_02", location: "Tripoli", is_default: false },
  { id: "da_03", location: "Zahle", is_default: false },
];

// Lookups for pickers (region-scoped on the server at wire-up time).
export const REGIONS = [
  { id: "reg_lb", name: "Lebanon" },
  { id: "reg_ae", name: "United Arab Emirates" },
  { id: "reg_sa", name: "Saudi Arabia" },
];

export const LOCATIONS = [
  "Beirut",
  "Tripoli",
  "Saida",
  "Zahle",
  "Jounieh",
  "Byblos",
  "Tyre",
  "Baalbek",
];

export const CATEGORY_OPTIONS = [
  "Pantry",
  "Spices",
  "Sweets",
  "Beverages",
  "Olive Oil",
  "Honey & Jam",
];
export const PRODUCT_OPTIONS = [
  "Saffron Threads",
  "Cold-Pressed Olive Oil 1L",
  "Rose Water 500ml",
  "Sumac Powder 250g",
  "Pomegranate Molasses 750ml",
  "Pistachio Halva 400g",
  "Za'atar Premium Blend",
  "Tahini 600g",
];
export const PAYMENT_TYPES: PaymentType[] = ["COD", "CC", "QR", "NS"];
export const STORE_OPTIONS = [
  "Beirut Pantry",
  "Saida Sweets",
  "Tripoli Spices",
  "Cedar Goods Co.",
  "Zahle Olive Press",
];
