import { z } from "zod";
import { RestaurantError } from "@/lib/restaurants/errors";

const searchSchema = z.string().trim().max(80, "Search text is too long.");

/** Reads the optional `?q=` parameter of the restaurant list. */
export function parseSearchParam(url: string): string {
  const raw = new URL(url).searchParams.get("q") ?? "";
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new RestaurantError("VALIDATION_ERROR", parsed.error.issues[0]?.message);
  }
  return parsed.data;
}
