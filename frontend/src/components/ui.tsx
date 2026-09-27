import type { ReactNode } from "react";

// Shared building blocks for the staff screens, in the Sync Hub Resto theme (.theme-resto tokens).
// Server-safe: no hooks, so pages can render them directly.

export function Icon({ name, className = "", filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: ReactNode; icon?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-container/15 border border-primary-container/30 text-primary flex items-center justify-center">
            <Icon name={icon} className="text-[24px]" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">{title}</h1>
          {subtitle && <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, icon, actions, children, className = "", padded = true }: { title?: ReactNode; icon?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-outline-variant/20">
          <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
            {icon && <Icon name={icon} className="text-[20px] text-primary" />}
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon, tone = "primary" }: { label: string; value: ReactNode; hint?: ReactNode; icon: string; tone?: "primary" | "secondary" | "tertiary" | "error" | "neutral" }) {
  const toneCls = {
    primary: "text-primary border-primary-container",
    secondary: "text-secondary border-secondary",
    tertiary: "text-tertiary border-tertiary",
    error: "text-error border-error",
    neutral: "text-on-surface border-outline",
  }[tone];
  return (
    <div className={`rounded-xl bg-surface-container-low border border-outline-variant/30 border-l-4 ${toneCls.split(" ")[1]} p-4 flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</p>
        <p className={`mt-1 font-headline-lg text-headline-lg-mobile sm:text-headline-lg font-bold tabular-nums ${toneCls.split(" ")[0]}`}>{value}</p>
        {hint && <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{hint}</p>}
      </div>
      <Icon name={icon} className={`text-[26px] ${toneCls.split(" ")[0]} opacity-80`} />
    </div>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-label-sm text-label-sm uppercase tracking-wide whitespace-nowrap ${className}`}>{children}</span>;
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="py-12 flex flex-col items-center text-center gap-2 text-on-surface-variant">
      <Icon name={icon} className="text-[44px] text-outline" />
      <p className="font-headline-sm text-headline-sm text-on-surface">{title}</p>
      {children && <div className="font-body-md text-body-md max-w-md">{children}</div>}
    </div>
  );
}

// Class names for plain <button>/<Link>/<a> so every screen's actions look the same
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-sm hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 rounded-lg border border-outline-variant/50 bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed",
  ghost: "inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-60",
  danger:
    "inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 rounded-lg border border-error/40 bg-error-container/20 text-error font-label-lg text-label-lg hover:bg-error-container/40 active:scale-[0.98] transition-all disabled:opacity-60",
  success:
    "inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 rounded-lg bg-tertiary-container text-on-tertiary-container font-label-lg text-label-lg font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60",
};

export const input =
  "w-full min-h-10 rounded-lg bg-surface-container border border-outline-variant/50 px-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60";

export const label = "font-label-md text-label-md text-on-surface-variant";

export function Field({ label: text, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={label}>
        {text}
      </label>
      {children}
      {hint && <p className="font-body-sm text-body-sm text-outline">{hint}</p>}
    </div>
  );
}

/** Responsive data table wrapper: scrolls sideways on phones instead of breaking the page width. */
export function DataTable({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[640px] text-left font-body-md text-body-md">
        <thead>
          <tr className="border-b border-outline-variant/30 text-on-surface-variant">
            {head.map((h, i) => (
              <th key={i} scope="col" className="py-2.5 pr-4 font-label-md text-label-md uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
