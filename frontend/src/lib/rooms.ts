export type RoomStatus = "occupied" | "checkout" | "vacant";

export interface RoomServiceLine {
  qty: number;
  name: string;
  /** Peso amount for the line */
  amount: number;
}

export interface HotelRoom {
  number: string;
  floor: number;
  type: string;
  beds: string;
  status: RoomStatus;
  guest?: string;
  guests?: number;
  stay?: string;
  tab: RoomServiceLine[];
}

/** Path each room's QR code opens for in-room ordering (appended to the site origin). */
export const roomOrderPath = (room: string) => `/order/room/${room}`;

// Sample hotel inventory until rooms are wired to the property-management system.
export const HOTEL_ROOMS: HotelRoom[] = [
  {
    number: "101",
    floor: 1,
    type: "Deluxe King",
    beds: "1 King",
    status: "occupied",
    guest: "M. Reyes",
    guests: 2,
    stay: "Night 2 of 3",
    tab: [
      { qty: 2, name: "Clubhouse Sandwich", amount: 780 },
      { qty: 2, name: "Iced Calamansi Tea", amount: 240 },
    ],
  },
  { number: "102", floor: 1, type: "Deluxe Twin", beds: "2 Twin", status: "vacant", tab: [] },
  {
    number: "103",
    floor: 1,
    type: "Deluxe King",
    beds: "1 King",
    status: "checkout",
    guest: "J. Tan",
    guests: 1,
    stay: "Check-out 12:00 PM",
    tab: [
      { qty: 1, name: "Tapsilog", amount: 380 },
      { qty: 1, name: "Kapeng Barako (Pot)", amount: 220 },
    ],
  },
  { number: "104", floor: 1, type: "Deluxe Twin", beds: "2 Twin", status: "vacant", tab: [] },
  { number: "105", floor: 1, type: "Family Room", beds: "1 Queen + 2 Twin", status: "occupied", guest: "A. Santos", guests: 4, stay: "Night 1 of 4", tab: [] },
  { number: "106", floor: 1, type: "Deluxe King", beds: "1 King", status: "vacant", tab: [] },
  {
    number: "201",
    floor: 2,
    type: "Junior Suite",
    beds: "1 King",
    status: "occupied",
    guest: "K. Lim",
    guests: 2,
    stay: "Night 3 of 5",
    tab: [
      { qty: 1, name: "Crispy Pata (Whole)", amount: 895 },
      { qty: 1, name: "Kare-Kare", amount: 650 },
      { qty: 1, name: "San Miguel Pale Pilsen (Bucket of 6)", amount: 540 },
    ],
  },
  { number: "202", floor: 2, type: "Deluxe King", beds: "1 King", status: "occupied", guest: "R. Cruz", guests: 1, stay: "Night 1 of 2", tab: [] },
  {
    number: "203",
    floor: 2,
    type: "Deluxe Twin",
    beds: "2 Twin",
    status: "checkout",
    guest: "L. Garcia",
    guests: 2,
    stay: "Check-out 11:00 AM",
    tab: [{ qty: 2, name: "Longsilog", amount: 700 }],
  },
  { number: "204", floor: 2, type: "Deluxe King", beds: "1 King", status: "vacant", tab: [] },
  { number: "205", floor: 2, type: "Executive Suite", beds: "1 King", status: "vacant", tab: [] },
  {
    number: "206",
    floor: 2,
    type: "Family Room",
    beds: "1 Queen + 2 Twin",
    status: "occupied",
    guest: "D. Villanueva",
    guests: 3,
    stay: "Night 2 of 2",
    tab: [
      { qty: 1, name: "Chicken Inasal", amount: 320 },
      { qty: 2, name: "Lumpiang Shanghai", amount: 560 },
    ],
  },
];

/** Only checked-in rooms can charge room-service orders to the room. */
export const acceptsRoomService = (room: HotelRoom) => room.status === "occupied" || room.status === "checkout";

export const tabTotal = (room: HotelRoom) => room.tab.reduce((s, l) => s + l.amount, 0);

const pesoFormat = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const peso = (n: number) => `₱${pesoFormat.format(n)}`;
