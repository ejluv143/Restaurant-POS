import type { Metadata } from "next";
import StaffShell from "@/components/staff/StaffShell";
import { inter } from "@/lib/fonts";
import { ROLE_LABEL, SCREENS } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: { template: "%s • Sync Hub Resto", default: "Sync Hub Resto" }, robots: { index: false, follow: false } };

// Every staff screen: the proxy has already checked the session and role for the path; pages re-check
// (and scope their data) through getStaffContext, since a layout alone isn't a security boundary.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { staff, branches, branch } = await getStaffContext();
  return (
    <div className={`theme-resto ${inter.variable} min-h-screen font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container`}>
      <StaffShell
        user={{ name: staff.fullName, role: ROLE_LABEL[staff.role], email: staff.email }}
        branches={branches.map((b) => ({ id: b.id, label: b.name, restaurant: b.restaurant, inactive: !b.isActive }))}
        activeBranchId={branch?.id ?? null}
        screens={SCREENS.filter((s) => s.roles.includes(staff.role)).map(({ href, label, icon, group }) => ({ href, label, icon, group }))}
      >
        {children}
      </StaffShell>
    </div>
  );
}
