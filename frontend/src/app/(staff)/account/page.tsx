import type { Metadata } from "next";
import { changePassword } from "./actions";
import { ActionForm } from "@/components/staff/ActionForm";
import { Card, Field, Icon, PageHeader, input } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  // No role list, so a user with a temporary password can reach this page (and only this page)
  const ctx = await getStaffContext();
  const { staff } = ctx;
  return (
    <>
      <PageHeader title="My Account" icon="manage_accounts" subtitle="Your profile and sign-in security." />
      {staff.mustChangePassword && (
        <p role="alert" className="mb-5 max-w-3xl rounded-xl border border-secondary/50 bg-secondary/10 text-secondary px-4 py-3 flex items-start gap-2 font-label-lg text-label-lg">
          <Icon name="lock_reset" className="text-[20px]" />
          You&apos;re using a temporary password. Choose your own password to continue.
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl items-start">
        <Card title="Profile" icon="person">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 font-body-md text-body-md">
            <dt className="text-on-surface-variant">Name</dt>
            <dd className="text-on-surface">{staff.fullName}</dd>
            <dt className="text-on-surface-variant">Email</dt>
            <dd className="text-on-surface break-all">{staff.email}</dd>
            <dt className="text-on-surface-variant">Role</dt>
            <dd className="text-on-surface">{ROLE_LABEL[staff.role]}</dd>
            <dt className="text-on-surface-variant">Branches</dt>
            <dd className="text-on-surface">{ctx.branches.map((b) => b.name).join(", ") || "None"}</dd>
          </dl>
          <p className="mt-4 font-body-sm text-body-sm text-outline">To change your name, role or branches, ask your manager or administrator.</p>
        </Card>
        <Card title="Change password" icon="password">
          <ActionForm action={changePassword} submitLabel="Change password" submitIcon="lock" resetOnSuccess>
            <Field label="Current password" htmlFor="current">
              <input id="current" name="current" type="password" required autoComplete="current-password" maxLength={128} className={input} />
            </Field>
            <Field label="New password" htmlFor="password" hint="At least 10 characters, with a letter and a number.">
              <input id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={input} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm">
              <input id="confirm" name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className={input} />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
