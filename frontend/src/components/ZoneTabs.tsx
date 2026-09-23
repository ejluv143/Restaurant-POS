import Link from "next/link";
import { HOTEL_ROOMS } from "@/lib/rooms";

type ZoneId = "dining" | "rooms";

const occupiedRooms = HOTEL_ROOMS.filter((r) => r.status === "occupied" || r.status === "checkout").length;

const ZONES: { id: string; icon: string; label: string; count: string; href?: string }[] = [
  { id: "dining", icon: "table_restaurant", label: "Main Dining Room", count: "18/24", href: "/" },
  { id: "patio", icon: "deck", label: "Patio & Terrace", count: "11/14" },
  { id: "bar", icon: "local_bar", label: "Bar & Lounge", count: "16/18" },
  { id: "private", icon: "meeting_room", label: "Private Dining Rm", count: "Res. 8:30p" },
  { id: "rooms", icon: "hotel", label: "Hotel Rooms", count: `${occupiedRooms}/${HOTEL_ROOMS.length}`, href: "/rooms" },
];

const ACTIVE = "group flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-primary text-on-primary shadow-sm font-label-md text-label-md transition-all";
const IDLE =
  "flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-label-md text-label-md transition-all";

export default function ZoneTabs({ active }: { active: ZoneId }) {
  return (
    <div className="flex items-center gap-space-xs overflow-x-auto pb-1 sm:pb-0">
      {ZONES.map((z) => {
        const isActive = z.id === active;
        const content = (
          <>
            <span className="material-symbols-outlined text-[18px]">{z.icon}</span>
            <span>{z.label}</span>
            {isActive ? (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-container-lowest/30 text-on-primary font-label-sm text-label-sm">{z.count}</span>
            ) : (
              <span className="ml-1 text-on-surface-variant font-label-sm text-label-sm">{z.count}</span>
            )}
          </>
        );
        return z.href ? (
          <Link key={z.id} href={z.href} aria-current={isActive ? "page" : undefined} className={`${isActive ? ACTIVE : IDLE} shrink-0`}>
            {content}
          </Link>
        ) : (
          <button key={z.id} className={`${IDLE} shrink-0`} type="button">
            {content}
          </button>
        );
      })}
    </div>
  );
}
