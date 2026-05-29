// Mock data shared across screens.

export type OrderStatus =
  | "PENDING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "DECLINED"
  | "DELIVERY_ISSUE";

// removed: P4 Wire — `Product` is now defined in components/editors/ProductEditor.tsx
// and mapped from the BE ProductDetail. No catalog screen imports this anymore.
export interface Product {
  id: string;
  name: string;
  sku: string;
  store: string;
  category: string;
  price: number;
  stock: number;
  status: "AVAILABLE" | "HIDDEN" | "ARCHIVED";
  variants: number;
  updated: string;
}

// removed: P4 Wire — products are fetched live via listProducts(); no consumer left.
export const PRODUCTS: Product[] = [
  {
    id: "p_001",
    name: "Saffron Threads, Persian Grade A",
    sku: "SAF-001",
    store: "Beirut Pantry",
    category: "Spices",
    price: 38.0,
    stock: 124,
    status: "AVAILABLE",
    variants: 3,
    updated: "2026-05-21",
  },
  {
    id: "p_002",
    name: "Cold-Pressed Olive Oil 1L",
    sku: "OIL-101",
    store: "Zahle Olive Press",
    category: "Pantry",
    price: 22.5,
    stock: 38,
    status: "AVAILABLE",
    variants: 2,
    updated: "2026-05-19",
  },
  {
    id: "p_003",
    name: "Rose Water 500ml",
    sku: "ROS-205",
    store: "Saida Sweets",
    category: "Beverages",
    price: 9.9,
    stock: 0,
    status: "HIDDEN",
    variants: 1,
    updated: "2026-05-15",
  },
  {
    id: "p_004",
    name: "Sumac Powder 250g",
    sku: "SUM-014",
    store: "Tripoli Spices",
    category: "Spices",
    price: 6.4,
    stock: 412,
    status: "AVAILABLE",
    variants: 4,
    updated: "2026-05-22",
  },
  {
    id: "p_005",
    name: "Pomegranate Molasses 750ml",
    sku: "POM-303",
    store: "Beirut Pantry",
    category: "Pantry",
    price: 11.2,
    stock: 76,
    status: "AVAILABLE",
    variants: 1,
    updated: "2026-05-20",
  },
  {
    id: "p_006",
    name: "Pistachio Halva 400g",
    sku: "HAL-088",
    store: "Saida Sweets",
    category: "Sweets",
    price: 18.0,
    stock: 22,
    status: "AVAILABLE",
    variants: 2,
    updated: "2026-05-23",
  },
  {
    id: "p_007",
    name: "Za'atar Premium Blend",
    sku: "ZAA-401",
    store: "Tripoli Spices",
    category: "Spices",
    price: 7.8,
    stock: 0,
    status: "ARCHIVED",
    variants: 1,
    updated: "2026-04-30",
  },
  {
    id: "p_008",
    name: "Tahini, Stone-Ground 600g",
    sku: "TAH-066",
    store: "Cedar Goods Co.",
    category: "Pantry",
    price: 13.5,
    stock: 198,
    status: "AVAILABLE",
    variants: 3,
    updated: "2026-05-18",
  },
];

export interface Order {
  id: string;
  number: string;
  customer: string;
  store: string;
  total: number;
  status: OrderStatus;
  payment: "PAID" | "PENDING" | "REFUNDED";
  items: number;
  placed: string;
}

