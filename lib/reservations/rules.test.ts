import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Temporal } from "temporal-polyfill";
import {
  canCancel,
  fitsBusinessHours,
  fitsCapacity,
  hasConflict,
  leadTimeIssue,
  makeReservationCode,
  overlaps,
  ownsReservation,
  parseSlot,
  type HoursDay,
  type Slot,
} from "./rules.ts";

const DURATION = 90;
const TUNIS = "Africa/Tunis"; // UTC+1 all year

// Stored: 0 = Sunday. Open Monday to Saturday 11:00-23:00, closed Sunday.
const HOURS: HoursDay[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isClosed: dayOfWeek === 0,
  openTime: dayOfWeek === 0 ? null : "11:00",
  closeTime: dayOfWeek === 0 ? null : "23:00",
}));

function slotAt(date: string, time: string, timeZone = TUNIS): Slot {
  const parsed = parseSlot(date, time, timeZone, DURATION);
  assert.ok(parsed.ok, "slot should parse");
  return parsed.slot;
}

const ms = (iso: string) => Temporal.Instant.from(iso).epochMilliseconds;
const span = (start: string, end: string) => ({ startsAtMs: ms(start), endsAtMs: ms(end) });

describe("parseSlot", () => {
  it("converts restaurant-local time to UTC and adds the slot length", () => {
    const slot = slotAt("2026-11-03", "19:30");
    assert.equal(slot.startsAt.toString(), "2026-11-03T18:30:00Z");
    assert.equal(slot.endsAt.toString(), "2026-11-03T20:00:00Z");
  });

  it("follows daylight saving in the restaurant timezone", () => {
    assert.equal(slotAt("2026-07-01", "20:00", "Europe/Paris").startsAt.toString(), "2026-07-01T18:00:00Z");
    assert.equal(slotAt("2026-12-01", "20:00", "Europe/Paris").startsAt.toString(), "2026-12-01T19:00:00Z");
  });

  it("rejects malformed or impossible dates and times", () => {
    for (const [date, time] of [
      ["2026-02-30", "19:00"],
      ["2026-13-01", "19:00"],
      ["03/11/2026", "19:00"],
      ["2026-11-03", "25:00"],
      ["2026-11-03", "7pm"],
    ]) {
      assert.equal(parseSlot(date, time, TUNIS, DURATION).ok, false, `${date} ${time}`);
    }
  });
});

describe("fitsBusinessHours", () => {
  it("accepts a slot inside the opening hours", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "19:00"), DURATION), true);
  });

  it("accepts a slot that starts at opening and one that ends exactly at closing", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "11:00"), DURATION), true);
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "21:30"), DURATION), true);
  });

  it("rejects a slot that ends after closing time", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "21:31"), DURATION), false);
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "22:30"), DURATION), false);
  });

  it("rejects a slot that starts before opening", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "10:30"), DURATION), false);
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-03", "03:00"), DURATION), false);
  });

  it("rejects a closed day (2026-11-01 is a Sunday)", () => {
    assert.equal(fitsBusinessHours(HOURS, slotAt("2026-11-01", "19:00"), DURATION), false);
  });

  it("uses the weekday of the restaurant timezone, not UTC", () => {
    // Monday 2026-11-02 00:30 in Tunis is still Sunday 23:30 UTC, but the day is Monday.
    const early = [{ dayOfWeek: 1, isClosed: false, openTime: "00:00", closeTime: "23:00" }];
    assert.equal(fitsBusinessHours(early, slotAt("2026-11-02", "00:30"), DURATION), true);
  });

  it("rejects a missing day and unsupported overnight hours", () => {
    assert.equal(fitsBusinessHours([], slotAt("2026-11-03", "19:00"), DURATION), false);
    const overnight = [{ dayOfWeek: 2, isClosed: false, openTime: "18:00", closeTime: "02:00" }];
    assert.equal(fitsBusinessHours(overnight, slotAt("2026-11-03", "19:00"), DURATION), false);
  });
});

