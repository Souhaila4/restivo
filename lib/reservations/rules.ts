/**
 * Booking rules as pure functions, so node:test can run them directly.
 *
 * Every policy value (slot length, lead time, horizon) is a parameter: callers
 * pass the constants from `./constants`. This file only imports the Temporal
 * polyfill and nothing from the app.
 *
 * Known limit (V1): opening hours that run past midnight (close <= open) are
 * not supported. A slot must start and end on the same local day.
 */
import { Temporal } from "temporal-polyfill";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

// ─── Slot ─────────────────────────────────────────────────────────────────────

export type Slot = {
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  /** Start in the restaurant timezone, for hours checks and display. */
  local: Temporal.ZonedDateTime;
};

export type SlotParse = { ok: true; slot: Slot } | { ok: false; message: string };

/** Turns the restaurant-local `date` ("YYYY-MM-DD") and `time` ("HH:MM") into a UTC slot. */
export function parseSlot(date: string, time: string, timeZone: string, durationMinutes: number): SlotParse {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Choose a valid date." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, message: "Choose a valid time." };

  try {
    const local = Temporal.PlainDate.from(date, { overflow: "reject" }).toZonedDateTime({
      timeZone,
      plainTime: Temporal.PlainTime.from(time),
    });
    return {
      ok: true,
      slot: {
        startsAt: local.toInstant(),
        endsAt: local.add({ minutes: durationMinutes }).toInstant(),
        local,
      },
    };
  } catch {
    return { ok: false, message: "Choose a valid date and time." };
  }
}

// ─── Opening hours ────────────────────────────────────────────────────────────

export type HoursDay = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

function minutesOf(time: string | null): number | null {
  const match = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** True when the whole slot (start to end) lies inside that day's opening hours. */
export function fitsBusinessHours(hours: HoursDay[], slot: Slot, durationMinutes: number): boolean {
  // Temporal: 1 = Monday ... 7 = Sunday. Stored: 0 = Sunday ... 6 = Saturday.
  const dayOfWeek = slot.local.dayOfWeek % 7;
  const day = hours.find((entry) => entry.dayOfWeek === dayOfWeek);
  if (!day || day.isClosed) return false;

  const open = minutesOf(day.openTime);
  const close = minutesOf(day.closeTime);
  if (open === null || close === null || close <= open) return false;

  const start = slot.local.hour * 60 + slot.local.minute;
  return start >= open && start + durationMinutes <= close;
}

// ─── Lead time and horizon ────────────────────────────────────────────────────

export type LeadIssue = "TOO_SOON" | "TOO_FAR";

export function leadTimeIssue(
  slot: Slot,
  now: Temporal.Instant,
  minLeadMinutes: number,
  maxDaysAhead: number,
): LeadIssue | null {
  const start = slot.startsAt.epochMilliseconds;
  if (start < now.epochMilliseconds + minLeadMinutes * MS_PER_MINUTE) return "TOO_SOON";
  if (start > now.epochMilliseconds + maxDaysAhead * MS_PER_DAY) return "TOO_FAR";
  return null;
}

// ─── Capacity and overlap ─────────────────────────────────────────────────────

export function fitsCapacity(guests: number, capacity: number, minCapacity?: number | null): boolean {
  if (!Number.isInteger(guests) || guests < 1) return false;
  if (guests > capacity) return false;
  return minCapacity == null || guests >= minCapacity;
}

export type Interval = { startsAtMs: number; endsAtMs: number };

/** Half-open intervals: a slot ending at 20:00 does not clash with one starting at 20:00. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAtMs < b.endsAtMs && a.endsAtMs > b.startsAtMs;
}

export function hasConflict(existing: Interval[], candidate: Interval): boolean {
  return existing.some((interval) => overlaps(interval, candidate));
}

// ─── Cancellation and access ──────────────────────────────────────────────────

/** A customer can cancel an active reservation only while it is still ahead. */
export function canCancel(
  status: string,
  startsAtMs: number,
  nowMs: number,
  cancellable: readonly string[],
): boolean {
  return cancellable.includes(status) && startsAtMs > nowMs;
}

/** Reservations are private to the customer who made them. */
export function ownsReservation(userId: string, customerId: string): boolean {
  return userId === customerId;
}

// ─── Reservation code ─────────────────────────────────────────────────────────

// No 0/O or 1/I/L, to stay readable when read aloud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** `random` returns an integer in [0, max); injectable for tests. */
export function makeReservationCode(random: (max: number) => number): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) suffix += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return `RST-${suffix}`;
}