export const ORDERS: Order[] = [
  {
    id: "o_4501",
    number: "MX-4501",
    customer: "Layla Haddad",
    store: "Beirut Pantry",
    total: 84.5,
    status: "PENDING",
    payment: "PAID",
    items: 4,
    placed: "2026-05-28 14:02",
  },
  {
    id: "o_4500",
    number: "MX-4500",
    customer: "Omar Khoury",
    store: "Saida Sweets",
    total: 32.0,
    status: "READY",
    payment: "PAID",
    items: 2,
    placed: "2026-05-28 12:48",
  },
  {
    id: "o_4499",
    number: "MX-4499",
    customer: "Nour Saade",
    store: "Zahle Olive Press",
    total: 145.2,
    status: "SHIPPED",
    payment: "PAID",
    items: 6,
    placed: "2026-05-27 18:11",
  },
  {
    id: "o_4498",
    number: "MX-4498",
    customer: "Rami Geagea",
    store: "Tripoli Spices",
    total: 19.8,
    status: "DELIVERED",
    payment: "PAID",
    items: 1,
    placed: "2026-05-27 09:30",
  },
  {
    id: "o_4497",
    number: "MX-4497",
    customer: "Aya Mansour",
    store: "Cedar Goods Co.",
    total: 56.0,
    status: "DELIVERY_ISSUE",
    payment: "PAID",
    items: 3,
    placed: "2026-05-26 22:14",
  },
  {
    id: "o_4496",
    number: "MX-4496",
    customer: "Karim Daher",
    store: "Beirut Pantry",
    total: 12.4,
    status: "CANCELLED",
    payment: "REFUNDED",
    items: 1,
    placed: "2026-05-26 16:00",
  },
  {
    id: "o_4495",
    number: "MX-4495",
    customer: "Sara Aoun",
    store: "Saida Sweets",
    total: 78.0,
    status: "DECLINED",
    payment: "PENDING",
    items: 2,
    placed: "2026-05-26 11:42",
  },
  {
    id: "o_4494",
    number: "MX-4494",
    customer: "Hadi Nasr",
    store: "Beirut Pantry",
    total: 41.9,
    status: "DELIVERED",
    payment: "PAID",
    items: 3,
    placed: "2026-05-25 20:08",
  },
];

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: number;
  joined: string;
  blocked: boolean;
}

export const CUSTOMERS: Customer[] = Array.from({ length: 12 }).map((_, i) => ({
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
  phone: `+961 70 ${100000 + i * 137}`.slice(0, 16),
  orders: 2 + ((i * 7) % 14),
  spent: 45 + ((i * 31) % 800),
  joined: `2025-${String(((i * 2) % 12) + 1).padStart(2, "0")}-12`,
  blocked: i === 6,
}));

export interface Coupon {
  code: string;
  scope: "PLATFORM" | "STORE";
  store?: string;
  discount: string;
  uses: number;
  cap: number;
  starts: string;
  ends: string;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
}

export const COUPONS: Coupon[] = [
  {
    code: "SAFFRON15",
    scope: "STORE",
    store: "Beirut Pantry",
    discount: "15%",
    uses: 84,
    cap: 500,
    starts: "2026-05-01",
    ends: "2026-06-30",
    status: "ACTIVE",
  },
  {
    code: "WELCOME10",
    scope: "PLATFORM",
    discount: "10 USD",
    uses: 1240,
    cap: 5000,
    starts: "2026-01-01",
    ends: "2026-12-31",
    status: "ACTIVE",
  },
  {
    code: "RAMADAN25",
    scope: "PLATFORM",
    discount: "25%",
    uses: 3120,
    cap: 3120,
    starts: "2026-03-01",
    ends: "2026-04-15",
    status: "EXPIRED",
  },
  {
    code: "OLIVE20",
    scope: "STORE",
    store: "Zahle Olive Press",
    discount: "20%",
    uses: 0,
    cap: 200,
    starts: "2026-06-15",
    ends: "2026-07-15",
    status: "SCHEDULED",
  },
];

// removed: P4 Wire — categories fetched live via listCategories(); no consumer left.
export interface Category {
  id: string;
  name: string;
  parent?: string;
  products: number;
}
// removed: P4 Wire
export const CATEGORIES: Category[] = [
  { id: "cat_01", name: "Pantry", products: 142 },
  { id: "cat_02", name: "Spices", products: 88 },
  { id: "cat_03", name: "Sweets", products: 47 },
  { id: "cat_04", name: "Beverages", products: 31 },
  { id: "cat_05", name: "Olive Oil", parent: "Pantry", products: 24 },
  { id: "cat_06", name: "Honey & Jam", parent: "Pantry", products: 19 },
];

