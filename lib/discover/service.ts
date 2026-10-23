/**
 * Customer-facing reads. A restaurant is discoverable when it is ACTIVE and
 * has at least one active floor holding at least one active table (the same
 * rule that gates publication).
 */
import { db } from "@/lib/db";
import { RestaurantError } from "@/lib/restaurants/errors";
import { publishBlocker } from "@/lib/restaurants/publish";
import { listFloors } from "@/lib/floors/service";
import { matchesQuery } from "./search";
import type {
  DiscoverFloor,
  DiscoverHours,
  DiscoverRestaurantDetail,
  DiscoverRestaurantSummary,
  DiscoverTable,
} from "./types";

type RestaurantRow = NonNullable<Awaited<ReturnType<typeof findRestaurant>>>;

async function findRestaurant(id: string) {
  return db.orm.public.Restaurant.where({ id }).first();
}

async function activeTables(floorId: string): Promise<DiscoverTable[]> {
  const rows = await db.orm.public.Table.where({ floorId, isActive: true }).all();
  return rows
    .map((row) => ({ id: row.id, floorId, name: row.name, capacity: row.capacity }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Active floors with their active tables, or null when not bookable. */
async function bookableFloors(restaurantId: string) {
  const floors = (await listFloors(restaurantId)).filter((floor) => floor.isActive);
  const tables = (await Promise.all(floors.map((floor) => activeTables(floor.id)))).flat();
  const blocker = publishBlocker(
    floors.map((floor) => ({
      isActive: floor.isActive,
      activeTableCount: tables.filter((table) => table.floorId === floor.id).length,
    })),
  );
  return blocker ? null : { floors, tables };
}

/** Active tables on active floors; the tables a customer can book. */
export async function listBookableTables(restaurantId: string): Promise<DiscoverTable[]> {
  const floors = await db.orm.public.Floor.where({ restaurantId }).all();
  const active = floors.filter((floor) => floor.isActive);
  return (await Promise.all(active.map((floor) => activeTables(floor.id)))).flat();
}

function toSummary(row: RestaurantRow): DiscoverRestaurantSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    city: row.city,
    coverUrl: row.coverUrl,
    logoUrl: row.logoUrl,
  };
}

export async function listDiscoverRestaurants(query: string): Promise<DiscoverRestaurantSummary[]> {
  const rows = await db.orm.public.Restaurant.where({ status: "ACTIVE" }).all();
  const matching = rows
    .filter((row) => matchesQuery(row, query))
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: DiscoverRestaurantSummary[] = [];
  for (const row of matching) {
    if (await bookableFloors(row.id)) result.push(toSummary(row));
  }
  return result;
}

export async function getDiscoverRestaurant(id: string): Promise<DiscoverRestaurantDetail> {
  const row = await findRestaurant(id);
  if (!row || row.status !== "ACTIVE") {
    throw new RestaurantError("NOT_FOUND", "Restaurant not found.");
  }
  const bookable = await bookableFloors(row.id);
  if (!bookable) throw new RestaurantError("NOT_FOUND", "Restaurant not found.");

  const hoursRows = await db.orm.public.BusinessHours.where({ restaurantId: row.id }).all();
  const hours: DiscoverHours[] = hoursRows
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isClosed: day.isClosed,
      openTime: day.openTime,
      closeTime: day.closeTime,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const floors: DiscoverFloor[] = bookable.floors.map((floor) => ({
    id: floor.id,
    name: floor.name,
    width: floor.width,
    height: floor.height,
    objects: floor.objects,
  }));

  return {
    ...toSummary(row),
    address: row.address,
    phone: row.phone,
    website: row.website,
    currency: row.currency,
    timezone: row.timezone,
    hours,
    floors,
    tables: bookable.tables,
  };
}
