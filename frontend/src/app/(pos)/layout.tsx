/* eslint-disable @next/next/no-img-element */
import NavTabs from "@/components/NavTabs";

const TOOLS = [
  { icon: "point_of_sale", title: "Open Cash Drawer" },
  { icon: "swap_horiz", title: "Server Transfer" },
  { icon: "schedule", title: "Clock In/Out" },
  { icon: "help", title: "Help & Support" },
];

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 lg:fixed lg:left-0 lg:right-0 z-50 bg-surface-container/95 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
        <div className="w-full px-space-md sm:px-space-lg py-space-sm lg:py-0 lg:h-16 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-space-md gap-y-space-sm">
          <div className="flex items-center gap-space-md min-w-0 lg:shrink-0">
            <img
              alt="SynchubPOS Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1Ufn0ajT4HGsOQo9540HhgvWi5-OR8RF9jxnjNOcYch-E9VVFzFhmFS7QhEMn3x2TE248oa2lpuTHVjkxu8JFsOhaEZG9pH9Mf33GAKm4A4Vhcic4MhYonk9OXFtzAI8-41qL5JGELBpr72RXYpS3X3dYcZrUju8RauQidNBKOVdq_5rdakpO0DxTUKTuML00ANSvx3eQ_EYw_xij9WJVq77T-jA7XFXRn8Ykyhi-AP188kMH4Xm_luWQbH"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface leading-tight tracking-tight truncate">The Oakwood Bistro</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-space-xs">
                Terminal #04 • Dining Main
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary ml-1 animate-pulse"></span>
                <span className="text-secondary font-label-sm text-label-sm">Online</span>
              </span>
            </div>
          </div>
          <NavTabs />
          <div className="flex items-center gap-space-sm shrink-0">
            <div className="hidden sm:flex items-center gap-space-xs bg-surface-container-lowest p-1 rounded-lg">
              {TOOLS.map((tool) => (
                <button
                  key={tool.icon}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors active:scale-95"
                  title={tool.title}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-space-sm pl-space-sm">
              <div className="flex-col text-right hidden lg:flex">
                <span className="font-body-md text-body-md text-on-surface font-medium leading-none">Andrea R.</span>
                <span className="font-label-sm text-label-sm text-tertiary leading-tight">Floor Mgr</span>
              </div>
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuClQ1_eGjUiIHU-QLhxiiy9bWdcHHFhI6yGkSKteBWH34wnt8yPa3c0YNoXKoyFfxF2ZqVWYBigihHaOYBHrBkokHX1IzDcEnwzCGKBKUoNt4CBkaCkODH3eKbfln4biOWu_5Qszz8cgDtHOJ5n2YZ1VgZaVL-F5KCC64FkFJKi0CJJFSDyFXoSroa6e1NQGTVuXrSAqkqQdqiYD8fvJofLStG2vs7cjIG313h-ia_o3_9S9Emo_xRfVQ"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full lg:pt-16 bg-surface min-h-[calc(100vh-2.5rem)]">{children}</main>

      <footer className="w-full bg-surface-container-lowest py-space-xs px-space-lg text-center">
        <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-x-space-md gap-y-space-xs text-on-surface-variant font-label-sm text-label-sm">
          <span>SynchubPOS v4.18.2 • Station ID #04</span>
          <span className="flex items-center gap-space-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>Cloud Sync Active (0.12s latency)
          </span>
          <span>Support: 1-855-345-6340</span>
        </div>
      </footer>
    </>
  );
}
