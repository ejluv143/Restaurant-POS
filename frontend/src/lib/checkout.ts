// Checkout math for a whole table. Prices are VAT-inclusive (12%).
// Senior/PWD (RA 9994 / RA 10754): for each qualifying guest's per-head share of the bill, the VAT is
// removed and 20% is taken off the VAT-exclusive amount. The rest of the table pays the regular price.

export type DiscountKind = "none" | "senior" | "pwd" | "promo" | "employee";

export interface Discount {
  kind: DiscountKind;
  /** Senior/PWD only: how many of the table's guests qualify */
  guests: number;
  /** Senior/PWD only: OSCA or PWD ID number and the holder's name, printed on the receipt */
  idNo: string;
  holder: string;
}

export const NO_DISCOUNT: Discount = { kind: "none", guests: 1, idNo: "", holder: "" };

export const isStatutory = (kind: DiscountKind) => kind === "senior" || kind === "pwd";

export const DISCOUNT_LABEL: Record<Exclude<DiscountKind, "none">, { short: string; long: string }> = {
  senior: { short: "Senior 20%", long: "Senior Citizen Discount (20%)" },
  pwd: { short: "PWD 20%", long: "PWD Discount (20%)" },
  promo: { short: "Promo 10%", long: "Promo Discount (10%)" },
  employee: { short: "Employee 15%", long: "Employee Discount (15%)" },
};

const PERCENT_OFF: Partial<Record<DiscountKind, number>> = { promo: 0.1, employee: 0.15 };

export interface CheckBreakdown {
  /** Bill total before discounts, VAT-inclusive */
  total: number;
  /** VAT-inclusive part of the bill belonging to qualifying Senior/PWD guests */
  exemptShare: number;
  vatExemption: number;
  statutoryDiscount: number;
  percentDiscount: number;
  due: number;
  vatableSales: number;
  vat: number;
  vatExemptSales: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeCheck(total: number, guests: number, d: Discount): CheckBreakdown {
  const statutory = isStatutory(d.kind);
  const exemptShare = statutory ? r2((total / Math.max(1, guests)) * Math.min(Math.max(1, d.guests), guests)) : 0;
  const vatExemptSales = r2(exemptShare / 1.12);
  const vatExemption = r2(exemptShare - vatExemptSales);
  const statutoryDiscount = statutory ? r2(vatExemptSales * 0.2) : 0;
  const percentDiscount = r2(total * (PERCENT_OFF[d.kind] ?? 0));
  const regular = total - exemptShare - percentDiscount;
  const vatableSales = r2(regular / 1.12);
  return {
    total,
    exemptShare,
    vatExemption,
    statutoryDiscount,
    percentDiscount,
    due: r2(total - vatExemption - statutoryDiscount - percentDiscount),
    vatableSales,
    vat: r2(regular - vatableSales),
    vatExemptSales,
  };
}

export type PaymentMethod = "cash" | "gcash" | "maya" | "card";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash / QR Ph",
  maya: "Maya",
  card: "Credit / Debit Card",
};

export interface Payment {
  method: PaymentMethod;
  amount: number;
  /** Cash only */
  tendered?: number;
  change?: number;
  /** GCash, Maya or card approval/reference number from the phone or terminal */
  reference?: string;
  discount: Discount;
  breakdown: CheckBreakdown;
  paidAt: string;
  receiptNo: string;
}
