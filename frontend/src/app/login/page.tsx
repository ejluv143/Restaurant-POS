import type { Metadata } from "next";
import Link from "next/link";
import { inter } from "@/lib/fonts";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Staff Sign In • Sync Hub Resto", robots: { index: false, follow: false } };

// Seeded accounts (see src/db/seed.ts); never shown in a production build
const DEMO =
  process.env.NODE_ENV === "production"
    ? undefined
    : {
        password: "ChangeMe!2026",
        accounts: [
          { email: "cashier@synchub.dev", label: "Cashier (Malaybalay)" },
          { email: "kitchen@synchub.dev", label: "Kitchen (Malaybalay)" },
          { email: "manager@synchub.dev", label: "Branch Manager (Malaybalay)" },
          { email: "manager.valencia@synchub.dev", label: "Branch Manager (Valencia)" },
          { email: "admin@synchub.dev", label: "Restaurant Admin" },
          { email: "sysadmin@synchub.dev", label: "System Admin" },
        ],
      };

const ASSURANCES = [
  { icon: "lock", text: "Secure sessions that scripts can't read, signed out after 12 hours" },
  { icon: "badge", text: "Each role opens only its own screens: floor, kitchen or admin" },
  { icon: "shield_person", text: "Repeated wrong passwords lock the account for 15 minutes" },
];

// Staff sign-in. Needs the server and database, so the GitHub Pages build drops it (see .github/workflows/pages.yml).
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className={`theme-resto ${inter.variable} min-h-screen font-body-md selection:bg-primary-container selection:text-on-primary-container`}>
      <div className="min-h-screen grid lg:grid-cols-2">
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-outline-variant/20 bg-surface-container-lowest p-12">
          <div className="pointer-events-none absolute -left-24 top-1/3 h-[480px] w-[480px] rounded-full bg-primary-container/15 blur-3xl" />
          <Link href="/" className="relative flex items-center gap-2 group w-fit">
            <span className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-md group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined" aria-hidden>
                restaurant
              </span>
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Sync Hub Resto</span>
          </Link>

          <div className="relative max-w-md">
            <h1 className="font-headline-lg text-headline-xl text-on-surface">
              The Heart of the Kitchen.
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-fixed via-primary-container to-secondary">The Pace of the Floor.</span>
            </h1>
            <ul className="mt-space-xl flex flex-col gap-space-md">
              {ASSURANCES.map((a) => (
                <li key={a.icon} className="flex items-start gap-space-sm font-body-md text-body-lg text-on-surface-variant">
                  <span className="material-symbols-outlined text-tertiary" aria-hidden>
                    {a.icon}
                  </span>
                  {a.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative font-body-sm text-body-sm text-on-surface-variant">Authorized staff only. Sign-ins are logged.</p>
        </aside>

        <main className="flex flex-col items-center justify-center px-space-md py-space-xl sm:px-space-xl">
          <div className="w-full max-w-md flex flex-col gap-space-xl">
            <Link href="/" className="lg:hidden flex items-center gap-2 w-fit">
              <span className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
                <span className="material-symbols-outlined" aria-hidden>
                  restaurant
                </span>
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Sync Hub Resto</span>
            </Link>

            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Staff sign in</h2>
              <p className="mt-1 font-body-md text-body-lg text-on-surface-variant">Use the work email and password your manager set up for you.</p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-space-lg kds-card-border">
              <LoginForm next={typeof next === "string" ? next : undefined} demo={DEMO} />
            </div>

            <Link href="/" className="inline-flex items-center gap-1 self-center font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                arrow_back
              </span>
              Back to Sync Hub Resto
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
