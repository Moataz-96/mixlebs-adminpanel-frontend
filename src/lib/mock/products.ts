// Local, products-domain-only mock data (House rule 9). Enriches the shared
// read-only PRODUCTS rows with the extra columns/fields §7.1–7.3 require
// (model number, sold counter, rating, created date, tags, has-image) plus
// per-product variant / image / property / review fixtures for the editor.

import { PRODUCTS, type Product } from "@/lib/mock-data";

export const PRODUCT_STATUSES = [
  "TEMPORARY",
  "PENDING",
  "AVAILABLE",
  "OUT_OF_STOCK",
  "SOLD_OUT",
  "DISCONTINTUED",
  "HIDDEN",
  "DECLINED",
  "PENDING_RESTOCK",
  "PREORDER",
  "ARCHIVED",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface ProductRow extends Product {
  modelNumber: string;
  sold: number;
  rating: number;
  ratingCount: number;
  created: string;
  hasImage: boolean;
  tags: string[];
  priceMin?: number;
  priceMax?: number;
}

const EXTRA: Record<string, Partial<ProductRow>> = {
  p_001: {
    modelNumber: "MX-SAF-001",
    sold: 312,
    rating: 4.8,
    ratingCount: 96,
    created: "2026-01-12",
    hasImage: true,
    tags: ["organic", "best-seller"],
    priceMin: 22,
    priceMax: 38,
  },
  p_002: {
    modelNumber: "MX-OIL-101",
    sold: 188,
    rating: 4.6,
    ratingCount: 54,
    created: "2026-02-03",
    hasImage: true,
    tags: ["organic", "vegan"],
    priceMin: 22.5,
    priceMax: 41,
  },
  p_003: {
    modelNumber: "MX-ROS-205",
    sold: 41,
    rating: 3.9,
    ratingCount: 18,
    created: "2026-02-21",
    hasImage: false,
    tags: ["halal"],
  },
  p_004: {
    modelNumber: "MX-SUM-014",
    sold: 920,
    rating: 4.9,
    ratingCount: 240,
    created: "2025-11-30",
    hasImage: true,
    tags: ["best-seller", "halal"],
    priceMin: 5.4,
    priceMax: 8,
  },
  p_005: {
    modelNumber: "MX-POM-303",
    sold: 133,
    rating: 4.4,
    ratingCount: 37,
    created: "2026-03-10",
    hasImage: true,
    tags: ["vegan"],
  },
  p_006: {
    modelNumber: "MX-HAL-088",
    sold: 76,
    rating: 4.1,
    ratingCount: 29,
    created: "2026-04-02",
    hasImage: true,
    tags: ["limited"],
    priceMin: 18,
    priceMax: 30,
  },
  p_007: {
    modelNumber: "MX-ZAA-401",
    sold: 54,
    rating: 4.0,
    ratingCount: 22,
    created: "2025-12-18",
    hasImage: false,
    tags: ["halal"],
  },
  p_008: {
    modelNumber: "MX-TAH-066",
    sold: 410,
    rating: 4.7,
    ratingCount: 121,
    created: "2026-01-28",
    hasImage: true,
    tags: ["organic", "gluten-free"],
    priceMin: 13.5,
    priceMax: 22,
  },
};

export const PRODUCT_ROWS: ProductRow[] = PRODUCTS.map((p) => ({
  ...p,
  modelNumber: `MX-${p.sku}`,
  sold: 0,
  rating: 0,
  ratingCount: 0,
  created: p.updated,
  hasImage: true,
  tags: [],
  ...EXTRA[p.id],
}));

export const STORE_NAMES = [
  "Beirut Pantry",
  "Tripoli Spices",
  "Saida Sweets",
  "Zahle Olive Press",
  "Cedar Goods Co.",
];

export interface VariantRow {
  id: string;
  sku: string;
  modelNumber: string;
  attributes: string;
  originalPrice: number;
  price: number;
  discount: number;
  stock: number;
}

export function mockVariants(sku: string): VariantRow[] {
  const weights = ["100g", "250g", "500g"];
  return weights.map((w, i) => ({
    id: `${sku}-V${i + 1}`,
    sku: `${sku}-V${i + 1}`,
    modelNumber: `MX-${sku}-${i + 1}`,
    attributes: `Weight: ${w}`,
    originalPrice: 20 + i * 6,
    price: 18 + i * 6,
    discount: 10,
    stock: 40 - i * 8,
  }));
}

export interface ImageRow {
  id: string;
  ml: boolean;
  gt: boolean;
  relaxation: boolean;
}

export function mockImages(): ImageRow[] {
  return [
    { id: "img_1", ml: false, gt: false, relaxation: false },
    { id: "img_2", ml: true, gt: false, relaxation: false },
    { id: "img_3", ml: false, gt: false, relaxation: false },
    { id: "img_4", ml: false, gt: true, relaxation: true },
  ];
}

export interface PropertyRow {
  id: string;
  property: string;
  value: string;
}

export function mockProperties(): PropertyRow[] {
  return [
    { id: "pp_1", property: "Weight", value: "250g" },
    { id: "pp_2", property: "Origin", value: "Lebanon" },
  ];
}

export interface ProductReview {
  id: string;
  customer: string;
  rating: number;
  comment: string;
  isPurchased: boolean;
  createdAt: string;
  hidden: boolean;
}

export const PRODUCT_REVIEWS: ProductReview[] = [
  {
    id: "rv_01",
    customer: "Layla Haddad",
    rating: 5,
    comment: "Beautiful aroma, packed with care. Will reorder.",
    isPurchased: true,
    createdAt: "2026-05-25",
    hidden: false,
  },
  {
    id: "rv_02",
    customer: "Omar Khoury",
    rating: 2,
    comment: "Arrived crumbled, not fresh.",
    isPurchased: true,
    createdAt: "2026-05-24",
    hidden: false,
  },
  {
    id: "rv_03",
    customer: "Nour Saade",
    rating: 4,
    comment: "Bright and zesty, great value.",
    isPurchased: false,
    createdAt: "2026-05-23",
    hidden: false,
  },
  {
    id: "rv_04",
    customer: "Rami Geagea",
    rating: 1,
    comment: "Smelled off, returned it.",
    isPurchased: true,
    createdAt: "2026-05-22",
    hidden: true,
  },
  {
    id: "rv_05",
    customer: "Aya Mansour",
    rating: 5,
    comment: "Exactly as described — premium grade.",
    isPurchased: true,
    createdAt: "2026-05-20",
    hidden: false,
  },
  {
    id: "rv_06",
    customer: "Karim Daher",
    rating: 3,
    comment: "Good but packaging could be better.",
    isPurchased: false,
    createdAt: "2026-05-18",
    hidden: false,
  },
];
