import { relations } from "drizzle-orm";
import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

/**
 * Restaurant AI Workforce Platform - Database Schema
 * Multi-tenant SaaS architecture with strict tenant isolation
 */

// ============================================================================
// CORE USER & AUTHENTICATION
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// MULTI-TENANT: RESTAURANTS (TENANTS)
// ============================================================================

export const restaurants = mysqlTable("restaurants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  
  // WhatsApp Business Integration
  whatsappNumber: varchar("whatsappNumber", { length: 32 }),
  whatsappBusinessAccountId: varchar("whatsappBusinessAccountId", { length: 128 }),
  whatsappAccessToken: text("whatsappAccessToken"), // Encrypted
  
  // Business Information
  businessHours: json("businessHours").$type<Record<string, { open: string; close: string; closed?: boolean }>>(),
  menuUrl: varchar("menuUrl", { length: 512 }),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  description: text("description"),
  
  // Settings
  settings: json("settings").$type<{
    defaultLanguage?: string;
    currency?: string;
    notificationEmail?: string;
  }>(),
  
  // Stripe Integration
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  
  // Status
  status: mysqlEnum("status", ["active", "suspended", "trial"]).default("trial").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

// ============================================================================
// STAFF & RBAC
// ============================================================================

export const restaurantStaff = mysqlTable("restaurant_staff", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["owner", "manager", "staff"]).default("staff").notNull(),
  permissions: json("permissions").$type<{
    agents?: string[]; // Which agents they can access
    canManageBilling?: boolean;
    canManageStaff?: boolean;
    canViewAnalytics?: boolean;
  }>(),
  invitedBy: int("invitedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueUserRestaurant: unique().on(table.restaurantId, table.userId),
}));

export type RestaurantStaff = typeof restaurantStaff.$inferSelect;
export type InsertRestaurantStaff = typeof restaurantStaff.$inferInsert;

// ============================================================================
// AI AGENTS CATALOG & SUBSCRIPTIONS
// ============================================================================

export const agentCatalog = mysqlTable("agent_catalog", {
  id: int("id").autoincrement().primaryKey(),
  agentKey: varchar("agentKey", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["starter", "growth", "premium"]).default("starter").notNull(),
  basePriceMonthly: decimal("basePriceMonthly", { precision: 10, scale: 2 }).notNull(),
  features: json("features").$type<string[]>(),
  icon: varchar("icon", { length: 64 }), // Lucide icon name
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentCatalog = typeof agentCatalog.$inferSelect;
export type InsertAgentCatalog = typeof agentCatalog.$inferInsert;

export const restaurantAgents = mysqlTable("restaurant_agents", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  agentKey: varchar("agentKey", { length: 64 }).notNull(),
  
  // Subscription Status
  isEnabled: int("isEnabled").default(1).notNull(),
  configuration: json("configuration").$type<Record<string, any>>(),
  
  // Stripe Subscription
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripeSubscriptionStatus: mysqlEnum("stripeSubscriptionStatus", [
    "active", "past_due", "canceled", "unpaid", "trialing", "incomplete"
  ]),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  canceledAt: timestamp("canceledAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueRestaurantAgent: unique().on(table.restaurantId, table.agentKey),
}));

export type RestaurantAgent = typeof restaurantAgents.$inferSelect;
export type InsertRestaurantAgent = typeof restaurantAgents.$inferInsert;

// ============================================================================
// CUSTOMERS
// ============================================================================

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  whatsappId: varchar("whatsappId", { length: 128 }), // WhatsApp user ID
  
  tags: json("tags").$type<string[]>(), // ['vip', 'regular', 'inactive']
  metadata: json("metadata").$type<Record<string, any>>(),
  
  totalReservations: int("totalReservations").default(0).notNull(),
  totalNoShows: int("totalNoShows").default(0).notNull(),
  lastInteractionAt: timestamp("lastInteractionAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueRestaurantPhone: unique().on(table.restaurantId, table.phone),
}));

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============================================================================
// RESERVATIONS
// ============================================================================

