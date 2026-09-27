"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import {
  advanceOrder,
  closeSession,
  placeStaffOrder,
  recordPayment,
  refundPayment,
  setItemAvailability,
  setTableHold,
  updateServiceRequest,
  verifyPayment,
} from "@/lib/operations";
import { ALL_STAFF, rolesFor } from "@/lib/staffAccess";
import { ActionError, BRANCH_COOKIE, getStaffContext, runAction, type ActionResult } from "@/lib/staffContext";
import { formatCents } from "@/lib/tableOrder";

// Server actions for the live staff screens. Next.js rejects cross-origin action calls; every action
// re-checks the caller's role and branch inside lib/operations, so the UI hiding a button is never the guard.

const CASHIER = rolesFor("/cashier");

export async function switchBranch(branchId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext();
    if (!ctx.branches.some((b) => b.id === branchId)) throw new ActionError("You don't have access to that branch.");
    (await cookies()).set(BRANCH_COOKIE, branchId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
    refresh();
  });
}

export async function advanceOrderAction(orderId: string, to: string, reason?: string): Promise<ActionResult> {
  return runAction(async () => advanceOrder(await getStaffContext(ALL_STAFF), orderId, to, reason));
}

export async function serviceRequestAction(requestId: string, to: string): Promise<ActionResult> {
  return runAction(async () => updateServiceRequest(await getStaffContext(ALL_STAFF), requestId, to));
}

export async function tableHoldAction(tableId: string, hold: string | null): Promise<ActionResult> {
  return runAction(async () => setTableHold(await getStaffContext(rolesFor("/floor")), tableId, hold));
}

export async function availabilityAction(itemId: string, available: boolean): Promise<ActionResult> {
  return runAction(async () => setItemAvailability(await getStaffContext(rolesFor("/menu")), itemId, available === true));
}

export async function recordPaymentAction(input: { sessionId: string; method: string; amountCents: number; tenderedCents?: number | ""; reference?: string }): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(CASHIER);
    const { changeCents } = await recordPayment(ctx, input);
    return changeCents > 0 ? `Payment recorded. Change due: ${formatCents(changeCents, ctx.branch?.currency ?? "PHP")}` : "Payment recorded.";
  });
}

export async function verifyPaymentAction(paymentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const result = await verifyPayment(await getStaffContext(CASHIER), paymentId);
    return result === "paid" ? "Payment confirmed by PayMongo." : result === "expired" ? "That checkout expired without payment." : "Not paid yet. The guest hasn't completed the payment.";
  });
}

export async function refundPaymentAction(paymentId: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    await refundPayment(await getStaffContext(CASHIER), paymentId, reason);
    return "Payment marked as refunded.";
  });
}

export async function closeBillAction(sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    await closeSession(await getStaffContext(CASHIER), sessionId);
    return "Bill settled and table closed. It's marked for cleaning.";
  });
}

export async function placeStaffOrderAction(tableId: string, body: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const order = await placeStaffOrder(await getStaffContext(CASHIER), tableId, body);
    return `Ticket #${order.ticketNumber} sent to the kitchen.`;
  });
}
