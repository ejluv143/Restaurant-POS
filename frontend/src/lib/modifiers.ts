// Sample modifier options for the dishes on the floor-plan bills, keyed by dish name.
// Each dish's current modifiers (see floorTables.ts) are free options here, so bill totals start unchanged.

export interface ModifierOption {
  label: string;
  /** Extra charge per unit, VAT-inclusive */
  price?: number;
}

export interface ModifierGroup {
  name: string;
  /** 1 = pick at most one (tap again to clear); otherwise any number */
  max?: 1;
  options: ModifierOption[];
}

export const MODIFIERS: Record<string, ModifierGroup[]> = {
  "Crispy Pata (Whole)": [
    { name: "Doneness", max: 1, options: [{ label: "Regular" }, { label: "Extra Crispy" }] },
    { name: "Dip", max: 1, options: [{ label: "Soy-Vinegar Dip" }, { label: "Liver Sauce" }, { label: "Both Dips", price: 30 }] },
    { name: "Extras", options: [{ label: "No Salt" }, { label: "Garlic Chips", price: 25 }] },
  ],
  "Kare-Kare": [
    { name: "Meat", max: 1, options: [{ label: "Oxtail & Tripe" }, { label: "Oxtail Only", price: 80 }, { label: "Pork Knuckle" }] },
    { name: "Bagoong", max: 1, options: [{ label: "Bagoong on the Side" }, { label: "Bagoong Mixed In" }, { label: "No Bagoong" }] },
    { name: "Extras", options: [{ label: "Extra Vegetables", price: 45 }, { label: "Extra Peanut Sauce", price: 35 }] },
  ],
  "Calamansi Juice (Pitcher)": [
    { name: "Preparation", options: [{ label: "Fresh-Squeezed" }, { label: "No Ice" }, { label: "Add Honey", price: 20 }] },
    { name: "Sweetness", max: 1, options: [{ label: "Regular Sugar" }, { label: "Less Sugar" }, { label: "No Sugar" }] },
  ],
  "Garlic Rice Platter": [
    { name: "Garlic", max: 1, options: [{ label: "Regular Garlic" }, { label: "Extra Toasted Garlic" }] },
    { name: "Add-ons", options: [{ label: "Fried Egg", price: 25 }, { label: "Chorizo Bits", price: 45 }] },
  ],
  "Sinigang na Hipon": [
    { name: "Sourness", max: 1, options: [{ label: "Mild Sour" }, { label: "Regular Sour" }, { label: "Extra Sour" }] },
    { name: "Vegetables", options: [{ label: "Kangkong" }, { label: "Labanos" }, { label: "Sitaw" }, { label: "Add Gabi", price: 20 }] },
  ],
  "Chicken Inasal (Pecho)": [
    { name: "Sauces", options: [{ label: "Chicken Oil" }, { label: "Sinamak on the Side" }, { label: "Toyo-Mansi" }] },
    { name: "Upgrade", options: [{ label: "Java Rice", price: 30 }] },
  ],
  "Plain Rice": [{ name: "Serving", max: 1, options: [{ label: "Half Cup" }, { label: "Regular Cup" }, { label: "Garlic Rice Upgrade", price: 30 }] }],
  "Buko Pandan": [
    { name: "Serve", max: 1, options: [{ label: "Chilled" }, { label: "Frozen" }] },
    { name: "Toppings", options: [{ label: "Nata de Coco", price: 15 }, { label: "Kaong", price: 15 }] },
  ],
  "Lechon Kawali (Platter)": [
    { name: "Sauce", options: [{ label: "Lechon Sauce" }, { label: "Soy-Vinegar Dip" }] },
    { name: "Texture", max: 1, options: [{ label: "Regular" }, { label: "Extra Crispy" }] },
  ],
  "Sizzling Sisig": [
    { name: "Egg", max: 1, options: [{ label: "With Egg" }, { label: "No Egg" }] },
    { name: "Extras", options: [{ label: "Calamansi" }, { label: "Extra Chili" }, { label: "Chicharon Topping", price: 40 }] },
  ],
  "Pancit Canton (Family)": [
    { name: "Toppings", max: 1, options: [{ label: "Seafood & Chicken" }, { label: "Chicken Only" }, { label: "Vegetarian" }] },
    { name: "Extras", options: [{ label: "Extra Calamansi" }, { label: "Lechon Kawali Bits", price: 90 }] },
  ],
  "Lumpiang Shanghai (24 pcs)": [
    { name: "Dip", max: 1, options: [{ label: "Sweet Chili Dip" }, { label: "Banana Ketchup" }, { label: "Spiced Vinegar" }] },
    { name: "Extras", options: [{ label: "Extra Dip", price: 20 }] },
  ],
  "Mango Shake": [
    { name: "Ice", max: 1, options: [{ label: "Regular Ice" }, { label: "Less Ice" }, { label: "No Ice" }] },
    { name: "Add-ons", options: [{ label: "Sago", price: 20 }, { label: "Graham Crumbs", price: 15 }] },
  ],
  "Bistek Tagalog": [
    { name: "Onions", max: 1, options: [{ label: "Regular Onions" }, { label: "Extra Onions" }, { label: "No Onions" }] },
    { name: "Add-ons", options: [{ label: "Fried Egg", price: 25 }] },
  ],
  "House Iced Tea": [
    { name: "Serving", max: 1, options: [{ label: "Single Glass" }, { label: "Bottomless" }] },
    { name: "Sweetness", max: 1, options: [{ label: "Less Sweet" }, { label: "Unsweetened" }] },
  ],
  "Adobong Pusit": [
    { name: "Heat", max: 1, options: [{ label: "Mild" }, { label: "Spicy" }, { label: "Extra Spicy" }] },
    { name: "Sauce", options: [{ label: "Extra Ink Sauce", price: 30 }] },
  ],
  Pinakbet: [
    { name: "Protein", max: 1, options: [{ label: "With Bagnet" }, { label: "With Shrimp" }, { label: "Vegetables Only" }] },
    { name: "Bagoong", max: 1, options: [{ label: "Bagoong Isda" }, { label: "Bagoong Alamang" }] },
  ],
  "San Miguel Pale Pilsen": [
    { name: "Serve", max: 1, options: [{ label: "Ice Cold" }, { label: "Room Temp" }] },
    { name: "Extras", options: [{ label: "Glass with Ice" }] },
  ],
  // Order Entry menu dishes not on the sample bills
  "Adobong Manok": [
    { name: "Style", max: 1, options: [{ label: "Classic" }, { label: "Adobo sa Gata", price: 40 }] },
    { name: "Add-ons", options: [{ label: "Hard-Boiled Egg", price: 20 }, { label: "Extra Sauce" }] },
  ],
};

// Order Entry names some dishes without their bill portion, e.g. "Chicken Inasal" for "Chicken Inasal (Pecho)"
MODIFIERS["Chicken Inasal"] = MODIFIERS["Chicken Inasal (Pecho)"];
MODIFIERS["Lechon Kawali"] = MODIFIERS["Lechon Kawali (Platter)"];

const SEP = " • ";

export const splitMods = (mods: string) => mods.split(SEP).filter(Boolean);

export const joinMods = (labels: string[]) => labels.join(SEP);

/** Per-unit extra charge for the chosen modifier labels */
export function modifierCharge(groups: ModifierGroup[], labels: string[]) {
  return groups.flatMap((g) => g.options).reduce((sum, o) => sum + (labels.includes(o.label) ? (o.price ?? 0) : 0), 0);
}
