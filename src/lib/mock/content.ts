// Local, read-only mock data for the Content / Communications / Chat / Support /
// Reviews domain (§13–15). Lives outside the shared mock-data.ts so this domain
// can carry the richer shapes the plan's columns/fields need without editing
// shared files. Everything here is static demo data.

// ─── Resources / FAQ (§13.1, §13.2) ──────────────────────────────
export type ResourceSection = "FAQ" | "Privacy Policy" | "Terms" | "Article";
export type ResourceContentType = "QA" | "Article";
export type ResourceAudience = "CUSTOMER" | "STORE" | "STAFF";

export interface ResourceTranslation {
  lang: "en" | "ar";
  title: string;
  content: string;
}
export interface ResourceEntry {
  id: string;
  slug: string;
  section: ResourceSection;
  content_type: ResourceContentType;
  order: number;
  audiences: ResourceAudience[];
  published: boolean;
  updated_at: string;
  translations: ResourceTranslation[];
}

export const RESOURCES: ResourceEntry[] = [
  {
    id: "rs_01",
    slug: "how-do-i-track-my-order",
    section: "FAQ",
    content_type: "QA",
    order: 1,
    audiences: ["CUSTOMER"],
    published: true,
    updated_at: "2026-05-10",
    translations: [
      {
        lang: "en",
        title: "How do I track my order?",
        content:
          "Open the order from your account and tap Track. You'll see live status and the courier's updates.",
      },
      {
        lang: "ar",
        title: "كيف أتتبّع طلبي؟",
        content: "افتح الطلب من حسابك واضغط «تتبّع» لرؤية الحالة المباشرة وتحديثات شركة الشحن.",
      },
    ],
  },
  {
    id: "rs_02",
    slug: "what-is-your-return-policy",
    section: "FAQ",
    content_type: "QA",
    order: 2,
    audiences: ["CUSTOMER", "STORE"],
    published: true,
    updated_at: "2026-05-08",
    translations: [
      {
        lang: "en",
        title: "What is your return policy?",
        content:
          "Most items can be returned within 14 days of delivery in their original condition.",
      },
      {
        lang: "ar",
        title: "ما هي سياسة الإرجاع؟",
        content: "يمكن إرجاع معظم المنتجات خلال ١٤ يومًا من التسليم وبحالتها الأصلية.",
      },
    ],
  },
  {
    id: "rs_03",
    slug: "how-do-i-become-a-seller",
    section: "FAQ",
    content_type: "QA",
    order: 3,
    audiences: ["STORE"],
    published: false,
    updated_at: "2026-04-22",
    translations: [
      {
        lang: "en",
        title: "How do I become a seller?",
        content: "Register a store, submit your identity documents and wait for verification.",
      },
      {
        lang: "ar",
        title: "كيف أصبح بائعًا؟",
        content: "سجّل متجرًا، وقدّم وثائق هويتك، وانتظر التحقّق.",
      },
    ],
  },
  {
    id: "rs_04",
    slug: "privacy-policy",
    section: "Privacy Policy",
    content_type: "Article",
    order: 1,
    audiences: ["CUSTOMER", "STORE", "STAFF"],
    published: true,
    updated_at: "2026-05-01",
    translations: [
      {
        lang: "en",
        title: "Privacy policy",
        content:
          "We collect the minimum data needed to operate the marketplace. This policy explains what we store and why.",
      },
      {
        lang: "ar",
        title: "سياسة الخصوصية",
        content:
          "نجمع الحد الأدنى من البيانات اللازمة لتشغيل السوق. توضّح هذه السياسة ما نخزّنه ولماذا.",
      },
    ],
  },
  {
    id: "rs_05",
    slug: "terms-of-service",
    section: "Terms",
    content_type: "Article",
    order: 1,
    audiences: ["CUSTOMER", "STORE", "STAFF"],
    published: true,
    updated_at: "2026-04-18",
    translations: [
      {
        lang: "en",
        title: "Terms of service",
        content:
          "By using Mixlebs you agree to these terms. They bind every customer, store and staff member.",
      },
      {
        lang: "ar",
        title: "شروط الخدمة",
        content: "باستخدامك ميكسلبس فإنك توافق على هذه الشروط المُلزِمة لكل عميل ومتجر وموظف.",
      },
    ],
  },
  {
    id: "rs_06",
    slug: "becoming-a-mixlebs-seller-guide",
    section: "Article",
    content_type: "Article",
    order: 1,
    audiences: ["STORE"],
    published: true,
    updated_at: "2026-05-12",
    translations: [
      {
        lang: "en",
        title: "Becoming a Mixlebs seller — full guide",
        content: "A step-by-step walkthrough of registration, verification and your first listing.",
      },
      {
        lang: "ar",
        title: "أن تصبح بائعًا في ميكسلبس — الدليل الكامل",
        content: "شرح خطوة بخطوة للتسجيل والتحقّق وأول منتج لك.",
      },
    ],
  },
  {
    id: "rs_07",
    slug: "shipping-internationally",
    section: "Article",
    content_type: "Article",
    order: 2,
    audiences: ["STORE"],
    published: false,
    updated_at: "2026-05-08",
    translations: [
      {
        lang: "en",
        title: "Shipping internationally from Lebanon",
        content: "Customs, couriers and packaging tips for cross-border orders.",
      },
      {
        lang: "ar",
        title: "الشحن الدولي من لبنان",
        content: "نصائح حول الجمارك وشركات الشحن والتغليف للطلبات العابرة للحدود.",
      },
    ],
  },
];

