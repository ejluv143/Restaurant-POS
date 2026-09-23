import type { Category, MenuItem } from "./types";

export const CATEGORIES: Category[] = ["Mains", "Sides", "Drinks", "Desserts"];

export const TAX_RATE = 0.12;

export const MENU: MenuItem[] = [
  { id: "m1", name: "Classic Burger", price: 8.5, category: "Mains", emoji: "🍔" },
  { id: "m2", name: "Chicken Adobo", price: 9.0, category: "Mains", emoji: "🍗" },
  { id: "m3", name: "Margherita Pizza", price: 11.0, category: "Mains", emoji: "🍕" },
  { id: "m4", name: "Beef Tacos", price: 7.5, category: "Mains", emoji: "🌮" },
  { id: "m5", name: "Pasta Carbonara", price: 10.5, category: "Mains", emoji: "🍝" },
  { id: "m6", name: "Grilled Salmon", price: 14.0, category: "Mains", emoji: "🐟" },
  { id: "s1", name: "French Fries", price: 3.0, category: "Sides", emoji: "🍟" },
  { id: "s2", name: "Garden Salad", price: 4.5, category: "Sides", emoji: "🥗" },
  { id: "s3", name: "Garlic Rice", price: 2.0, category: "Sides", emoji: "🍚" },
  { id: "s4", name: "Onion Rings", price: 3.5, category: "Sides", emoji: "🧅" },
  { id: "d1", name: "Iced Tea", price: 2.0, category: "Drinks", emoji: "🧋" },
  { id: "d2", name: "Coffee", price: 2.5, category: "Drinks", emoji: "☕" },
  { id: "d3", name: "Soda", price: 1.75, category: "Drinks", emoji: "🥤" },
  { id: "d4", name: "Fresh Juice", price: 3.25, category: "Drinks", emoji: "🧃" },
  { id: "d5", name: "Water", price: 1.0, category: "Drinks", emoji: "💧" },
  { id: "x1", name: "Chocolate Cake", price: 4.0, category: "Desserts", emoji: "🍰" },
  { id: "x2", name: "Ice Cream", price: 3.0, category: "Desserts", emoji: "🍨" },
  { id: "x3", name: "Halo-Halo", price: 4.5, category: "Desserts", emoji: "🍧" },
];
