// Client-safe role rules shared by the proxy, the login redirect and the sidebar. Enforcement happens
// on the server (proxy + requireStaff + every action); the nav only uses these to hide screens.

export type StaffRole = "cashier" | "kitchen" | "branch_manager" | "restaurant_admin" | "system_admin";

export const ROLE_LABEL: Record<StaffRole, string> = {
  cashier: "Cashier",
  kitchen: "Kitchen Staff",
  branch_manager: "Branch Manager",
  restaurant_admin: "Restaurant Admin",
  system_admin: "System Admin",
};

export const ADMINS: StaffRole[] = ["restaurant_admin", "system_admin"];
export const MANAGERS: StaffRole[] = ["branch_manager", ...ADMINS];
export const ALL_STAFF: StaffRole[] = ["cashier", "kitchen", ...MANAGERS];

export interface Screen {
  href: string;
  label: string;
  icon: string;
  roles: StaffRole[];
  group: "Operations" | "Management" | "Administration" | "Account";
}

// Keep in sync with the matcher in src/proxy.ts
export const SCREENS: Screen[] = [
  { href: "/dashboard", label: "Dashboard", icon: "space_dashboard", roles: MANAGERS, group: "Operations" },
  { href: "/floor", label: "Floor & Tables", icon: "table_restaurant", roles: ["cashier", ...MANAGERS], group: "Operations" },
  { href: "/kitchen", label: "Kitchen Display", icon: "skillet", roles: ["kitchen", ...MANAGERS], group: "Operations" },
  { href: "/cashier", label: "Cashier & Bills", icon: "point_of_sale", roles: ["cashier", ...MANAGERS], group: "Operations" },
  { href: "/menu", label: "Menu", icon: "restaurant_menu", roles: ["kitchen", ...MANAGERS], group: "Management" },
  { href: "/tables", label: "Tables & QR Codes", icon: "qr_code_2", roles: MANAGERS, group: "Management" },
  { href: "/staff", label: "Staff Accounts", icon: "badge", roles: MANAGERS, group: "Management" },
  { href: "/reports", label: "Reports", icon: "monitoring", roles: MANAGERS, group: "Management" },
  { href: "/feedback", label: "Customer Feedback", icon: "reviews", roles: MANAGERS, group: "Management" },
  { href: "/branches", label: "Branches & Payments", icon: "storefront", roles: ADMINS, group: "Administration" },
  { href: "/audit", label: "Audit Log", icon: "policy", roles: ADMINS, group: "Administration" },
  { href: "/admin", label: "Platform Admin", icon: "admin_panel_settings", roles: ["system_admin"], group: "Administration" },
  { href: "/account", label: "My Account", icon: "manage_accounts", roles: ALL_STAFF, group: "Account" },
];

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export const isStaffPath = (path: string) => SCREENS.some((s) => matches(path, s.href));

export function canAccess(role: StaffRole, path: string): boolean {
  const screen = SCREENS.find((s) => matches(path, s.href));
  return !!screen && screen.roles.includes(role);
}

export const rolesFor = (href: string) => SCREENS.find((s) => s.href === href)!.roles;

export const homeFor = (role: StaffRole) => (role === "kitchen" ? "/kitchen" : role === "cashier" ? "/cashier" : "/dashboard");

/** Where to go after signing in: the requested staff screen if it's a same-site path the role may open, else the role's home. */
export function safeNextPath(next: unknown, role: StaffRole): string {
  // Only plain absolute paths: rejects "//evil.com", "/\evil.com", schemes and control characters (open-redirect guard)
  if (typeof next !== "string" || next.length > 200 || !/^\/(?![/\\])[\w\-./?=&%]*$/.test(next)) return homeFor(role);
  return canAccess(role, next.split("?")[0]) ? next : homeFor(role);
}

/** Roles a user may create or manage: managers run their branch's cashiers and kitchen, admins everyone below them. */
export function manageableRoles(role: StaffRole): StaffRole[] {
  if (role === "system_admin") return ALL_STAFF;
  if (role === "restaurant_admin") return ["cashier", "kitchen", "branch_manager", "restaurant_admin"];
  if (role === "branch_manager") return ["cashier", "kitchen"];
  return [];
}
