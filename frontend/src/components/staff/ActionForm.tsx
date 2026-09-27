"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Icon, btn } from "@/components/ui";
import type { ActionResult } from "@/lib/staffContext";

type FormActionFn = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/** A form posting to a server action, with inline success / error messages. Works without JavaScript too. */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitIcon = "check",
  className = "flex flex-col gap-4",
  resetOnSuccess = false,
  danger = false,
}: {
  action: FormActionFn;
  children: ReactNode;
  submitLabel: string;
  submitIcon?: string;
  className?: string;
  resetOnSuccess?: boolean;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 font-body-md text-body-md flex items-start gap-2 ${state.ok ? "bg-tertiary/10 text-tertiary" : "bg-error-container/30 text-on-error-container"}`}>
          <Icon name={state.ok ? "check_circle" : "error"} className="text-[18px] mt-px" />
          {state.ok ? (state.message ?? "Saved.") : state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className={danger ? btn.danger : btn.primary}>
          <Icon name={pending ? "progress_activity" : submitIcon} className={`text-[18px] ${pending ? "animate-spin" : ""}`} />
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** A single button that runs a server action, optionally after a confirmation step, and shows the result. */
export function ActionButton({
  action,
  label,
  icon,
  confirm,
  className = btn.secondary,
  ariaLabel,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  icon?: string;
  confirm?: string;
  className?: string;
  /** Required when `label` is empty (icon-only button) */
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = () =>
    start(async () => {
      setAsking(false);
      setResult(await action());
    });
  return (
    <span className="inline-flex flex-col gap-1">
      {asking ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{confirm}</span>
          <button type="button" onClick={run} className={btn.danger}>
            Yes, continue
          </button>
          <button type="button" onClick={() => setAsking(false)} className={btn.ghost}>
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" disabled={pending} onClick={() => (confirm ? setAsking(true) : run())} aria-label={ariaLabel} title={ariaLabel} className={className}>
          {icon && <Icon name={pending ? "progress_activity" : icon} className={`text-[18px] ${pending ? "animate-spin" : ""}`} />}
          {label}
        </button>
      )}
      {result && (
        <span role={result.ok ? "status" : "alert"} className={`font-body-sm text-body-sm ${result.ok ? "text-tertiary" : "text-error"}`}>
          {result.ok ? (result.message ?? "Done.") : result.error}
        </span>
      )}
    </span>
  );
}
