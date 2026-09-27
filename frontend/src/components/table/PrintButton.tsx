"use client";

export default function PrintButton({ label = "Print all stands" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 px-space-lg rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center gap-space-sm shadow-sm active:scale-95 transition-all print:hidden"
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden>
        print
      </span>
      {label}
    </button>
  );
}