describe("leadTimeIssue", () => {
  const now = Temporal.Instant.from("2026-11-03T10:00:00Z");
  const at = (iso: string): Slot => ({
    startsAt: Temporal.Instant.from(iso),
    endsAt: Temporal.Instant.from(iso),
    local: Temporal.Instant.from(iso).toZonedDateTimeISO("UTC"),
  });

  it("rejects the past and anything under 30 minutes away", () => {
    assert.equal(leadTimeIssue(at("2026-11-02T10:00:00Z"), now, 30, 60), "TOO_SOON");
    assert.equal(leadTimeIssue(at("2026-11-03T10:29:00Z"), now, 30, 60), "TOO_SOON");
  });

  it("accepts exactly 30 minutes ahead", () => {
    assert.equal(leadTimeIssue(at("2026-11-03T10:30:00Z"), now, 30, 60), null);
  });

  it("accepts exactly 60 days ahead and rejects beyond", () => {
    assert.equal(leadTimeIssue(at("2027-01-02T10:00:00Z"), now, 30, 60), null);
    assert.equal(leadTimeIssue(at("2027-01-02T10:01:00Z"), now, 30, 60), "TOO_FAR");
  });
});

describe("fitsCapacity", () => {
  it("accepts guests up to the table capacity", () => {
    assert.equal(fitsCapacity(4, 4), true);
    assert.equal(fitsCapacity(1, 4), true);
  });

  it("rejects more guests than seats, and invalid counts", () => {
    assert.equal(fitsCapacity(5, 4), false);
    assert.equal(fitsCapacity(0, 4), false);
    assert.equal(fitsCapacity(2.5, 4), false);
  });

  it("honours an optional minimum", () => {
    assert.equal(fitsCapacity(1, 6, 2), false);
    assert.equal(fitsCapacity(2, 6, 2), true);
  });
});

describe("overlaps / hasConflict", () => {
  const booked = span("2026-11-03T18:30:00Z", "2026-11-03T20:00:00Z");

  it("detects the same slot, a partial overlap and containment", () => {
    assert.equal(overlaps(booked, booked), true);
    assert.equal(overlaps(booked, span("2026-11-03T19:30:00Z", "2026-11-03T21:00:00Z")), true);
    assert.equal(overlaps(booked, span("2026-11-03T17:30:00Z", "2026-11-03T18:31:00Z")), true);
    assert.equal(overlaps(booked, span("2026-11-03T18:45:00Z", "2026-11-03T19:15:00Z")), true);
  });

  it("allows back-to-back slots", () => {
    assert.equal(overlaps(booked, span("2026-11-03T20:00:00Z", "2026-11-03T21:30:00Z")), false);
    assert.equal(overlaps(booked, span("2026-11-03T17:00:00Z", "2026-11-03T18:30:00Z")), false);
  });

  it("allows a different day", () => {
    assert.equal(overlaps(booked, span("2026-11-04T18:30:00Z", "2026-11-04T20:00:00Z")), false);
  });

  it("hasConflict is false for an empty list and true when any entry clashes", () => {
    assert.equal(hasConflict([], booked), false);
    assert.equal(hasConflict([span("2026-11-03T08:00:00Z", "2026-11-03T09:30:00Z"), booked], booked), true);
  });
});

describe("canCancel", () => {
  const cancellable = ["PENDING", "CONFIRMED"];
  const now = ms("2026-11-03T10:00:00Z");

  it("allows an upcoming PENDING or CONFIRMED reservation", () => {
    assert.equal(canCancel("CONFIRMED", ms("2026-11-03T18:30:00Z"), now, cancellable), true);
    assert.equal(canCancel("PENDING", ms("2026-11-03T18:30:00Z"), now, cancellable), true);
  });

  it("refuses a reservation whose start has passed", () => {
    assert.equal(canCancel("CONFIRMED", ms("2026-11-03T09:00:00Z"), now, cancellable), false);
    assert.equal(canCancel("CONFIRMED", now, now, cancellable), false);
  });

  it("refuses statuses that are already settled", () => {
    for (const status of ["SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]) {
      assert.equal(canCancel(status, ms("2026-11-03T18:30:00Z"), now, cancellable), false, status);
    }
  });
});

describe("ownsReservation", () => {
  it("only the customer who booked has access", () => {
    assert.equal(ownsReservation("user-a", "user-a"), true);
    assert.equal(ownsReservation("user-b", "user-a"), false);
  });
});

describe("makeReservationCode", () => {
  it("builds RST-XXXXXX from the readable alphabet", () => {
    const code = makeReservationCode((max) => max - 1);
    assert.match(code, /^RST-[A-HJKMNP-Z2-9]{6}$/);
  });

  it("never emits look-alike characters", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const code = makeReservationCode((max) => (seed * 7 + max) % max);
      assert.doesNotMatch(code.slice(4), /[01OIL]/);
    }
  });
});
