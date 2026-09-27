// Printable table stand: guests scan it to open /order/table/[token]
export interface TableQrCardProps {
  restaurant: string;
  number: string;
  zone: string;
  zoneDescription: string | null;
  standId: string;
  wifiSsid: string | null;
  wifiPassword: string | null;
  qrSvg: string;
}

const STEPS = [
  { title: "Scan QR", text: "Instant table lock" },
  { title: "Order Food", text: "Live dietary notes" },
  { title: "Pay & Relax", text: "Split or pay solo" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export default function TableQrCard(p: TableQrCardProps) {
  return (
    <div className="relative p-6 break-inside-avoid">
      {/* Print crop marks */}
      {["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((c) => (
        <span key={c} aria-hidden className={`absolute w-5 h-5 border-outline-variant/60 ${c}`} />
      ))}

      <article className="w-[330px] rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-2xl px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
        <header className="flex flex-col items-center gap-2">
          <h2 className="flex items-center gap-1.5 font-headline-md text-headline-sm text-on-surface uppercase tracking-tight font-extrabold">
            <Icon name="restaurant" className="text-[18px] text-primary" />
            {p.restaurant}
            <Icon name="local_bar" className="text-[18px] text-primary" />
          </h2>
          <span className="px-3 py-1 rounded-full bg-primary-container/15 border border-primary-container/50 text-primary text-label-sm font-label-sm uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {p.zone}
          </span>
        </header>

        <div>
          <p className="font-headline-lg text-headline-xl text-on-surface uppercase leading-none">Table {p.number}</p>
          <p className="mt-2 text-body-sm font-body-sm text-on-surface-variant">
            {p.zoneDescription ?? p.zone} • Dynamic Kitchen Ordering Enabled
          </p>
        </div>

        {p.wifiSsid && (
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/30">
            <div className="flex items-center gap-2.5 text-left">
              <Icon name="wifi" className="text-[20px] text-secondary" />
              <div className="font-mono text-[11px] leading-4 text-on-surface-variant">
                Guest Wi-Fi: <b className="text-on-surface">{p.wifiSsid}</b>
                {p.wifiPassword && (
                  <>
                    <br />
                    Pass: <b className="text-on-surface">{p.wifiPassword}</b>
                  </>
                )}
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-tertiary-container/20 border border-tertiary-container/50 text-tertiary text-[10px] font-label-sm font-bold uppercase whitespace-nowrap">Free Fast Wi-Fi</span>
          </div>
        )}

        {/* QR with bracket frame and center mark (error correction H tolerates the overlay) */}
        <div className="relative p-2.5">
          {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
            <span key={c} aria-hidden className={`absolute w-4 h-4 border-primary-container ${c}`} />
          ))}
          <div className="relative w-[168px] h-[168px] rounded-lg bg-[#fbf6f1] p-2 shadow-inner">
            <div role="img" aria-label={`QR code to order at table ${p.number}`} className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: p.qrSvg }} />
            <span className="absolute inset-0 m-auto w-9 h-9 rounded-md bg-[#141312] border-2 border-primary-container flex items-center justify-center">
              <Icon name="restaurant" className="text-[18px] text-primary" />
            </span>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-label-md font-label-md text-primary uppercase font-bold">
          <Icon name="photo_camera" className="text-[16px]" />
          Point camera at QR code to begin
        </p>

        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] font-label-sm font-semibold text-on-surface-variant">
          {["No App Download", "Apple & Google Pay", "Instant Kitchen Sync"].map((f) => (
            <li key={f}>
              <span className="text-tertiary">✓</span> {f}
            </li>
          ))}
        </ul>

        <ol className="w-full grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg bg-surface-container border border-outline-variant/30 px-1 py-2.5 flex flex-col items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-primary-container/20 border border-primary-container/50 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-label-md font-label-md text-on-surface">{s.title}</span>
              <span className="text-[10px] leading-3 font-label-sm font-medium text-on-surface-variant">{s.text}</span>
            </li>
          ))}
        </ol>

        <div className="w-full rounded-lg bg-surface-container-lowest border border-outline-variant/30 px-3 py-2.5 space-y-1.5">
          <p className="text-[11px] leading-4 font-body-sm text-on-surface-variant">
            Prefer physical service? Tap <b className="text-primary">&ldquo;Call Server&rdquo;</b> in mobile view or wave to anyone in a hearth-copper apron.
          </p>
          <p className="flex items-center justify-center gap-1 text-[10px] font-label-sm font-bold text-error">
            <Icon name="error" className="text-[12px]" />
            Please alert staff directly of severe anaphylactic allergies.
          </p>
        </div>

        <footer className="w-full flex items-center justify-between pt-2 font-mono text-[9px] tracking-wider text-on-surface-variant uppercase">
          <span>
            {p.restaurant} • {p.zone.split(" ").at(-1)} {p.number}
          </span>
          <span>Stand ID: {p.standId}</span>
        </footer>
      </article>
    </div>
  );
}
