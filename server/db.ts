import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agentCatalog,
  analyticsMetrics,
  campaigns,
  conversations,
  customers,
  events,
  InsertAnalyticsMetric,
  InsertCampaign,
  InsertConversation,
  InsertCustomer,
  InsertEvent,
  InsertMessage,
  InsertReservation,
  InsertRestaurant,
  InsertRestaurantAgent,
  InsertRestaurantStaff,
  InsertReview,
  InsertUser,
  messages,
  reservations,
  restaurantAgents,
  restaurants,
  restaurantStaff,
  reviews,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// RESTAURANT MANAGEMENT
// ============================================================================

export async function createRestaurant(data: InsertRestaurant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(restaurants).values(data);
  return result[0].insertId;
}

export async function getRestaurantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateRestaurant(id: number, data: Partial<InsertRestaurant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(restaurants).set(data).where(eq(restaurants.id, id));
}

export async function getRestaurantsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      restaurant: restaurants,
      staff: restaurantStaff,
    })
    .from(restaurantStaff)
    .innerJoin(restaurants, eq(restaurantStaff.restaurantId, restaurants.id))
    .where(eq(restaurantStaff.userId, userId));

  return result;
}

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================

export async function addStaffMember(data: InsertRestaurantStaff) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(restaurantStaff).values(data);
  return result[0].insertId;
}

export async function getRestaurantStaff(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      staff: restaurantStaff,
      user: users,
    })
    .from(restaurantStaff)
    .innerJoin(users, eq(restaurantStaff.userId, users.id))
    .where(eq(restaurantStaff.restaurantId, restaurantId));

  return result;
}

export async function getStaffMember(restaurantId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(restaurantStaff)
    .where(and(eq(restaurantStaff.restaurantId, restaurantId), eq(restaurantStaff.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateStaffMember(id: number, data: Partial<InsertRestaurantStaff>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(restaurantStaff).set(data).where(eq(restaurantStaff.id, id));
}

export async function removeStaffMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(restaurantStaff).where(eq(restaurantStaff.id, id));
}

// ============================================================================
// AGENT CATALOG & SUBSCRIPTIONS
// ============================================================================

export async function getAgentCatalog() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(agentCatalog).where(eq(agentCatalog.isActive, 1)).orderBy(agentCatalog.sortOrder);

  return result;
}

export async function getRestaurantAgents(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(restaurantAgents).where(eq(restaurantAgents.restaurantId, restaurantId));

  return result;
}

export async function getRestaurantAgent(restaurantId: number, agentKey: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(restaurantAgents)
    .where(and(eq(restaurantAgents.restaurantId, restaurantId), eq(restaurantAgents.agentKey, agentKey)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function subscribeToAgent(data: InsertRestaurantAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(restaurantAgents).values(data);
  return result[0].insertId;
}

export async function updateRestaurantAgent(id: number, data: Partial<InsertRestaurantAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(restaurantAgents).set(data).where(eq(restaurantAgents.id, id));
}

export async function unsubscribeFromAgent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(restaurantAgents).where(eq(restaurantAgents.id, id));
}

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function getCustomerByPhone(restaurantId: number, phone: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.restaurantId, restaurantId), eq(customers.phone, phone)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function getRestaurantCustomers(restaurantId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.restaurantId, restaurantId))
    .orderBy(desc(customers.lastInteractionAt))
    .limit(limit)
    .offset(offset);

  return result;
}

export async function getInactiveCustomers(restaurantId: number, inactiveDays: number) {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  const result = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.restaurantId, restaurantId),
        lte(customers.lastInteractionAt, cutoffDate)
      )
    );

  return result;
}

// ============================================================================
// RESERVATION MANAGEMENT
// ============================================================================

export async function createReservation(data: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reservations).values(data);
  return result[0].insertId;
}

export async function getReservationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateReservation(id: number, data: Partial<InsertReservation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reservations).set(data).where(eq(reservations.id, id));
}

export async function getRestaurantReservations(
  restaurantId: number,
  startDate?: Date,
  endDate?: Date,
  limit = 100
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      reservation: reservations,
      customer: customers,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .where(eq(reservations.restaurantId, restaurantId))
    .$dynamic();

  if (startDate) {
    query = query.where(gte(reservations.reservationDate, startDate));
  }
  if (endDate) {
    query = query.where(lte(reservations.reservationDate, endDate));
  }

  const result = await query.orderBy(desc(reservations.reservationDate)).limit(limit);

  return result;
}

// ============================================================================
// CONVERSATION & MESSAGE MANAGEMENT
// ============================================================================

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversations).values(data);
  return result[0].insertId;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreateConversation(restaurantId: number, customerId: number, channel: "whatsapp" | "web") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find existing open conversation
  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.restaurantId, restaurantId),
        eq(conversations.customerId, customerId),
        eq(conversations.channel, channel),
        eq(conversations.status, "open")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new conversation
  const conversationId = await createConversation({
    restaurantId,
    customerId,
    channel,
    status: "open",
    lastMessageAt: new Date(),
  });

  return await getConversationById(conversationId);
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values(data);
  
  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, data.conversationId));

  return result[0].insertId;
}

export async function getConversationMessages(conversationId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.sentAt))
    .limit(limit);

  return result.reverse(); // Return in chronological order
}

export async function getRestaurantConversations(restaurantId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      conversation: conversations,
      customer: customers,
    })
    .from(conversations)
    .innerJoin(customers, eq(conversations.customerId, customers.id))
    .where(eq(conversations.restaurantId, restaurantId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);

  return result;
}

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}

export async function getRestaurantReviews(restaurantId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(reviews)
    .where(eq(reviews.restaurantId, restaurantId))
    .orderBy(desc(reviews.reviewDate))
    .limit(limit);

  return result;
}

export async function updateReview(id: number, data: Partial<InsertReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reviews).set(data).where(eq(reviews.id, id));
}

// ============================================================================
// CAMPAIGN MANAGEMENT
// ============================================================================

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values(data);
  return result[0].insertId;
}

export async function getRestaurantCampaigns(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.restaurantId, restaurantId))
    .orderBy(desc(campaigns.createdAt));

  return result;
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(events).values(data);
  return result[0].insertId;
}

export async function getPendingEvents(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(events)
    .where(eq(events.status, "pending"))
    .orderBy(events.createdAt)
    .limit(limit);

  return result;
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(events).set(data).where(eq(events.id, id));
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function recordMetric(data: InsertAnalyticsMetric) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(analyticsMetrics).values(data);
  return result[0].insertId;
}

export async function getMetrics(
  restaurantId: number,
  metricType: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(analyticsMetrics)
    .where(
      and(
        eq(analyticsMetrics.restaurantId, restaurantId),
        eq(analyticsMetrics.metricType, metricType),
        gte(analyticsMetrics.recordedAt, startDate),
        lte(analyticsMetrics.recordedAt, endDate)
      )
    )
    .orderBy(analyticsMetrics.recordedAt);

  return result;
}

export async function getAggregatedMetrics(
  restaurantId: number,
  metricType: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return { total: 0, average: 0, count: 0 };

  const result = await db
    .select({
      total: sql<number>`SUM(${analyticsMetrics.metricValue})`,
      average: sql<number>`AVG(${analyticsMetrics.metricValue})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(analyticsMetrics)
    .where(
      and(
        eq(analyticsMetrics.restaurantId, restaurantId),
        eq(analyticsMetrics.metricType, metricType),
        gte(analyticsMetrics.recordedAt, startDate),
        lte(analyticsMetrics.recordedAt, endDate)
      )
    );

  return result[0] || { total: 0, average: 0, count: 0 };
}
