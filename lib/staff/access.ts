import { AuthError } from "@/lib/auth/errors";
import { requireActiveUser } from "@/lib/auth/active-user";
import { resolveRestaurantAccess } from "@/lib/auth/access";

export async function requireStaffUser(request: Request) {
  const user = await requireActiveUser(request);

  const access = await resolveRestaurantAccess(user.id, user.managementRole ?? null);
  if (!access.isStaff) {
    throw new AuthError("FORBIDDEN", "Only staff can ask to join a restaurant.");
  }

  return user;
}
