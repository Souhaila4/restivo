import { ApiError } from "@/lib/auth/client";
import type { DiscoverRestaurantDetail, DiscoverRestaurantSummary } from "./types";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status,
    );
  }
  return json as T;
}

function authHeaders(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` }, credentials: "include" as const };
}

export async function apiListDiscoverRestaurants(
  accessToken: string,
  query: string,
  signal?: AbortSignal,
): Promise<DiscoverRestaurantSummary[]> {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const res = await fetch(`/api/discover/restaurants${search}`, { ...authHeaders(accessToken), signal });
  const json = await handleResponse<{ restaurants: DiscoverRestaurantSummary[] }>(res);
  return json.restaurants;
}

export async function apiGetDiscoverRestaurant(
  accessToken: string,
  restaurantId: string,
): Promise<DiscoverRestaurantDetail> {
  const res = await fetch(`/api/discover/restaurants/${encodeURIComponent(restaurantId)}`, authHeaders(accessToken));
  const json = await handleResponse<{ restaurant: DiscoverRestaurantDetail }>(res);
  return json.restaurant;
}
