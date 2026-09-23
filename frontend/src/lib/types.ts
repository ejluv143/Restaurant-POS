export type Category = "Mains" | "Sides" | "Drinks" | "Desserts";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  emoji: string;
}

export interface CartLine {
  item: MenuItem;
  qty: number;
  note?: string;
}

export type PaymentMethod = "cash" | "card";
export type OrderType = "dine-in" | "takeout";

export interface Order {
  id: string;
  number: number;
  createdAt: string;
  orderType: OrderType;
  table?: string;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  tendered: number;
  change: number;
}