// removed: P4 Wire — collections fetched live via listCollections(); no consumer left.
export const COLLECTIONS = [
  {
    id: "col_01",
    name: "Ramadan Essentials",
    scope: "PLATFORM",
    products: 28,
    status: "PUBLISHED",
  },
  {
    id: "col_02",
    name: "Beirut Pantry — Picks",
    scope: "STORE",
    store: "Beirut Pantry",
    products: 12,
    status: "PUBLISHED",
  },
  { id: "col_03", name: "Cold Pressed Oils", scope: "PLATFORM", products: 9, status: "DRAFT" },
];

// removed: P4 Wire — properties fetched live via listProperties(); no consumer left.
export const PROPERTIES = [
  { id: "pr_01", key: "Weight", values: ["100g", "250g", "500g", "1kg"], used: 84 },
  { id: "pr_02", key: "Origin", values: ["Lebanon", "Syria", "Iran", "Turkey"], used: 56 },
  { id: "pr_03", key: "Roast", values: ["Light", "Medium", "Dark"], used: 12 },
];

// removed: P4 Wire — tag suggestions sourced live; no catalog consumer left.
export const TAGS = ["new", "best-seller", "organic", "vegan", "halal", "gluten-free", "limited"];

// removed: P5 Wire — returns are fetched live via listReturns(); no consumer left.
// removed: P5 Wire — invoices are fetched live via listInvoices(); no consumer left.

export const COURIERS = [
  { id: "cou_01", name: "Beirut Express", areas: 12, active: true },
  { id: "cou_02", name: "Cedar Logistics", areas: 28, active: true },
  { id: "cou_03", name: "Mountain Routes", areas: 6, active: false },
];

export const PAYMENT_METHODS = [
  { id: "pm_01", name: "Cash on Delivery", type: "COD", active: true, fees: "0%" },
  { id: "pm_02", name: "Visa / Mastercard", type: "CARD", active: true, fees: "2.9% + 0.30 USD" },
  { id: "pm_03", name: "Whish Money", type: "WALLET", active: true, fees: "1.5%" },
  { id: "pm_04", name: "OMT Transfer", type: "BANK", active: false, fees: "1 USD" },
];

export const WALLET_TX = [
  {
    id: "tx_001",
    type: "CREDIT",
    amount: 240.0,
    note: "Payout — Orders MX-4490..4498",
    at: "2026-05-27 09:00",
  },
  { id: "tx_002", type: "DEBIT", amount: 12.5, note: "Platform fee", at: "2026-05-27 09:00" },
  {
    id: "tx_003",
    type: "CREDIT",
    amount: 84.5,
    note: "Order MX-4501 settled",
    at: "2026-05-28 14:10",
  },
];

export const USERS = [
  {
    id: "u_01",
    name: "Karim Atlas",
    email: "karim@mixlebs.com",
    type: "Admin",
    role: "Superuser",
    active: true,
    last: "2 min ago",
  },
  {
    id: "u_02",
    name: "Lara Khoury",
    email: "lara@mixlebs.com",
    type: "Staff",
    role: "Operations Manager",
    active: true,
    last: "12 min ago",
  },
  {
    id: "u_03",
    name: "Faris Aoun",
    email: "faris@mixlebs.com",
    type: "Staff",
    role: "Support Agent",
    active: true,
    last: "1 h ago",
  },
  {
    id: "u_04",
    name: "Beirut Pantry",
    email: "owner@beirutpantry.lb",
    type: "Store",
    role: "Store Owner",
    active: true,
    last: "3 h ago",
  },
  {
    id: "u_05",
    name: "Tripoli Spices",
    email: "owner@tripolispices.lb",
    type: "Store",
    role: "Store Owner",
    active: false,
    last: "5 days ago",
  },
];

