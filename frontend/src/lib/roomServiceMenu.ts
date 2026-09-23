export interface RoomServiceItem {
  id: string;
  name: string;
  desc: string;
  /** VAT-inclusive peso price */
  price: number;
  category: "Ulam & Mains" | "Silog Breakfast" | "Pulutan & Sides" | "Drinks";
  icon: string;
}

// Room-service menu guests order from after scanning their room's QR code.
export const ROOM_SERVICE_MENU: RoomServiceItem[] = [
  { id: "crispy-pata", name: "Crispy Pata (Whole)", desc: "Deep-fried pork knuckle, soy-vinegar dip", price: 895, category: "Ulam & Mains", icon: "kebab_dining" },
  { id: "kare-kare", name: "Kare-Kare", desc: "Oxtail & tripe in peanut sauce, bagoong", price: 650, category: "Ulam & Mains", icon: "soup_kitchen" },
  { id: "sinigang-hipon", name: "Sinigang na Hipon", desc: "Tamarind broth, prawns, kangkong", price: 520, category: "Ulam & Mains", icon: "ramen_dining" },
  { id: "chicken-inasal", name: "Chicken Inasal", desc: "Bacolod-style grilled chicken, java rice", price: 320, category: "Ulam & Mains", icon: "outdoor_grill" },
  { id: "sizzling-sisig", name: "Sizzling Sisig", desc: "Pork cheek, chili & egg on a hot plate", price: 380, category: "Ulam & Mains", icon: "skillet" },
  { id: "adobong-manok", name: "Adobong Manok", desc: "Chicken braised in soy, vinegar & garlic", price: 340, category: "Ulam & Mains", icon: "rice_bowl" },
  { id: "tapsilog", name: "Tapsilog", desc: "Beef tapa, garlic rice, fried egg", price: 380, category: "Silog Breakfast", icon: "egg_alt" },
  { id: "longsilog", name: "Longsilog", desc: "Pampanga longganisa, garlic rice, fried egg", price: 350, category: "Silog Breakfast", icon: "egg_alt" },
  { id: "tocilog", name: "Tocilog", desc: "Sweet pork tocino, garlic rice, fried egg", price: 340, category: "Silog Breakfast", icon: "egg_alt" },
  { id: "lumpia", name: "Lumpiang Shanghai", desc: "Crispy pork spring rolls, sweet chili", price: 280, category: "Pulutan & Sides", icon: "set_meal" },
  { id: "garlic-rice", name: "Garlic Rice Platter", desc: "Good for 2–3, extra toasted garlic", price: 180, category: "Pulutan & Sides", icon: "rice_bowl" },
  { id: "calamansi", name: "Calamansi Juice (Pitcher)", desc: "Fresh-squeezed, lightly sweetened", price: 240, category: "Drinks", icon: "local_drink" },
  { id: "barako", name: "Kapeng Barako (Pot)", desc: "Batangas brewed coffee", price: 220, category: "Drinks", icon: "coffee" },
  { id: "san-miguel", name: "San Miguel Pale Pilsen", desc: "330ml bottle, ice cold", price: 110, category: "Drinks", icon: "sports_bar" },
];

export const ROOM_SERVICE_CATEGORIES = ["Ulam & Mains", "Silog Breakfast", "Pulutan & Sides", "Drinks"] as const;
