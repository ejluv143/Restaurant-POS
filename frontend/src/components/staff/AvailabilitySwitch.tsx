"use client";

import { useState, useTransition } from "react";
import { availabilityAction } from "@/app/(staff)/actions";

/** Sold-out toggle for one dish at the active branch. */
export default function AvailabilitySwitch({ itemId, name, initial }: { itemId: string; name: string; initial: boolean }) {
  const [available, setAvailable] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-label={`${name} available at this branch`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await availabilityAction(itemId, !available);
            if (!r.ok) return setError(r.error);
            setError(null);
            setAvailable(!available);
          })
        }
        className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors disabled:opacity-60 ${available ? "bg-tertiary-container" : "bg-error-container"}`}
      >
        <span className={`block w-6 h-6 rounded-full bg-on-surface shadow transition-transform ${available ? "translate-x-5" : ""}`} />
      </button>
      <span className={`font-label-md text-label-md ${available ? "text-tertiary" : "text-error"}`}>{available ? "Available" : "Sold out"}</span>
      {error && (
        <span role="alert" className="font-body-sm text-body-sm text-error">
          {error}
        </span>
      )}
    </span>
  );
}
