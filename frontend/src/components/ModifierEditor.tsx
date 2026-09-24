"use client";

import { useState } from "react";
import type { BillLine } from "@/lib/floorTables";
import { MODIFIERS, joinMods, modifierCharge, splitMods } from "@/lib/modifiers";
import { peso } from "@/lib/rooms";

/**
 * "edit" changes an item already on a bill (marking it Modified); "add" sets up a new menu item,
 * with a quantity, before it goes on the ticket.
 */
export default function ModifierEditor({
  line,
  mode,
  onClose,
  onSave,
}: {
  line: BillLine;
  mode: "edit" | "add";
  onClose: () => void;
  onSave: (line: BillLine) => void;
}) {
  const groups = MODIFIERS[line.name] ?? [];
  const known = new Set(groups.flatMap((g) => g.options.map((o) => o.label)));
  const initial = splitMods(line.mods);
  // Labels this dish has no option for are kept as they are
  const kept = initial.filter((label) => !known.has(label));
  const unitBase = line.price / line.qty - modifierCharge(groups, initial);

  const [chosen, setChosen] = useState(() => initial.filter((label) => known.has(label)));
  const [note, setNote] = useState(line.note ?? "");
  const [qty, setQty] = useState(line.qty);

  const toggle = (groupIndex: number, label: string) => {
    const group = groups[groupIndex];
    setChosen((c) => {
      if (c.includes(label)) return c.filter((l) => l !== label);
      const others = group.max === 1 ? group.options.map((o) => o.label) : [];
      return [...c.filter((l) => !others.includes(l)), label];
    });
  };

  // Keep the menu's option order so the bill reads the same way every time
  const labels = [...groups.flatMap((g) => g.options.map((o) => o.label)).filter((l) => chosen.includes(l)), ...kept];
  const price = qty * (unitBase + modifierCharge(groups, labels));
  const mods = joinMods(labels);
  const changed = mode === "add" || mods !== line.mods || note.trim() !== (line.note ?? "");

  return (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-space-md" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${mode === "add" ? "Add" : "Edit modifiers for"} ${line.name}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-surface-container rounded-t-xl sm:rounded-xl shadow-xl flex flex-col"
      >
        <div className="p-space-md bg-surface-container-high flex items-start justify-between gap-space-sm">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">{mode === "add" ? "Add Item" : "Edit Modifiers"}</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {mode === "add" ? line.name : `${line.qty}× ${line.name}`}
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{peso(unitBase)} each before extras</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 shrink-0 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-md flex flex-col gap-space-md">
          {mode === "add" && (
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Quantity</span>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty === 1}
                  aria-label="One less"
                  className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
                <span className="w-8 text-center font-headline-sm text-headline-sm text-on-surface font-bold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  aria-label="One more"
                  className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>
          )}
          {groups.map((g, gi) => (
            <div key={g.name} className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                {g.name} <span className="normal-case tracking-normal">{g.max === 1 ? "• pick one" : "• pick any"}</span>
              </span>
              <div className="flex flex-wrap gap-space-xs">
                {g.options.map((o) => {
                  const on = chosen.includes(o.label);
                  return (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(gi, o.label)}
                      className={`min-h-[40px] px-space-md py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1 transition-colors ${
                        on ? "bg-primary-container text-on-primary-container shadow-sm" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                      }`}
                    >
                      {on && <span className="material-symbols-outlined text-[16px]">check</span>}
                      {o.label}
                      {o.price ? <span className={on ? "text-on-primary-container/80" : "text-tertiary"}>+{peso(o.price)}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <label className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Note for the kitchen</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              rows={2}
              placeholder="e.g. allergic to shrimp, serve with the mains"
              className="w-full rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm p-space-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>

        <div className="p-space-md bg-surface-container-high flex items-center justify-between gap-space-sm sticky bottom-0">
          <div>
            <span className="block font-label-sm text-label-sm text-on-surface-variant">Line total</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{peso(price)}</span>
          </div>
          <div className="flex gap-space-xs">
            <button type="button" onClick={onClose} className="min-h-[48px] px-space-md rounded-lg bg-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-highest">
              Cancel
            </button>
            <button
              type="button"
              disabled={!changed}
              onClick={() => onSave({ ...line, qty, mods, price, note: note.trim() || undefined, modified: mode === "edit" || line.modified })}
              className="min-h-[48px] px-space-lg rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold shadow-md hover:bg-primary-container/90 disabled:opacity-40 disabled:shadow-none"
            >
              {mode === "add" ? "Add to Order" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
