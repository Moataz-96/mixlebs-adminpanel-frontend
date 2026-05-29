// Local, domain-owned mock for the Catalog screens (§7.4–7.10). Shapes mirror
// the mixlebs_core models so the wiring engineer can swap these for live data
// without touching the components. Read-only; the shared mock-data.ts stays
// untouched.

export type CollectionScope = "PLATFORM" | "STORE";
export type CollectionType = "manual" | "smart";
export type DisplayStyle = "carousel" | "grid" | "hero" | "banner" | "list";

export interface CollectionRow {
  id: string;
  title: string;
  slug: string;
  scope: CollectionScope;
  store: string | null;
  collection_type: CollectionType;
  display_style: DisplayStyle;
  cached_product_count: number;
  is_active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export const COLLECTIONS_FULL: CollectionRow[] = [
  {
    id: "col_01",
    title: "Ramadan Essentials",
    slug: "ramadan-essentials",
    scope: "PLATFORM",
    store: null,
    collection_type: "manual",
    display_style: "hero",
    cached_product_count: 28,
    is_active: true,
    priority: 100,
    starts_at: "2026-03-01",
    ends_at: "2026-04-15",
    created_at: "2026-02-10",
  },
  {
    id: "col_02",
    title: "Beirut Pantry — Picks",
    slug: "beirut-pantry-picks",
    scope: "STORE",
    store: "Beirut Pantry",
    collection_type: "manual",
    display_style: "grid",
    cached_product_count: 12,
    is_active: true,
    priority: 40,
    starts_at: null,
    ends_at: null,
    created_at: "2026-04-02",
  },
  {
    id: "col_03",
    title: "Cold Pressed Oils",
    slug: "cold-pressed-oils",
    scope: "PLATFORM",
    store: null,
    collection_type: "smart",
    display_style: "carousel",
    cached_product_count: 9,
    is_active: false,
    priority: 20,
    starts_at: "2026-06-15",
    ends_at: null,
    created_at: "2026-05-01",
  },
  {
    id: "col_04",
    title: "Best Sellers",
    slug: "best-sellers",
    scope: "PLATFORM",
    store: null,
    collection_type: "smart",
    display_style: "list",
    cached_product_count: 50,
    is_active: true,
    priority: 90,
    starts_at: null,
    ends_at: null,
    created_at: "2026-01-20",
  },
  {
    id: "col_05",
    title: "Saida Sweets — Eid Box",
    slug: "saida-sweets-eid-box",
    scope: "STORE",
    store: "Saida Sweets",
    collection_type: "manual",
    display_style: "banner",
    cached_product_count: 6,
    is_active: true,
    priority: 30,
    starts_at: "2026-05-20",
    ends_at: "2026-06-10",
    created_at: "2026-05-12",
  },
];

export const DISPLAY_STYLES: DisplayStyle[] = ["carousel", "grid", "hero", "banner", "list"];

// Categories — parent → children, with the §7.6 detail fields.
export interface CategoryNode {
  id: string;
  parent_id: string | null;
  identifier: string;
  name: string;
  products: number;
  is_published: boolean;
  returns: boolean;
  translations: { lang: string; name: string; description: string }[];
  properties: {
    id: string;
    property: string;
    is_required: boolean;
    is_characteristic: boolean;
    characteristic_order: number;
  }[];
}

export const CATEGORY_TREE: CategoryNode[] = [
  {
    id: "cat_01",
    parent_id: null,
    identifier: "pantry",
    name: "Pantry",
    products: 142,
    is_published: true,
    returns: true,
    translations: [
      { lang: "en", name: "Pantry", description: "Shelf-stable staples." },
      { lang: "ar", name: "مؤن", description: "أساسيات طويلة الصلاحية." },
    ],
    properties: [
      {
        id: "cp_1",
        property: "Weight",
        is_required: true,
        is_characteristic: true,
        characteristic_order: 1,
      },
      {
        id: "cp_2",
        property: "Origin",
        is_required: false,
        is_characteristic: true,
        characteristic_order: 2,
      },
    ],
  },
  {
    id: "cat_05",
    parent_id: "cat_01",
    identifier: "olive_oil",
    name: "Olive Oil",
    products: 24,
    is_published: true,
    returns: false,
    translations: [
      { lang: "en", name: "Olive Oil", description: "" },
      { lang: "ar", name: "زيت الزيتون", description: "" },
    ],
    properties: [
      {
        id: "cp_3",
        property: "Volume",
        is_required: true,
        is_characteristic: true,
        characteristic_order: 1,
      },
    ],
  },
  {
    id: "cat_06",
    parent_id: "cat_01",
    identifier: "honey_jam",
    name: "Honey & Jam",
    products: 19,
    is_published: false,
    returns: true,
    translations: [
      { lang: "en", name: "Honey & Jam", description: "" },
      { lang: "ar", name: "عسل ومربى", description: "" },
    ],
    properties: [],
  },
  {
    id: "cat_02",
    parent_id: null,
    identifier: "spices",
    name: "Spices",
    products: 88,
    is_published: true,
    returns: false,
    translations: [
      { lang: "en", name: "Spices", description: "Whole and ground spices." },
      { lang: "ar", name: "بهارات", description: "بهارات كاملة ومطحونة." },
    ],
    properties: [
      {
        id: "cp_4",
        property: "Weight",
        is_required: true,
        is_characteristic: true,
        characteristic_order: 1,
      },
      {
        id: "cp_5",
        property: "Roast",
        is_required: false,
        is_characteristic: false,
        characteristic_order: 0,
      },
    ],
  },
  {
    id: "cat_03",
    parent_id: null,
    identifier: "sweets",
    name: "Sweets",
    products: 47,
    is_published: true,
    returns: true,
    translations: [
      { lang: "en", name: "Sweets", description: "" },
      { lang: "ar", name: "حلويات", description: "" },
    ],
    properties: [],
  },
  {
    id: "cat_04",
    parent_id: null,
    identifier: "beverages",
    name: "Beverages",
    products: 31,
    is_published: true,
    returns: false,
    translations: [
      { lang: "en", name: "Beverages", description: "" },
      { lang: "ar", name: "مشروبات", description: "" },
    ],
    properties: [],
  },
];

export const CATEGORY_SUGGESTION_LOG: {
  id: string;
  property: string;
  suggested_by: string;
  at: string;
}[] = [
  { id: "cpl_1", property: "Acidity", suggested_by: "Beirut Pantry", at: "2026-05-20" },
  { id: "cpl_2", property: "Harvest year", suggested_by: "Zahle Olive Press", at: "2026-05-18" },
];

// Properties (§7.7)
export type PropDataType = "string" | "number" | "boolean" | "date";
export type PropFieldType = "text" | "select" | "multiselect" | "toggle" | "number";

export interface PropertyRow {
  id: string;
  key: string;
  placeholder: string;
  is_multilingual: boolean;
  is_multi_value: boolean;
  is_attribute: boolean;
  is_modifiable: boolean;
  data_type: PropDataType;
  field_type: PropFieldType;
  used: number;
  values: string[];
  translations: { lang: string; label: string }[];
}

export const PROPERTIES_FULL: PropertyRow[] = [
  {
    id: "pr_01",
    key: "Weight",
    placeholder: "e.g. 250g",
    is_multilingual: false,
    is_multi_value: true,
    is_attribute: true,
    is_modifiable: true,
    data_type: "string",
    field_type: "select",
    used: 84,
    values: ["100g", "250g", "500g", "1kg"],
    translations: [
      { lang: "en", label: "Weight" },
      { lang: "ar", label: "الوزن" },
    ],
  },
  {
    id: "pr_02",
    key: "Origin",
    placeholder: "Country of origin",
    is_multilingual: true,
    is_multi_value: false,
    is_attribute: true,
    is_modifiable: true,
    data_type: "string",
    field_type: "select",
    used: 56,
    values: ["Lebanon", "Syria", "Iran", "Turkey"],
    translations: [
      { lang: "en", label: "Origin" },
      { lang: "ar", label: "المنشأ" },
    ],
  },
  {
    id: "pr_03",
    key: "Roast",
    placeholder: "Roast level",
    is_multilingual: true,
    is_multi_value: false,
    is_attribute: false,
    is_modifiable: false,
    data_type: "string",
    field_type: "select",
    used: 12,
    values: ["Light", "Medium", "Dark"],
    translations: [
      { lang: "en", label: "Roast" },
      { lang: "ar", label: "التحميص" },
    ],
  },
  {
    id: "pr_04",
    key: "Organic",
    placeholder: "Certified organic",
    is_multilingual: false,
    is_multi_value: false,
    is_attribute: true,
    is_modifiable: true,
    data_type: "boolean",
    field_type: "toggle",
    used: 33,
    values: ["Yes", "No"],
    translations: [
      { lang: "en", label: "Organic" },
      { lang: "ar", label: "عضوي" },
    ],
  },
];

export const PROP_DATA_TYPES: PropDataType[] = ["string", "number", "boolean", "date"];
export const PROP_FIELD_TYPES: PropFieldType[] = [
  "text",
  "select",
  "multiselect",
  "toggle",
  "number",
];

// Property values (§7.8)
export interface PropertyValueRow {
  id: string;
  property: string;
  value: string;
  store: string | null;
  translations: { lang: string; value: string }[];
}

export const PROPERTY_VALUES: PropertyValueRow[] = [
  {
    id: "pv_01",
    property: "Weight",
    value: "250g",
    store: null,
    translations: [
      { lang: "en", value: "250g" },
      { lang: "ar", value: "٢٥٠ غ" },
    ],
  },
  {
    id: "pv_02",
    property: "Weight",
    value: "500g",
    store: null,
    translations: [
      { lang: "en", value: "500g" },
      { lang: "ar", value: "٥٠٠ غ" },
    ],
  },
  {
    id: "pv_03",
    property: "Origin",
    value: "Lebanon",
    store: null,
    translations: [
      { lang: "en", value: "Lebanon" },
      { lang: "ar", value: "لبنان" },
    ],
  },
  {
    id: "pv_04",
    property: "Roast",
    value: "Single Estate",
    store: "Beirut Pantry",
    translations: [
      { lang: "en", value: "Single Estate" },
      { lang: "ar", value: "مزرعة واحدة" },
    ],
  },
  {
    id: "pv_05",
    property: "Origin",
    value: "Bekaa Valley",
    store: "Zahle Olive Press",
    translations: [
      { lang: "en", value: "Bekaa Valley" },
      { lang: "ar", value: "سهل البقاع" },
    ],
  },
];

// Tags (§7.9)
export interface TagRow {
  id: string;
  name: string;
  products: number;
  store: string | null;
  created_at: string;
}

export const TAGS_FULL: TagRow[] = [
  { id: "tg_01", name: "new", products: 64, store: null, created_at: "2026-01-04" },
  { id: "tg_02", name: "best-seller", products: 184, store: null, created_at: "2026-01-04" },
  { id: "tg_03", name: "organic", products: 92, store: null, created_at: "2026-02-11" },
  { id: "tg_04", name: "vegan", products: 41, store: null, created_at: "2026-02-11" },
  { id: "tg_05", name: "halal", products: 210, store: null, created_at: "2026-01-20" },
  { id: "tg_06", name: "gluten-free", products: 18, store: null, created_at: "2026-03-02" },
  { id: "tg_07", name: "limited", products: 7, store: "Beirut Pantry", created_at: "2026-05-12" },
];

// Assets (§7.10)
export interface AssetRow {
  id: string;
  filename: string;
  app_field: string;
  width: number;
  height: number;
  size_kb: number;
  usage_count: number;
  is_enhanced: boolean;
  is_shared: boolean;
  uploaded_by: string;
  store: string | null;
  created_at: string;
  used_by: { id: string; label: string; kind: string }[];
}

const ASSET_NAMES = [
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
];
const APP_FIELDS = ["product_image", "collection_banner", "category_icon", "store_logo", "story"];
const UPLOADERS = ["Karim Atlas", "Lara Khoury", "Beirut Pantry", "Saida Sweets"];

export const ASSETS_FULL: AssetRow[] = ASSET_NAMES.map((filename, i) => {
  const usage = (i * 3) % 8;
  return {
    id: `as_${i}`,
    filename,
    app_field: APP_FIELDS[i % APP_FIELDS.length],
    width: [800, 1024, 1200, 640][i % 4],
    height: [800, 768, 628, 640][i % 4],
    size_kb: ((80 + i * 13) % 600) + 40,
    usage_count: usage,
    is_enhanced: i % 4 === 0,
    is_shared: i % 3 === 0,
    uploaded_by: UPLOADERS[i % UPLOADERS.length],
    store: i % 3 === 0 ? null : "Beirut Pantry",
    created_at: `2026-05-${String((i % 27) + 1).padStart(2, "0")}`,
    used_by: Array.from({ length: usage }).map((_, u) => ({
      id: `use_${i}_${u}`,
      label: ["Saffron Threads", "Ramadan Essentials", "Pantry icon", "Rose Water"][u % 4],
      kind: ["product", "collection", "category", "product"][u % 4],
    })),
  };
});

export const ASSET_DIMENSION_BUCKETS = ["any", "square", "landscape", "portrait", "icon"] as const;
