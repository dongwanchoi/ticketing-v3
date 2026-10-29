// Derived from docs/api/openapi.yaml v0.2.0.
export type Error = { code: string; message: string };
export type User = {
  id: number;
  email: string;
  role: "BUYER" | "SELLER" | "ADMIN";
};
export type Credentials = { email: string; password: string };
export type Csrf = { token: string; headerName: string };
export type Performance = {
  id: number;
  title: string;
  venueName: string;
  minPriceKrw: number;
  maxPriceKrw: number;
};
export type Session = {
  id: number;
  startsAt: string;
  remainingSeats: number;
  minPriceKrw: number;
  maxPriceKrw: number;
};
export type PerformanceDetail = {
  id: number;
  title: string;
  venueName: string;
  description: string;
  sessions: Array<Session>;
};
export type Seat = {
  id: number;
  label: string;
  rowLabel: string;
  seatNumber: number;
};
export type Venue = { id: number; name: string; seats: Array<Seat> };
export type CreateVenue = { name: string; rows: number; seatsPerRow: number };
export type CreatePerformance = {
  title: string;
  description: string;
  venueId: number;
};
export type ManagedPerformance = {
  id: number;
  title: string;
  description: string;
  venueId: number;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  saleStatus: "PREPARING" | "OPEN" | "CLOSED";
};
export type CreateSession = { startsAt: string; priceKrw: number };
export type Sale = {
  status: "PREPARING" | "OPEN" | "CLOSED";
  startsAt: string | null;
  endsAt: string | null;
};
export type Review = { decision: "APPROVED" | "REJECTED" };
export type SessionSeat = {
  seatId: number;
  label: string;
  priceKrw: number;
  status: "AVAILABLE" | "HELD" | "BOOKED";
};
export type CreateHold = { sessionId: number; seatIds: Array<number> };
export type Hold = {
  id: number;
  sessionId: number;
  seatIds: Array<number>;
  expiresAt: string;
  status: "ACTIVE" | "RELEASED" | "EXPIRED" | "CONFIRMED";
  totalKrw: number;
};
export type Pay = { outcome: "SUCCESS" | "FAILURE" };
export type Payment = {
  id: number;
  holdId: number;
  status: "SUCCESS" | "FAILED";
  reservationId: number | null;
  amountKrw: number;
};
export type Reservation = {
  id: number;
  performanceTitle: string;
  sessionId: number;
  startsAt: string;
  seatLabels: Array<string>;
  totalKrw: number;
  status: "CONFIRMED";
};