// ─── Communication templates (§13.3) ─────────────────────────────
export type CommType =
  | "ORDER_PLACED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "RETURN_APPROVED"
  | "STORE_VERIFIED"
  | "PASSWORD_RESET"
  | "WELCOME";
export type CommChannel = "NOTIFICATION" | "EMAIL" | "SMS";

export interface TemplateTranslation {
  lang: "en" | "ar";
  title: string;
  content: string;
}
export interface CommTemplate {
  id: string;
  type: CommType;
  channel: CommChannel;
  is_enabled: boolean;
  translations: TemplateTranslation[];
  last_edited: string;
}

export const COMM_TEMPLATES: CommTemplate[] = [
  {
    id: "tp_01",
    type: "ORDER_PLACED",
    channel: "EMAIL",
    is_enabled: true,
    last_edited: "2026-05-12",
    translations: [
      {
        lang: "en",
        title: "Your order {order_id} is confirmed",
        content: "Hi {customer_name}, we received your order {order_id} for {order_total}.",
      },
      {
        lang: "ar",
        title: "تم تأكيد طلبك {order_id}",
        content: "مرحبًا {customer_name}، استلمنا طلبك {order_id} بقيمة {order_total}.",
      },
    ],
  },
  {
    id: "tp_02",
    type: "ORDER_SHIPPED",
    channel: "SMS",
    is_enabled: true,
    last_edited: "2026-05-12",
    translations: [
      {
        lang: "en",
        title: "Order shipped",
        content: "{customer_name}, order {order_id} is on the way. Track: {tracking_url}",
      },
      {
        lang: "ar",
        title: "تم شحن الطلب",
        content: "{customer_name}، طلبك {order_id} في الطريق. التتبّع: {tracking_url}",
      },
    ],
  },
  {
    id: "tp_03",
    type: "RETURN_APPROVED",
    channel: "NOTIFICATION",
    is_enabled: false,
    last_edited: "2026-04-30",
    translations: [
      {
        lang: "en",
        title: "Return approved",
        content: "Your return for {order_id} was approved. {store_name} will process it shortly.",
      },
      {
        lang: "ar",
        title: "تمت الموافقة على الإرجاع",
        content: "تمت الموافقة على إرجاع {order_id}. سيعالجه {store_name} قريبًا.",
      },
    ],
  },
  {
    id: "tp_04",
    type: "STORE_VERIFIED",
    channel: "EMAIL",
    is_enabled: true,
    last_edited: "2026-04-22",
    translations: [
      {
        lang: "en",
        title: "{store_name} is verified",
        content: "Congratulations {customer_name}, {store_name} is now verified and can sell.",
      },
      {
        lang: "ar",
        title: "تم توثيق {store_name}",
        content: "تهانينا {customer_name}، تم توثيق {store_name} ويمكنه البيع الآن.",
      },
    ],
  },
];

// Placeholders the variable picker offers (CommunicationPlaceholderEnums).
export const COMM_PLACEHOLDERS = [
  "customer_name",
  "order_id",
  "order_total",
  "store_name",
  "tracking_url",
  "reset_link",
  "verification_code",
  "support_email",
];

