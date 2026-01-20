/**
 * Multi-Tenancy Context and Middleware
 * Ensures all operations are scoped to the correct restaurant (tenant)
 */

import { TRPCError } from "@trpc/server";
import { getRestaurantsByUserId, getStaffMember } from "./db";

export interface TenantContext {
  restaurantId: number;
  role: "owner" | "manager" | "staff";
  permissions: {
    agents?: string[];
    canManageBilling?: boolean;
    canManageStaff?: boolean;
    canViewAnalytics?: boolean;
  };
}

/**
 * Get tenant context for a user
 * Returns the restaurant they have access to and their role
 */
export async function getTenantContext(userId: number, restaurantId?: number): Promise<TenantContext> {
  // Get all restaurants the user has access to
  const userRestaurants = await getRestaurantsByUserId(userId);

  if (userRestaurants.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User does not have access to any restaurant",
    });
  }

  // If restaurantId is provided, verify user has access
  let targetRestaurant;
  if (restaurantId) {
    targetRestaurant = userRestaurants.find((r) => r.restaurant.id === restaurantId);
    if (!targetRestaurant) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User does not have access to this restaurant",
      });
    }
  } else {
    // Default to first restaurant
    targetRestaurant = userRestaurants[0];
  }

  return {
    restaurantId: targetRestaurant.restaurant.id,
    role: targetRestaurant.staff.role,
    permissions: targetRestaurant.staff.permissions || {},
  };
}

/**
 * Verify user has access to a specific restaurant
 */
export async function verifyRestaurantAccess(userId: number, restaurantId: number): Promise<boolean> {
  const staff = await getStaffMember(restaurantId, userId);
  return staff !== undefined;
}

/**
 * Verify user has owner role for a restaurant
 */
export async function verifyOwnerAccess(userId: number, restaurantId: number): Promise<boolean> {
  const staff = await getStaffMember(restaurantId, userId);
  return staff?.role === "owner";
}

/**
 * Verify user has permission to manage billing
 */
export async function verifyBillingAccess(userId: number, restaurantId: number): Promise<boolean> {
  const staff = await getStaffMember(restaurantId, userId);
  return staff?.role === "owner" || (staff?.permissions as any)?.canManageBilling === true;
}

/**
 * Verify user has permission to access a specific agent
 */
export async function verifyAgentAccess(
  userId: number,
  restaurantId: number,
  agentKey: string
): Promise<boolean> {
  const staff = await getStaffMember(restaurantId, userId);
  
  if (!staff) return false;
  
  // Owners and managers have access to all agents
  if (staff.role === "owner" || staff.role === "manager") {
    return true;
  }
  
  // Staff members need explicit permission
  const permissions = staff.permissions as any;
  return permissions?.agents?.includes(agentKey) === true;
}
