# Restaurant AI Workforce - System Architecture

## Overview

A multi-tenant B2B SaaS platform providing modular AI Digital Employees for restaurants. The platform enables restaurants to subscribe to individual AI agents that automate key business operations through WhatsApp and web interfaces.

## Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **State Management:** TanStack Query (React Query)
- **API Client:** tRPC 11 (type-safe, end-to-end)
- **UI Components:** shadcn/ui + Radix UI
- **Routing:** Wouter

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express 4
- **API Layer:** tRPC 11 (replaces REST)
- **Database:** MySQL/TiDB via Drizzle ORM
- **Authentication:** Manus OAuth + JWT sessions
- **File Storage:** S3-compatible storage

### AI & Integrations
- **LLM:** Multi-provider (OpenAI, Anthropic, etc.) via abstraction layer
- **WhatsApp:** Meta Cloud API
- **Payments:** Stripe (subscriptions + billing)
- **Workflow Orchestration:** Event-driven architecture with n8n compatibility

## Core Architecture Principles

### 1. Multi-Tenancy
Every data entity is scoped to a `restaurantId` (tenant). Tenant isolation is enforced at:
- **Database level:** All tables include `restaurantId` foreign key
- **API level:** tRPC context includes current tenant
- **Query level:** All queries automatically filter by tenant

### 2. Modular Agent System
Agents are independent, subscribable modules:
- Each agent has its own configuration table
- Agents can be enabled/disabled per restaurant
- Agent execution is event-driven
- Agents share common interfaces but operate independently

### 3. Event-Driven Workflows
- Agents react to events (new message, new reservation, new review)
- Events are queued and processed asynchronously
- Inter-agent communication via event bus
- Workflow state is persisted for reliability

### 4. Role-Based Access Control (RBAC)
- **Owner:** Full access to restaurant settings, billing, all agents
- **Staff:** Limited access based on assigned permissions
- Roles are enforced in tRPC procedures via middleware

## Database Schema

### Core Entities

#### `restaurants` (Tenants)
```typescript
{
  id: int (PK),
  name: string,
  email: string,
  phone: string,
  address: text,
  timezone: string,
  whatsappNumber: string?,
  whatsappBusinessAccountId: string?,
  businessHours: json, // { monday: { open: "09:00", close: "22:00" }, ... }
  menuUrl: string?,
  websiteUrl: string?,
  settings: json,
  stripeCustomerId: string?,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `restaurant_staff`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  userId: int (FK -> users),
  role: enum('owner', 'manager', 'staff'),
  permissions: json, // { agents: ['reservations', 'support'], ... }
  createdAt: timestamp
}
```

#### `agent_catalog`
```typescript
{
  id: int (PK),
  agentKey: string (unique), // 'reservation', 'support', 'reviews', 'reengagement'
  name: string,
  description: text,
  category: enum('starter', 'growth', 'premium'),
  basePriceMonthly: decimal,
  features: json,
  isActive: boolean,
  createdAt: timestamp
}
```

#### `restaurant_agents` (Subscriptions)
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  agentKey: string,
  isEnabled: boolean,
  configuration: json, // Agent-specific settings
  stripeSubscriptionId: string?,
  stripeSubscriptionStatus: enum('active', 'past_due', 'canceled', ...),
  currentPeriodEnd: timestamp?,
  subscribedAt: timestamp,
  canceledAt: timestamp?
}
```

#### `customers`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  name: string?,
  phone: string (unique per restaurant),
  email: string?,
  whatsappId: string?,
  tags: json, // ['vip', 'regular', 'inactive']
  metadata: json,
  lastInteractionAt: timestamp?,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `reservations`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  customerId: int (FK),
  reservationDate: timestamp,
  partySize: int,
  status: enum('pending', 'confirmed', 'canceled', 'completed', 'no_show'),
  specialRequests: text?,
  source: enum('whatsapp', 'web', 'phone', 'manual'),
  confirmationSentAt: timestamp?,
  reminderSentAt: timestamp?,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `conversations`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  customerId: int (FK),
  channel: enum('whatsapp', 'web'),
  status: enum('open', 'closed'),
  assignedAgentKey: string?, // Which agent is handling this
  metadata: json,
  lastMessageAt: timestamp,
  createdAt: timestamp
}
```

#### `messages`
```typescript
{
  id: int (PK),
  conversationId: int (FK),
  direction: enum('inbound', 'outbound'),
  content: text,
  messageType: enum('text', 'image', 'template'),
  whatsappMessageId: string?,
  agentKey: string?, // Which agent sent this (if outbound)
  metadata: json,
  sentAt: timestamp,
  deliveredAt: timestamp?,
  readAt: timestamp?
}
```