export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => customers.id, { onDelete: "cascade" }),
  
  reservationDate: timestamp("reservationDate").notNull(),
  partySize: int("partySize").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "canceled", "completed", "no_show"]).default("pending").notNull(),
  
  specialRequests: text("specialRequests"),
  source: mysqlEnum("source", ["whatsapp", "web", "phone", "manual"]).default("manual").notNull(),
  
  confirmationSentAt: timestamp("confirmationSentAt"),
  reminderSentAt: timestamp("reminderSentAt"),
  
  notes: text("notes"), // Staff notes
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// ============================================================================
// CONVERSATIONS & MESSAGES
// ============================================================================

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => customers.id, { onDelete: "cascade" }),
  
  channel: mysqlEnum("channel", ["whatsapp", "web"]).default("whatsapp").notNull(),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  
  assignedAgentKey: varchar("assignedAgentKey", { length: 64 }), // Which agent is handling
  metadata: json("metadata").$type<Record<string, any>>(),
  
  lastMessageAt: timestamp("lastMessageAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["text", "image", "template", "interactive"]).default("text").notNull(),
  
  whatsappMessageId: varchar("whatsappMessageId", { length: 128 }),
  agentKey: varchar("agentKey", { length: 64 }), // Which agent sent this (if outbound)
  
  metadata: json("metadata").$type<Record<string, any>>(),
  
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================================================
// REVIEWS & REPUTATION
// ============================================================================

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  
  platform: mysqlEnum("platform", ["google", "tripadvisor", "facebook", "yelp"]).notNull(),
  externalId: varchar("externalId", { length: 255 }).notNull(),
  
  authorName: varchar("authorName", { length: 255 }),
  authorAvatar: varchar("authorAvatar", { length: 512 }),
  rating: int("rating").notNull(), // 1-5
  reviewText: text("reviewText"),
  reviewDate: timestamp("reviewDate").notNull(),
  
  responseText: text("responseText"),
  responseGeneratedBy: mysqlEnum("responseGeneratedBy", ["ai", "manual"]),
  respondedAt: timestamp("respondedAt"),
  respondedBy: int("respondedBy").references(() => users.id),
  
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniquePlatformExternal: unique().on(table.restaurantId, table.platform, table.externalId),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ============================================================================
// CAMPAIGNS (RE-ENGAGEMENT)
// ============================================================================

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  agentKey: varchar("agentKey", { length: 64 }).default("reengagement").notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  targetAudience: json("targetAudience").$type<{
    inactiveDays?: number;
    tags?: string[];
    minReservations?: number;
  }>(),
  
  messageTemplate: text("messageTemplate").notNull(),
  
  status: mysqlEnum("status", ["draft", "scheduled", "running", "completed", "paused"]).default("draft").notNull(),
  
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  
  stats: json("stats").$type<{
    targeted?: number;
    sent?: number;
    delivered?: number;
    read?: number;
    replied?: number;
  }>(),
  
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ============================================================================
// EVENT-DRIVEN ARCHITECTURE
// ============================================================================

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  
  eventType: varchar("eventType", { length: 128 }).notNull(), // 'message.received', 'reservation.created'
  agentKey: varchar("agentKey", { length: 64 }),
  
  payload: json("payload").$type<Record<string, any>>().notNull(),
  
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  error: text("error"),
  
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

export const analyticsMetrics = mysqlTable("analytics_metrics", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  agentKey: varchar("agentKey", { length: 64 }),
  
  metricType: varchar("metricType", { length: 128 }).notNull(), // 'reservations_count', 'messages_sent'
  metricValue: decimal("metricValue", { precision: 15, scale: 2 }).notNull(),
  
  dimensions: json("dimensions").$type<{
    date?: string;
    hour?: number;
    source?: string;
    [key: string]: any;
  }>(),
  
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = typeof analyticsMetrics.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  staff: many(restaurantStaff),
  agents: many(restaurantAgents),
  customers: many(customers),
  reservations: many(reservations),
  conversations: many(conversations),
  reviews: many(reviews),
  campaigns: many(campaigns),
  events: many(events),
  metrics: many(analyticsMetrics),
}));

export const restaurantStaffRelations = relations(restaurantStaff, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantStaff.restaurantId],
    references: [restaurants.id],
  }),
  user: one(users, {
    fields: [restaurantStaff.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [customers.restaurantId],
    references: [restaurants.id],
  }),
  reservations: many(reservations),
  conversations: many(conversations),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [reservations.restaurantId],
    references: [restaurants.id],
  }),
  customer: one(customers, {
    fields: [reservations.customerId],
    references: [customers.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [conversations.restaurantId],
    references: [restaurants.id],
  }),
  customer: one(customers, {
    fields: [conversations.customerId],
    references: [customers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [reviews.restaurantId],
    references: [restaurants.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [campaigns.restaurantId],
    references: [restaurants.id],
  }),
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
}));
