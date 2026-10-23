/**
 * GET /api/discover/restaurants?q= — published restaurants, filtered by name or city.
 */
import { requireActiveUser } from "@/lib/auth/active-user";
import { toRestaurantErrorResponse } from "@/lib/restaurants/errors";
import { listDiscoverRestaurants } from "@/lib/discover/service";
import { parseSearchParam } from "@/lib/discover/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireActiveUser(request);
    const restaurants = await listDiscoverRestaurants(parseSearchParam(request.url));
    return Response.json({ ok: true, restaurants });
  } catch (err) {
    return toRestaurantErrorResponse(err);
  }
}
