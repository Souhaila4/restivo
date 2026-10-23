import { canManageRestaurant } from "@/lib/restaurants/access";
import { getFloors } from "./floors/get-floors";
import { getMenu } from "./menu/get-menu";
import { getRestaurant } from "./restaurant/get-restaurant";
import { getStaff } from "./staff/get-staff";
import { createRegistry, type ToolAccess } from "./registry";

/** Allowlist. Append a tool here to expose it. Order is the order the model sees. */
const registry = createRegistry(
  [getRestaurant, getFloors, getMenu, getStaff],
  canManageRestaurant
);

export function groqTools() {
  return registry.schemas();
}

export function runManagerTool(name: string, access: ToolAccess, rawArguments?: string) {
  return registry.run(name, access, rawArguments);
}
