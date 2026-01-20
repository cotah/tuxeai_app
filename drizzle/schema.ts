import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL Schema for Restaurant AI Workforce Platform
 * Multi-tenant SaaS with strict tenant isolation
 */

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const staffRoleEnum = pgEnum("staff_role", ["owner", "manager", "staff"]);
export const agentCategoryEnum = pgEnum("agent_category", ["starter", "growth", "premium"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "running",
  "completed",
  "cancelled",
]);
export const eventStatusEnum = pgEnum("event_status", ["pending", "processing", "completed", "failed"]);
export const reviewSentimentEnum = pgEnum("review_sentiment", ["positive", "neutral", "negative"]);

// ============================================================================
// CORE TABLES
// ============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  menuUrl: varchar("menu_url", { length: 500 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  businessHours: jsonb("business_hours"),
  settings: jsonb("settings"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const restaurantStaff = pgTable("restaurant_staff", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: staffRoleEnum("role").notNull(),
  permissions: jsonb("permissions"),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
  isActive: boolean("is_active").default(true).notNull(),
});

// ============================================================================
// AGENT CATALOG & SUBSCRIPTIONS
// ============================================================================

export const agentCatalog = pgTable("agent_catalog", {
  id: serial("id").primaryKey(),
  agentKey: varchar("agent_key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: agentCategoryEnum("category").notNull(),
  icon: varchar("icon", { length: 100 }),
  features: jsonb("features"),
  basePriceMonthly: varchar("base_price_monthly", { length: 20 }).notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const restaurantAgents = pgTable("restaurant_agents", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  agentKey: varchar("agent_key", { length: 100 }).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  configuration: jsonb("configuration"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at"),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
});

// ============================================================================
// CUSTOMERS & CONVERSATIONS
// ============================================================================

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  tags: jsonb("tags"),
  metadata: jsonb("metadata"),
  totalReservations: integer("total_reservations").default(0).notNull(),
  lastInteractionAt: timestamp("last_interaction_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  channel: varchar("channel", { length: 50 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  direction: messageDirectionEnum("direction").notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 50 }).default("text").notNull(),
  metadata: jsonb("metadata"),
  agentKey: varchar("agent_key", { length: 100 }),
  externalId: varchar("external_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// RESERVATIONS
// ============================================================================

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  reservationDate: timestamp("reservation_date").notNull(),
  partySize: integer("party_size").notNull(),
  specialRequests: text("special_requests"),
  status: reservationStatusEnum("status").default("pending").notNull(),
  source: varchar("source", { length: 50 }),
  confirmationSentAt: timestamp("confirmation_sent_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// REVIEWS & REPUTATION
// ============================================================================

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  platform: varchar("platform", { length: 50 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  authorName: varchar("author_name", { length: 255 }),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  reviewDate: timestamp("review_date").notNull(),
  responseText: text("response_text"),
  responseGeneratedBy: varchar("response_generated_by", { length: 50 }),
  respondedAt: timestamp("responded_at"),
  sentiment: reviewSentimentEnum("sentiment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// CAMPAIGNS & RE-ENGAGEMENT
// ============================================================================

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  name: varchar("name", { length: 255 }).notNull(),
  messageTemplate: text("message_template").notNull(),
  targetAudience: jsonb("target_audience"),
  status: campaignStatusEnum("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  stats: jsonb("stats"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================================
// EVENTS & WORKFLOW
// ============================================================================

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  agentKey: varchar("agent_key", { length: 100 }),
  payload: jsonb("payload"),
  status: eventStatusEnum("status").default("pending").notNull(),
  error: text("error"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id),
  agentKey: varchar("agent_key", { length: 100 }),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  metricValue: varchar("metric_value", { length: 255 }).notNull(),
  dimensions: jsonb("dimensions"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

export type RestaurantStaff = typeof restaurantStaff.$inferSelect;
export type InsertRestaurantStaff = typeof restaurantStaff.$inferInsert;

export type AgentCatalog = typeof agentCatalog.$inferSelect;
export type InsertAgentCatalog = typeof agentCatalog.$inferInsert;

export type RestaurantAgent = typeof restaurantAgents.$inferSelect;
export type InsertRestaurantAgent = typeof restaurantAgents.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = typeof analyticsMetrics.$inferInsert;
