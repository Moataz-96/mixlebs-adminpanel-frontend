// Sales-domain detail shapes (Orders / Returns / Invoices §8.2/8.4/8.6).
// Read-only demo data owned by the Sales domain. The base list shapes live in
// "@/lib/mock-data" (ORDERS, RETURNS, INVOICES); these augment them with the
// richer fields the detail screens render.

export type PaymentType = "COD" | "CC" | "QR" | "NS";
export type TransferStatus = "PENDING" | "IN_WALLET" | "TRANSFERRED";
export type InvoiceType = "ORDER" | "RETURN";

export interface OrderLine {
  model: string;
  name: string;
  attributes: string;
  qty: number;
  price: number;
  discount: number;
  isReturned: boolean;
}

export interface TrackingEvent {
  details: string;
  at: string;
  courier?: string;
}

export interface OrderDetail {
  paymentType: PaymentType;
  transferStatus: TransferStatus;
  courier: string;
  etaDays: number;
  baseFee: number;
  deliveryFee: number;
  tax: number;
  subtotal: number;
  coupon?: string;
  serial: string;
  deliveredAt?: string;
  customer: {
    email: string;
    phone: string;
    id: string;
    returnBlocked: boolean;
  };
  address: {
    recipient: string;
    phone: string;
    country: string;
    city: string;
    governorate: string;
    area: string;
    postcode: string;
    street: string;
    building: number;
    floor: number;
    apartment: number;
    note: string;
  };
  lines: OrderLine[];
  tracking: TrackingEvent[];
  audit: { who: string; what: string; at: string }[];
}

// Deterministic per-order detail derived from the order id.
export function orderDetail(args: {
  id: string;
  total: number;
  items: number;
  customer: string;
  status: string;
  placed: string;
}): OrderDetail {
  const { items, total, customer, status, placed } = args;
  const lines: OrderLine[] = Array.from({ length: Math.max(1, items) }).map((_, i) => {
    const price = 18 + i * 4;
    const qty = i + 1;
    return {
      model: `SAF-00${i + 1}-V${i + 1}`,
      name: `Saffron Threads — Variant ${i + 1}`,
      attributes: `Weight: ${["100g", "250g", "500g", "1kg"][i % 4]}`,
      qty,
      price,
      discount: i % 3 === 0 ? 2 : 0,
      isReturned: false,
    };
  });
  const subtotal = lines.reduce((a, l) => a + (l.price - l.discount) * l.qty, 0);
  const tax = +(subtotal * 0.11).toFixed(2);
  const deliveryFee = 8;

  const baseTracking: TrackingEvent[] = [
    { details: "Order placed", at: placed, courier: customer },
    { details: "Order ready for pickup", at: "2026-05-27 15:10", courier: "Beirut Pantry" },
    { details: "Picked up by courier", at: "2026-05-27 18:30", courier: "Beirut Express" },
    { details: "Out for delivery", at: "2026-05-28 07:12", courier: "Beirut Express" },
    { details: "Delivered to customer", at: "2026-05-28 09:42", courier: "Beirut Express" },
  ];
  const stepByStatus: Record<string, number> = {
    PENDING: 1,
    READY: 2,
    SHIPPED: 4,
    DELIVERED: 5,
    DELIVERY_ISSUE: 4,
    CANCELLED: 1,
    DECLINED: 1,
  };
  const take = stepByStatus[status] ?? 1;
  const tracking = baseTracking.slice(0, take).reverse();

  return {
    paymentType: "CC",
    transferStatus: status === "DELIVERED" ? "IN_WALLET" : "PENDING",
    courier: "Beirut Express",
    etaDays: 2,
    baseFee: 5,
    deliveryFee,
    tax,
    subtotal,
    coupon: total > 80 ? "SAFFRON15" : undefined,
    serial: "7f3a1b2c-9d4e-4a8f-b1c2-3e9c2f0a1b2c",
    deliveredAt: status === "DELIVERED" ? "2026-05-28 09:42" : undefined,
    customer: {
      email: "layla@mixlebs.demo",
      phone: "+961 70 123 456",
      id: "c_1000",
      returnBlocked: false,
    },
    address: {
      recipient: customer,
      phone: "+961 70 123 456",
      country: "Lebanon",
      city: "Beirut",
      governorate: "Beirut",
      area: "Achrafieh",
      postcode: "1100",
      street: "Sassine Square",
      building: 12,
      floor: 4,
      apartment: 12,
      note: "Ring the bell twice.",
    },
    lines,
    tracking,
    audit: [
      { who: "Lara Khoury", what: "Status transitioned", at: "2026-05-28 12:48" },
      { who: "Beirut Express webhook", what: "Tracking event appended", at: "2026-05-28 07:12" },
    ],
  };
}

export interface ReturnDetail {
  model: string;
  name: string;
  attributes: string;
  qty: number;
  price: number;
  discount: number;
  handlingFees: number;
  reasonDescription: string;
  courier: string;
  attachments: number;
  tracking: TrackingEvent[];
  invoiceId: string;
}

export function returnDetail(args: { value: number; status: string }): ReturnDetail {
  const { value, status } = args;
  const base: TrackingEvent[] = [
    { details: "Customer submitted request", at: "2026-05-26 11:20" },
    { details: "Under review by store", at: "2026-05-26 14:02" },
    { details: "Approved — awaiting pickup", at: "2026-05-27 09:30", courier: "Beirut Express" },
    { details: "Item returned to store", at: "2026-05-28 16:10", courier: "Beirut Express" },
  ];
  const step: Record<string, number> = {
    PENDING: 1,
    CHECKING: 2,
    APPROVED: 3,
    RETURNED: 4,
    DECLINED: 2,
    DELIVERY_ISSUE: 3,
    BLOCKED: 1,
  };
  return {
    model: "SAF-001-V2",
    name: "Saffron Threads, Persian Grade A",
    attributes: "Weight: 250g",
    qty: 1,
    price: value,
    discount: 0,
    handlingFees: 2.5,
    reasonDescription: "The packaging arrived torn and the threads were partially crushed inside.",
    courier: "Beirut Express",
    attachments: 3,
    tracking: base.slice(0, step[status] ?? 1).reverse(),
    invoiceId: "inv_2026_0186",
  };
}

export interface InvoiceDetail {
  type: InvoiceType;
  paymentType: PaymentType;
  transferStatus: TransferStatus;
  serial: string;
  tax: number;
  fees: number;
  coupon?: { code: string; value: string; cappedAt: string };
  recipient: { name: string; email: string; phone: string; city: string };
  lines: { model: string; name: string; qty: number; price: number; discount: number }[];
}

export function invoiceDetail(args: {
  id: string;
  amount: number;
  customer: string;
}): InvoiceDetail {
  const { amount, customer } = args;
  const lines = [1, 2, 3].map((i) => ({
    model: `SAF-00${i}`,
    name: `Saffron Threads — Variant ${i}`,
    qty: i,
    price: 20 + i * 5,
    discount: i === 1 ? 3 : 0,
  }));
  const tax = +(amount * 0.11).toFixed(2);
  return {
    type: "ORDER",
    paymentType: "CC",
    transferStatus: "IN_WALLET",
    serial: "7f3a1b2c-9d4e-4a8f-b1c2-3e9c2f0a1b2c",
    tax,
    fees: 8,
    coupon: amount > 100 ? { code: "SAFFRON15", value: "15%", cappedAt: "$30.00" } : undefined,
    recipient: {
      name: customer,
      email: "layla@mixlebs.demo",
      phone: "+961 70 123 456",
      city: "Beirut, Achrafieh",
    },
    lines,
  };
}