// ─── Communication channels (§13.4) ──────────────────────────────
export interface ChannelSetting {
  key: CommChannel;
  provider: string;
  sender: string;
  enabled: boolean;
  daily_quota: number;
  throttle_per_min: number;
}
export const CHANNEL_SETTINGS: ChannelSetting[] = [
  {
    key: "EMAIL",
    provider: "Postmark",
    sender: "no-reply@mixlebs.com",
    enabled: true,
    daily_quota: 50000,
    throttle_per_min: 600,
  },
  {
    key: "SMS",
    provider: "Twilio",
    sender: "+961 1 234 567",
    enabled: true,
    daily_quota: 10000,
    throttle_per_min: 120,
  },
  {
    key: "NOTIFICATION",
    provider: "OneSignal",
    sender: "Mixlebs App",
    enabled: true,
    daily_quota: 200000,
    throttle_per_min: 2000,
  },
];

// ─── Notifications inbox (§13.5) ─────────────────────────────────
export type NotifType = "order" | "return" | "store" | "promo" | "system";
export type SentStatus = "SENT" | "PENDING" | "FAILED";
export interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  channel: CommChannel;
  sent_status: SentStatus;
  is_opened: boolean;
  created_at: string;
  link?: string;
}

export const NOTIF_INBOX: NotifItem[] = [
  {
    id: "n_01",
    type: "order",
    title: "New order MX-4501",
    body: "Layla Haddad placed an order for 84.50 USD.",
    channel: "NOTIFICATION",
    sent_status: "SENT",
    is_opened: false,
    created_at: "2 min ago",
    link: "/orders/o_4501",
  },
  {
    id: "n_02",
    type: "return",
    title: "Return request approved",
    body: "Return r_801 was approved by Lara Khoury.",
    channel: "EMAIL",
    sent_status: "SENT",
    is_opened: false,
    created_at: "1 h ago",
    link: "/returns/r_801",
  },
  {
    id: "n_03",
    type: "store",
    title: "Store verification submitted",
    body: "Tripoli Spices uploaded identity documents.",
    channel: "NOTIFICATION",
    sent_status: "SENT",
    is_opened: true,
    created_at: "4 h ago",
    link: "/stores/str_03",
  },
  {
    id: "n_04",
    type: "promo",
    title: "Coupon SAFFRON15 hit 80% usage",
    body: "84 of 500 redemptions used.",
    channel: "EMAIL",
    sent_status: "PENDING",
    is_opened: true,
    created_at: "Yesterday",
    link: "/coupons",
  },
  {
    id: "n_05",
    type: "system",
    title: "SMS delivery failed",
    body: "Carrier rejected message to +9613000000.",
    channel: "SMS",
    sent_status: "FAILED",
    is_opened: false,
    created_at: "Yesterday",
  },
];

// ─── Direct messages (§14.1, §14.2) ──────────────────────────────
export interface DmThread {
  user_id: string;
  name: string;
  initials: string;
  online: boolean;
  last: string;
  unread: number;
  activity: string;
}
export interface DmMessage {
  id: string;
  own: boolean;
  body: string;
  at: string;
  read: boolean;
  edited?: boolean;
}
export const DM_THREADS: DmThread[] = [
  {
    user_id: "u_01",
    name: "Tripoli Spices",
    initials: "TS",
    online: true,
    last: "We will dispatch tomorrow morning.",
    unread: 2,
    activity: "12:01",
  },
  {
    user_id: "u_02",
    name: "Beirut Pantry",
    initials: "BP",
    online: false,
    last: "Sure, please share the SKU.",
    unread: 0,
    activity: "11:42",
  },
  {
    user_id: "u_03",
    name: "Zahle Olive Press",
    initials: "ZO",
    online: false,
    last: "Thanks!",
    unread: 0,
    activity: "Yesterday",
  },
];
export const DM_MESSAGES: Record<string, DmMessage[]> = {
  u_01: [
    { id: "m1", own: false, body: "Hi, when will my restock order ship?", at: "11:58", read: true },
    { id: "m2", own: true, body: "Checking with the warehouse now.", at: "11:59", read: true },
    { id: "m3", own: false, body: "Thanks!", at: "12:00", read: true },
    { id: "m4", own: false, body: "We will dispatch tomorrow morning.", at: "12:01", read: false },
  ],
  u_02: [
    {
      id: "m1",
      own: false,
      body: "Can you check stock on the saffron SKU?",
      at: "11:40",
      read: true,
    },
    {
      id: "m2",
      own: true,
      body: "Sure, please share the SKU.",
      at: "11:42",
      read: true,
      edited: true,
    },
  ],
  u_03: [
    { id: "m1", own: true, body: "Your payout was processed.", at: "Yesterday", read: true },
    { id: "m2", own: false, body: "Thanks!", at: "Yesterday", read: true },
  ],
};