export const ROLES = [
  { id: "ro_01", name: "Operations Manager", users: 4, policies: 18, scope: "Platform" },
  { id: "ro_02", name: "Support Agent", users: 7, policies: 9, scope: "Platform" },
  { id: "ro_03", name: "Finance", users: 2, policies: 12, scope: "Platform" },
  { id: "ro_04", name: "Store Owner", users: 86, policies: 22, scope: "Store" },
];

export const PERMISSIONS = [
  "dashboard.view_own",
  "dashboard.view_all_stores",
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "products.publish",
  "orders.view",
  "orders.transition_status",
  "orders.cancel",
  "orders.decline",
  "orders.tracking_append",
  "orders.export",
  "returns.view",
  "returns.approve",
  "returns.reject",
  "coupons.view",
  "coupons.create",
  "coupons.update",
  "stores.view",
  "stores.review_identity",
  "stores.transition_status",
  "users.view",
  "users.create_staff",
  "users.assign_role",
  "reviews.moderate",
  "chat.support_inbox_view",
  "audit_log.view",
  "feedback.view",
  "templates.view",
];

export const REVIEWS = [
  {
    id: "rv_01",
    product: "Saffron Threads",
    customer: "Layla Haddad",
    rating: 5,
    body: "Beautiful aroma, packed with care.",
    store: "Beirut Pantry",
    hidden: false,
    at: "2026-05-25",
  },
  {
    id: "rv_02",
    product: "Pistachio Halva",
    customer: "Omar Khoury",
    rating: 2,
    body: "Arrived crumbled, not fresh.",
    store: "Saida Sweets",
    hidden: false,
    at: "2026-05-24",
  },
  {
    id: "rv_03",
    product: "Sumac Powder",
    customer: "Nour Saade",
    rating: 4,
    body: "Bright and zesty.",
    store: "Tripoli Spices",
    hidden: false,
    at: "2026-05-23",
  },
  {
    id: "rv_04",
    product: "Rose Water",
    customer: "Rami Geagea",
    rating: 1,
    body: "Smelled off.",
    store: "Saida Sweets",
    hidden: true,
    at: "2026-05-22",
  },
];

export const NOTIFICATIONS = [
  {
    id: "n_01",
    title: "New order MX-4501",
    body: "Layla Haddad placed an order for 84.50 USD.",
    at: "2 min ago",
    read: false,
    kind: "order",
  },
  {
    id: "n_02",
    title: "Return request approved",
    body: "Return r_801 was approved by Lara Khoury.",
    at: "1 h ago",
    read: false,
    kind: "return",
  },
  {
    id: "n_03",
    title: "Store verification submitted",
    body: "Tripoli Spices uploaded identity documents.",
    at: "4 h ago",
    read: true,
    kind: "store",
  },
  {
    id: "n_04",
    title: "Coupon SAFFRON15 hit 80% usage",
    body: "84 of 500 redemptions used.",
    at: "Yesterday",
    read: true,
    kind: "promo",
  },
];

export const SUPPORT_SESSIONS = [
  {
    id: "ss_01",
    customer: "Layla Haddad",
    topic: "Where is my order?",
    status: "OPEN",
    assignee: null,
    last: "Just now",
  },
  {
    id: "ss_02",
    customer: "Omar Khoury",
    topic: "Refund question",
    status: "OPEN",
    assignee: "Lara Khoury",
    last: "8 min",
  },
  {
    id: "ss_03",
    customer: "Nour Saade",
    topic: "Coupon not working",
    status: "CLOSED",
    assignee: "Faris Aoun",
    last: "Yesterday",
  },
];

export const CHATS = [
  {
    id: "ch_01",
    with: "Tripoli Spices",
    last: "We will dispatch tomorrow morning.",
    unread: 2,
    at: "12:01",
  },
  {
    id: "ch_02",
    with: "Beirut Pantry",
    last: "Sure, please share the SKU.",
    unread: 0,
    at: "11:42",
  },
  { id: "ch_03", with: "Zahle Olive Press", last: "Thanks!", unread: 0, at: "Yesterday" },
];