#### `reviews`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  platform: enum('google', 'tripadvisor', 'facebook'),
  externalId: string,
  authorName: string,
  rating: int, // 1-5
  reviewText: text?,
  reviewDate: timestamp,
  responseText: text?,
  responseGeneratedBy: enum('ai', 'manual')?,
  respondedAt: timestamp?,
  sentiment: enum('positive', 'neutral', 'negative')?,
  createdAt: timestamp
}
```

#### `campaigns`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  agentKey: string, // 'reengagement'
  name: string,
  targetAudience: json, // { inactiveDays: 30, tags: ['regular'] }
  messageTemplate: text,
  status: enum('draft', 'scheduled', 'running', 'completed', 'paused'),
  scheduledAt: timestamp?,
  completedAt: timestamp?,
  stats: json, // { sent: 100, delivered: 95, clicked: 20 }
  createdAt: timestamp
}
```

#### `events`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  eventType: string, // 'message.received', 'reservation.created', 'review.posted'
  agentKey: string?,
  payload: json,
  status: enum('pending', 'processing', 'completed', 'failed'),
  processedAt: timestamp?,
  createdAt: timestamp
}
```

#### `analytics_metrics`
```typescript
{
  id: int (PK),
  restaurantId: int (FK),
  agentKey: string?,
  metricType: string, // 'reservations_count', 'messages_sent', 'response_time'
  metricValue: decimal,
  dimensions: json, // { date: '2026-01-20', hour: 14 }
  recordedAt: timestamp
}
```

## AI Agent Architecture

### Base Agent Interface
```typescript
interface AIAgent {
  key: string;
  name: string;
  description: string;
  
  // Lifecycle
  initialize(restaurantId: number, config: AgentConfig): Promise<void>;
  execute(event: Event): Promise<AgentResult>;
  shutdown(): Promise<void>;
  
  // Configuration
  getDefaultConfig(): AgentConfig;
  validateConfig(config: AgentConfig): boolean;
  
  // State
  getState(): AgentState;
  setState(state: AgentState): void;
}

interface AgentConfig {
  enabled: boolean;
  settings: Record<string, any>;
}

interface Event {
  type: string;
  payload: any;
  restaurantId: number;
  timestamp: Date;
}

interface AgentResult {
  success: boolean;
  actions: Action[];
  nextEvents?: Event[];
  error?: string;
}

