import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("restaurants router", () => {
  it("should list user restaurants", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.restaurants.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a new restaurant", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.restaurants.create({
      name: "Test Restaurant",
      email: "test@restaurant.com",
      phone: "+1234567890",
      timezone: "Europe/Lisbon",
    });

    expect(result.success).toBe(true);
    expect(result.restaurantId).toBeGreaterThan(0);
  });
});

describe("agents router", () => {
  it("should return agent catalog", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.catalog();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Verify agent structure
    const agent = result[0];
    expect(agent).toHaveProperty("agentKey");
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("basePriceMonthly");
  });
});