export const AUDIT_LOG = [
  {
    id: "a_001",
    actor: "Karim Atlas",
    action: "products.publish",
    target: "p_004",
    at: "14:08",
    ip: "188.40.12.4",
  },
  {
    id: "a_002",
    actor: "Lara Khoury",
    action: "orders.transition_status",
    target: "o_4500",
    at: "13:51",
    ip: "82.137.5.11",
  },
  {
    id: "a_003",
    actor: "Faris Aoun",
    action: "chat.support_pickup",
    target: "ss_02",
    at: "13:44",
    ip: "82.137.5.22",
  },
  {
    id: "a_004",
    actor: "Beirut Pantry",
    action: "products.update",
    target: "p_001",
    at: "12:30",
    ip: "176.40.2.91",
  },
];

export const FEEDBACK = [
  {
    id: "fb_01",
    from: "Layla Haddad",
    channel: "Mobile App",
    subject: "Loving the new search!",
    at: "Today",
    status: "OPEN",
  },
  {
    id: "fb_02",
    from: "Omar Khoury",
    channel: "Mobile App",
    subject: "Filter by store please",
    at: "Yesterday",
    status: "OPEN",
  },
  {
    id: "fb_03",
    from: "Nour Saade",
    channel: "Web",
    subject: "Checkout was smooth",
    at: "2 days ago",
    status: "RESOLVED",
  },
];

export const COUNTRIES = [
  { code: "LB", name: "Lebanon", currency: "USD/LBP", cities: 14 },
  { code: "AE", name: "United Arab Emirates", currency: "AED", cities: 7 },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", cities: 23 },
  { code: "JO", name: "Jordan", currency: "JOD", cities: 12 },
];

export const CITIES = [
  { name: "Beirut", country: "Lebanon" },
  { name: "Tripoli", country: "Lebanon" },
  { name: "Saida", country: "Lebanon" },
  { name: "Zahle", country: "Lebanon" },
  { name: "Dubai", country: "UAE" },
  { name: "Abu Dhabi", country: "UAE" },
];

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0 },
  { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", rate: 89500 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67 },
];

export const LANGUAGES = [
  { code: "en", name: "English", native: "English", rtl: false, active: true },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true, active: true },
  { code: "fr", name: "French", native: "Français", rtl: false, active: false },
];

export const FAQ = [
  { id: "fq_01", q: "How do I track my order?", category: "Orders", updated: "2026-05-10" },
  { id: "fq_02", q: "What is your return policy?", category: "Returns", updated: "2026-05-08" },
  { id: "fq_03", q: "How do I become a seller?", category: "Stores", updated: "2026-04-22" },
];

export const TEMPLATES = [
  {
    id: "tp_01",
    name: "Order placed — email",
    channel: "email",
    lang: "en/ar",
    updated: "2026-05-12",
  },
  {
    id: "tp_02",
    name: "Order shipped — SMS",
    channel: "sms",
    lang: "en/ar",
    updated: "2026-05-12",
  },
  {
    id: "tp_03",
    name: "Return approved — push",
    channel: "push",
    lang: "en/ar",
    updated: "2026-04-30",
  },
];

export const ASSETS = Array.from({ length: 12 }).map((_, i) => ({
  id: `as_${i}`,
  name: [
    "saffron.jpg",
    "oil-bottle.png",
    "rose-water.jpg",
    "sumac.png",
    "molasses.jpg",
    "halva.png",
    "zaatar.jpg",
    "tahini.png",
    "label.svg",
    "banner.jpg",
    "icon.png",
    "story-bg.jpg",
  ][i],
  size: `${((80 + i * 13) % 600) + 40} KB`,
  shared: i % 3 === 0,
  used: (i * 3) % 8,
}));