interface Action {
  type: 'send_message' | 'create_reservation' | 'update_customer' | 'log_metric';
  payload: any;
}
```

### Agent Implementations

#### 1. Reservation Agent
**Triggers:** `message.received` (WhatsApp/Web)
**Actions:**
- Parse natural language for reservation intent
- Extract date, time, party size
- Check availability
- Create reservation record
- Send confirmation message
- Schedule reminder

**Configuration:**
```typescript
{
  autoConfirm: boolean,
  reminderHoursBefore: number,
  maxPartySize: number,
  bookingWindowDays: number
}
```

#### 2. Support Agent
**Triggers:** `message.received` (FAQ queries)
**Actions:**
- Classify query intent (menu, hours, location, general)
- Retrieve restaurant-specific context
- Generate LLM response
- Send response
- Log interaction

**Configuration:**
```typescript
{
  customFAQs: Array<{ question: string, answer: string }>,
  fallbackToHuman: boolean,
  responseLanguage: string
}
```

#### 3. Reviews Agent
**Triggers:** `review.posted` (webhook from Google/TripAdvisor)
**Actions:**
- Analyze sentiment
- Generate appropriate response
- Post response (if auto-reply enabled)
- Notify owner of negative reviews
- Log metrics

**Configuration:**
```typescript
{
  autoReply: boolean,
  replyOnlyToPositive: boolean,
  notifyOnNegative: boolean,
  responseStyle: 'professional' | 'friendly' | 'casual'
}
```

#### 4. Re-engagement Agent
**Triggers:** `schedule.daily` (cron job)
**Actions:**
- Query inactive customers (last interaction > X days)
- Generate personalized message
- Send via WhatsApp
- Track campaign metrics

**Configuration:**
```typescript
{
  inactiveDays: number,
  maxMessagesPerDay: number,
  promotionText: string,
  targetTags: string[]
}
```

## API Structure (tRPC)

```typescript
appRouter = {
  auth: {
    me: query,
    logout: mutation
  },
  
  restaurants: {
    create: mutation,
    get: query,
    update: mutation,
    getSettings: query,
    updateSettings: mutation
  },
  
  staff: {
    list: query,
    invite: mutation,
    updateRole: mutation,
    remove: mutation
  },
  
  agents: {
    catalog: query, // List all available agents
    subscribed: query, // List restaurant's subscribed agents
    subscribe: mutation,
    unsubscribe: mutation,
    enable: mutation,
    disable: mutation,
    getConfig: query,
    updateConfig: mutation
  },
  
  reservations: {
    list: query,
    create: mutation,
    update: mutation,
    cancel: mutation,
    getStats: query
  },
  
  customers: {
    list: query,
    get: query,
    update: mutation,
    getHistory: query
  },
  
  conversations: {
    list: query,
    get: query,
    getMessages: query,
    sendMessage: mutation
  },
  
  reviews: {
    list: query,
    respond: mutation,
    getStats: query
  },
  
  campaigns: {
    list: query,
    create: mutation,
    launch: mutation,
    pause: mutation,
    getStats: query
  },
  
  billing: {
    getSubscriptions: query,
    getInvoices: query,
    updatePaymentMethod: mutation,
    cancelSubscription: mutation
  },
  
  analytics: {
    getMetrics: query,
    getChartData: query,
    exportData: mutation
  },
  
  webhooks: {
    whatsapp: mutation, // Receives Meta Cloud API webhooks
    stripe: mutation, // Receives Stripe webhooks
    reviews: mutation // Receives review platform webhooks
  }
}
```

## Integration Points

### WhatsApp (Meta Cloud API)
- **Webhook URL:** `/api/webhooks/whatsapp`
- **Authentication:** Verify token + signature validation
- **Message Flow:**
  1. Receive webhook → Parse message
  2. Create/update customer record
  3. Create conversation + message record
  4. Emit `message.received` event
  5. Route to appropriate agent
  6. Agent processes and generates response
  7. Send response via Meta API
  8. Update message status

### Stripe
- **Webhook URL:** `/api/webhooks/stripe`
- **Events Handled:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- **Flow:**
  1. Receive webhook → Verify signature
  2. Update `restaurant_agents` subscription status
  3. Enable/disable agents based on payment status
  4. Send notification to restaurant owner

### LLM Provider
- **Abstraction Layer:** `server/_core/llm.ts`
- **Supported Providers:** OpenAI, Anthropic (via Manus built-in)
- **Usage Pattern:**
  ```typescript
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: agentSystemPrompt },
      { role: 'user', content: customerMessage }
    ]
  });
  ```

## Security & Compliance

### Tenant Isolation
- All database queries filtered by `restaurantId`
- tRPC context middleware validates tenant access
- Staff can only access their assigned restaurant

### Authentication
- Manus OAuth for user authentication
- JWT session cookies (httpOnly, secure, sameSite)
- Role-based access control via `protectedProcedure`

### Data Privacy
- Customer data encrypted at rest
- WhatsApp messages stored with minimal retention
- GDPR-compliant data export/deletion endpoints

### API Security
- Webhook signature verification (WhatsApp, Stripe)
- Rate limiting on public endpoints
- Input validation via Zod schemas

## Scalability Strategy

### Phase 1: MVP (0-100 restaurants)
- Single database instance
- Synchronous agent execution
- Manual onboarding

### Phase 2: Growth (100-1000 restaurants)
- Read replicas for analytics queries
- Background job queue (Redis/BullMQ)
- Automated onboarding flow

### Phase 3: Scale (1000+ restaurants)
- Database sharding by restaurant ID
- Microservices for agent execution
- CDN for static assets
- Horizontal scaling of API servers

## Deployment Architecture

```
┌─────────────────┐
│   Cloudflare    │ (CDN, DDoS protection)
└────────┬────────┘
         │
┌────────▼────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ API 1 │ │ API 2 │ (Express + tRPC)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│   Database      │ (MySQL/TiDB)
│   (Primary)     │
└────────┬────────┘
         │
┌────────▼────────┐
│   Database      │ (Read Replica)
│   (Analytics)   │
└─────────────────┘

External Services:
- S3 (File Storage)
- Stripe (Billing)
- Meta Cloud API (WhatsApp)
- Manus LLM (AI)
```

## Development Workflow

1. **Schema Changes:** Update `drizzle/schema.ts` → Run `pnpm db:push`
2. **Database Queries:** Add helpers in `server/db.ts`
3. **API Endpoints:** Add procedures in `server/routers.ts`
4. **Frontend:** Call via `trpc.*.useQuery/useMutation`
5. **Testing:** Write tests in `server/*.test.ts`

## Monitoring & Observability

- **Logs:** Structured JSON logs with request IDs
- **Metrics:** Agent execution time, message delivery rate, API latency
- **Alerts:** Failed payments, agent errors, webhook failures
- **Dashboards:** Restaurant analytics, system health, revenue metrics