// ─── Support inbox + session (§14.3, §14.4) ──────────────────────
export type SupportStatus = "OPEN" | "ASSIGNED" | "AWAITING_FEEDBACK" | "CLOSED";
export type SenderRole = "CUSTOMER" | "STAFF" | "SYSTEM";
export interface SessionMessage {
  id: string;
  sender_role: SenderRole;
  message: string;
  type: "text" | "image" | "system";
  is_read: boolean;
  at: string;
}
export interface SupportSession {
  id: string;
  customer: string;
  phone: string;
  email: string;
  last: string;
  status: SupportStatus;
  assigned_to: string | null;
  started_at: string;
  opened_at: string | null;
  awaiting_since: string | null;
  closed_at: string | null;
  waiting: string;
  rating: number | null;
  feedback: string | null;
  messages: SessionMessage[];
}

export const SUPPORT_INBOX: SupportSession[] = [
  {
    id: "ss_01",
    customer: "Layla Haddad",
    phone: "+9613111111",
    email: "layla@example.com",
    last: "Where is my order?",
    status: "OPEN",
    assigned_to: null,
    started_at: "2026-05-29 09:12",
    opened_at: null,
    awaiting_since: null,
    closed_at: null,
    waiting: "12 min",
    rating: null,
    feedback: null,
    messages: [
      {
        id: "sm1",
        sender_role: "SYSTEM",
        message: "Session started.",
        type: "system",
        is_read: true,
        at: "09:12",
      },
      {
        id: "sm2",
        sender_role: "CUSTOMER",
        message: "Hi, where is my order MX-4501?",
        type: "text",
        is_read: true,
        at: "09:12",
      },
    ],
  },
  {
    id: "ss_02",
    customer: "Omar Khoury",
    phone: "+9613222222",
    email: "omar@example.com",
    last: "Thanks, that helps.",
    status: "ASSIGNED",
    assigned_to: "me",
    started_at: "2026-05-29 08:40",
    opened_at: "2026-05-29 08:45",
    awaiting_since: null,
    closed_at: null,
    waiting: "—",
    rating: null,
    feedback: null,
    messages: [
      {
        id: "sm1",
        sender_role: "CUSTOMER",
        message: "I want a refund on my last order.",
        type: "text",
        is_read: true,
        at: "08:40",
      },
      {
        id: "sm2",
        sender_role: "STAFF",
        message: "I can help with that — one moment.",
        type: "text",
        is_read: true,
        at: "08:46",
      },
      {
        id: "sm3",
        sender_role: "CUSTOMER",
        message: "Thanks, that helps.",
        type: "text",
        is_read: false,
        at: "08:50",
      },
    ],
  },
  {
    id: "ss_03",
    customer: "Nour Saade",
    phone: "+9613333333",
    email: "nour@example.com",
    last: "Coupon still not working.",
    status: "ASSIGNED",
    assigned_to: "Lara Khoury",
    started_at: "2026-05-29 07:55",
    opened_at: "2026-05-29 08:00",
    awaiting_since: null,
    closed_at: null,
    waiting: "—",
    rating: null,
    feedback: null,
    messages: [
      {
        id: "sm1",
        sender_role: "CUSTOMER",
        message: "Coupon SAFFRON15 won't apply.",
        type: "text",
        is_read: true,
        at: "07:55",
      },
    ],
  },
  {
    id: "ss_04",
    customer: "Rami Geagea",
    phone: "+9613444444",
    email: "rami@example.com",
    last: "I'll wait for the refund.",
    status: "AWAITING_FEEDBACK",
    assigned_to: "me",
    started_at: "2026-05-28 14:10",
    opened_at: "2026-05-28 14:12",
    awaiting_since: "2026-05-28 15:00",
    closed_at: null,
    waiting: "—",
    rating: null,
    feedback: null,
    messages: [
      {
        id: "sm1",
        sender_role: "CUSTOMER",
        message: "My order arrived damaged.",
        type: "text",
        is_read: true,
        at: "14:10",
      },
      {
        id: "sm2",
        sender_role: "STAFF",
        message: "Sorry about that — refund issued.",
        type: "text",
        is_read: true,
        at: "14:30",
      },
      {
        id: "sm3",
        sender_role: "SYSTEM",
        message: "Session moved to awaiting feedback.",
        type: "system",
        is_read: true,
        at: "15:00",
      },
    ],
  },
  {
    id: "ss_05",
    customer: "Aya Mansour",
    phone: "+9613555555",
    email: "aya@example.com",
    last: "Great, thank you!",
    status: "CLOSED",
    assigned_to: "Faris Aoun",
    started_at: "2026-05-27 10:00",
    opened_at: "2026-05-27 10:05",
    awaiting_since: "2026-05-27 10:40",
    closed_at: "2026-05-27 11:00",
    waiting: "—",
    rating: 5,
    feedback: "Fast and friendly support.",
    messages: [
      {
        id: "sm1",
        sender_role: "CUSTOMER",
        message: "How do I change my delivery address?",
        type: "text",
        is_read: true,
        at: "10:00",
      },
      {
        id: "sm2",
        sender_role: "STAFF",
        message: "I've updated it for you.",
        type: "text",
        is_read: true,
        at: "10:30",
      },
      {
        id: "sm3",
        sender_role: "CUSTOMER",
        message: "Great, thank you!",
        type: "text",
        is_read: true,
        at: "10:35",
      },
    ],
  },
];

