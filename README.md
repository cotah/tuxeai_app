# 🤖 Restaurant AI Workforce Platform

> **A modular SaaS platform that provides AI-powered digital employees for restaurants.**

Built for restaurants in Europe and Latin America, this platform offers subscription-based AI agents that automate reservations, customer support, reputation management, and customer re-engagement through WhatsApp and web channels.

---

## 🎯 Project Vision

**Goal:** Generate €10,000+/month by providing affordable, modular AI automation to restaurants.

**Market Positioning:**
- **Modular pricing** (€49-149/agent/month) vs. competitors' €400-600/month bundles
- **WhatsApp-first** approach for Europe & Latin America markets
- **Complete lifecycle automation** beyond just reservations

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite + TailwindCSS 4
- tRPC for type-safe APIs
- Wouter for routing
- shadcn/ui components

**Backend:**
- Express 4 + tRPC 11
- MySQL/TiDB (Drizzle ORM)
- Multi-tenant architecture
- Event-driven workflows

**Integrations:**
- Stripe (billing)
- WhatsApp Business API (Meta Cloud API)
- OpenAI/Anthropic (LLM)
- Google Reviews & TripAdvisor APIs
- n8n (workflow orchestration)

### Database Schema

Multi-tenant SaaS with strict tenant isolation:

- **Core:** `users`, `restaurants`, `restaurant_staff`
- **Agents:** `agent_catalog`, `restaurant_agents`
- **Operations:** `customers`, `reservations`, `conversations`, `messages`
- **Reputation:** `reviews`
- **Marketing:** `campaigns`
- **System:** `events`, `analytics_metrics`

---

## 🤖 AI Agents

### 1. Reservation & Confirmation Agent (€79/month)
- 24/7 WhatsApp & web booking
- Natural language date/time parsing
- Automatic confirmations & reminders
- Calendar integration

### 2. Customer Support Agent (€69/month)
- 24/7 AI-powered FAQ responses
- Menu, hours, location information
- Multi-language support
- Context-aware conversations

### 3. Reviews & Reputation Agent (€129/month)
- Google Reviews & TripAdvisor monitoring
- AI-generated professional responses
- Sentiment analysis
- Negative review alerts

### 4. Customer Re-engagement Agent (€149/month)
- Inactive customer detection
- Personalized WhatsApp campaigns
- Audience segmentation
- Campaign analytics

---

## 📁 Project Structure

```
restaurant-ai-workforce/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # tRPC client & utilities
│   │   └── App.tsx           # Routes & layout
├── server/                    # Backend Express + tRPC
│   ├── _core/                # Framework (auth, context, LLM)
│   ├── routers.ts            # tRPC API procedures
│   ├── db.ts                 # Database helpers
│   ├── tenant.ts             # Multi-tenancy middleware
│   └── seed-agents.ts        # Agent catalog seeder
├── drizzle/                   # Database schema & migrations
│   └── schema.ts             # Multi-tenant schema
├── shared/                    # Shared types & constants
├── ARCHITECTURE.md           # Technical architecture doc
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL/TiDB database

### Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Seed agent catalog
node --import tsx server/seed-agents.ts

# Start development server
pnpm dev
```

### Environment Variables

The following are automatically injected by the Manus platform:

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session signing secret
- `VITE_APP_ID` - OAuth app ID
- `OAUTH_SERVER_URL` - OAuth backend URL
- `BUILT_IN_FORGE_API_KEY` - LLM & services API key

**Required external integrations (to be configured):**

- `STRIPE_SECRET_KEY` - Stripe billing
- `WHATSAPP_ACCESS_TOKEN` - Meta Cloud API
- `WHATSAPP_BUSINESS_ACCOUNT_ID` - WhatsApp Business Account

---

## 🔑 Key Features Implemented

### ✅ Phase 1: Foundation (Current)

- [x] Multi-tenant database schema
- [x] Restaurant & staff management
- [x] Agent catalog & subscriptions
- [x] tRPC API with type safety
- [x] Landing page & marketplace UI
- [x] Authentication & RBAC

### 🚧 Phase 2: Core Agents (In Progress)

- [ ] Reservation agent implementation
- [ ] Support agent with LLM
- [ ] WhatsApp Business API integration
- [ ] Event-driven workflow engine

### 📋 Phase 3: Growth Features (Planned)

- [ ] Reviews agent (Google/TripAdvisor)
- [ ] Re-engagement campaigns
- [ ] Stripe subscription billing
- [ ] Admin dashboard & analytics
- [ ] Multi-language support

---

## 💰 Business Model

### Pricing Strategy

**Individual Agents:**
- Reservation Agent: €79/month
- Support Agent: €69/month
- Reviews Agent: €129/month
- Re-engagement Agent: €149/month

**Bundle Packages:**
- Starter Pack (2 agents): €129/month (15% discount)
- Growth Pack (all 4): €349/month (20% discount)
- Enterprise: Custom pricing

### Revenue Projections

To reach €10,000/month:
- **50 customers** at €200/month average
- **100 customers** at €100/month average
- **30 customers** at €349/month (Growth Pack)

---

## 🔐 Security & Multi-Tenancy

### Tenant Isolation

- Every query scoped by `restaurantId`
- Middleware enforces tenant context
- Staff permissions checked per-operation

### Role-Based Access Control

- **Owner:** Full access, billing, staff management
- **Manager:** Operations, agent configuration
- **Staff:** Limited agent access based on permissions

---

## 📊 Analytics & Metrics

Tracked metrics per restaurant:
- Reservations count & conversion rate
- Messages sent/received
- Response times
- Customer satisfaction
- Campaign performance
- Revenue per agent

---

## 🛠️ Development Workflow

### Build Loop

1. Update schema in `drizzle/schema.ts`
2. Run `pnpm db:push` to migrate
3. Add database helpers in `server/db.ts`
4. Create/extend procedures in `server/routers.ts`
5. Build UI with `trpc.*.useQuery/useMutation`
6. Write tests in `server/*.test.ts`

### Testing

```bash
# Run unit tests
pnpm test

# Type checking
pnpm check

# Format code
pnpm format
```

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture deep-dive
- **[strategic_business_plan.md](/home/ubuntu/strategic_business_plan.md)** - Business strategy & go-to-market
- **[market_research_findings.md](/home/ubuntu/market_research_findings.md)** - Competitive analysis

---

## 🤝 Contributing

This is a commercial SaaS project. For feature requests or bug reports, please contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 🎯 Next Steps

### Immediate Priorities

1. **Complete Stripe Integration**
   - Subscription creation & management
   - Webhook handling
   - Invoice generation

2. **Implement Core Agents**
   - Reservation agent with NLP
   - Support agent with LLM
   - WhatsApp message handling

3. **Build Admin Dashboard**
   - Agent management UI
   - Analytics & reporting
   - Customer management

4. **Launch MVP**
   - Beta testing with 5-10 restaurants
   - Iterate based on feedback
   - Public launch

### Growth Roadmap

- Multi-location support for restaurant chains
- Advanced analytics & reporting
- Custom agent training per restaurant
- API for third-party integrations
- Mobile app for restaurant staff

---

## 📞 Support

For technical support or business inquiries:
- Email: support@restaurantai.com (placeholder)
- Documentation: [docs.restaurantai.com](https://docs.restaurantai.com) (placeholder)

---

**Built with ❤️ for the restaurant industry**
