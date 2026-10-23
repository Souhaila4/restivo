import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";

/** What a customer sees in the restaurant list. No owner or contact internals. */
export type DiscoverRestaurantSummary = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
};

export type DiscoverHours = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export type DiscoverTable = {
  id: string;
  floorId: string;
  name: string;
  capacity: number;
};

export type DiscoverFloor = {
  id: string;
  name: string;
  width: number;
  height: number;
  objects: FloorObject[];
};

export type DiscoverRestaurantDetail = DiscoverRestaurantSummary & {
  address: string | null;
  phone: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  hours: DiscoverHours[];
  floors: DiscoverFloor[];
  tables: DiscoverTable[];
};