export const STAFF_MEMBERS = ["Lara Khoury", "Faris Aoun", "Karim Atlas"];
export const RECENT_ORDERS = ["MX-4501", "MX-4498", "MX-4490"];

// ─── Reviews moderation (§15) ────────────────────────────────────
export interface ProductReview {
  id: string;
  product: string;
  store: string;
  rating: number;
  comment: string;
  customer: string;
  is_purchased: boolean;
  created_at: string;
  hidden: boolean;
}
export const PRODUCT_REVIEWS: ProductReview[] = [
  {
    id: "rv_01",
    product: "Saffron Threads",
    store: "Beirut Pantry",
    rating: 5,
    comment: "Beautiful aroma, packed with care.",
    customer: "Layla Haddad",
    is_purchased: true,
    created_at: "2026-05-25",
    hidden: false,
  },
  {
    id: "rv_02",
    product: "Pistachio Halva",
    store: "Saida Sweets",
    rating: 2,
    comment: "Arrived crumbled, not fresh.",
    customer: "Omar Khoury",
    is_purchased: true,
    created_at: "2026-05-24",
    hidden: false,
  },
  {
    id: "rv_03",
    product: "Sumac Powder",
    store: "Tripoli Spices",
    rating: 4,
    comment: "Bright and zesty.",
    customer: "Nour Saade",
    is_purchased: false,
    created_at: "2026-05-23",
    hidden: false,
  },
  {
    id: "rv_04",
    product: "Rose Water",
    store: "Saida Sweets",
    rating: 1,
    comment: "Smelled off.",
    customer: "Rami Geagea",
    is_purchased: true,
    created_at: "2026-05-22",
    hidden: true,
  },
  {
    id: "rv_05",
    product: "Zaatar Blend",
    store: "Beirut Pantry",
    rating: 5,
    comment: "Authentic and fragrant.",
    customer: "Aya Mansour",
    is_purchased: true,
    created_at: "2026-05-21",
    hidden: false,
  },
];

export interface StoreReview {
  id: string;
  store: string;
  rating: number;
  comment: string;
  customer: string;
  created_at: string;
  hidden: boolean;
}
export const STORE_REVIEWS: StoreReview[] = [
  {
    id: "srv_01",
    store: "Beirut Pantry",
    rating: 5,
    comment: "Fast shipping and beautiful packaging.",
    customer: "Layla Haddad",
    created_at: "2026-05-26",
    hidden: false,
  },
  {
    id: "srv_02",
    store: "Saida Sweets",
    rating: 2,
    comment: "Order arrived late and incomplete.",
    customer: "Omar Khoury",
    created_at: "2026-05-25",
    hidden: false,
  },
  {
    id: "srv_03",
    store: "Tripoli Spices",
    rating: 5,
    comment: "Excellent customer support.",
    customer: "Nour Saade",
    created_at: "2026-05-24",
    hidden: false,
  },
  {
    id: "srv_04",
    store: "Cedar Goods Co.",
    rating: 4,
    comment: "Solid quality, will reorder.",
    customer: "Hadi Nassar",
    created_at: "2026-05-23",
    hidden: false,
  },
  {
    id: "srv_05",
    store: "Zahle Olive Press",
    rating: 1,
    comment: "Never received my order.",
    customer: "Aya Mansour",
    created_at: "2026-05-22",
    hidden: true,
  },
];

export const COMM_TYPES: CommType[] = [
  "ORDER_PLACED",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "RETURN_APPROVED",
  "STORE_VERIFIED",
  "PASSWORD_RESET",
  "WELCOME",
];
export const COMM_CHANNELS: CommChannel[] = ["NOTIFICATION", "EMAIL", "SMS"];
