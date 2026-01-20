# 🚀 Render Database Setup Guide

## ✅ Passo 1: Executar SQL no Render

Acesse o painel do Render e execute o SQL abaixo no **SQL Editor** do seu banco de dados PostgreSQL:

### 📋 SQL Completo (Copie e Cole)

```sql
-- ============================================================================
-- RESTAURANT AI WORKFORCE PLATFORM - DATABASE SCHEMA
-- PostgreSQL 17.7
-- ============================================================================

-- Create ENUMS
CREATE TYPE "public"."agent_category" AS ENUM('starter', 'growth', 'premium');
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'running', 'completed', 'cancelled');
CREATE TYPE "public"."event_status" AS ENUM('pending', 'processing', 'completed', 'failed');
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE "public"."review_sentiment" AS ENUM('positive', 'neutral', 'negative');
CREATE TYPE "public"."staff_role" AS ENUM('owner', 'manager', 'staff');
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');

-- Create TABLES
CREATE TABLE "agent_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "agent_category" NOT NULL,
	"icon" varchar(100),
	"features" jsonb,
	"base_price_monthly" varchar(20) NOT NULL,
	"stripe_price_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_catalog_agent_key_unique" UNIQUE("agent_key")
);

CREATE TABLE "analytics_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"agent_key" varchar(100),
	"metric_type" varchar(100) NOT NULL,
	"metric_value" varchar(255) NOT NULL,
	"dimensions" jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"message_template" text NOT NULL,
	"target_audience" jsonb,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"stats" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"channel" varchar(50) NOT NULL,
	"external_id" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"name" varchar(255),
	"phone" varchar(50),
	"email" varchar(320),
	"tags" jsonb,
	"metadata" jsonb,
	"total_reservations" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"agent_key" varchar(100),
	"payload" jsonb,
	"status" "event_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"direction" "message_direction" NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"agent_key" varchar(100),
	"external_id" varchar(255),
	"status" varchar(50) DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"reservation_date" timestamp NOT NULL,
	"party_size" integer NOT NULL,
	"special_requests" text,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"source" varchar(50),
	"confirmation_sent_at" timestamp,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "restaurant_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"agent_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"configuration" jsonb,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	"stripe_subscription_id" varchar(255)
);

CREATE TABLE "restaurant_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "staff_role" NOT NULL,
	"permissions" jsonb,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "restaurants" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"address" text,
	"phone" varchar(50),
	"email" varchar(320),
	"website_url" varchar(500),
	"menu_url" varchar(500),
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"business_hours" jsonb,
	"settings" jsonb,
	"stripe_customer_id" varchar(255),
	"subscription_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);

CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"external_id" varchar(255),
	"author_name" varchar(255),
	"rating" integer NOT NULL,
	"review_text" text,
	"review_date" timestamp NOT NULL,
	"response_text" text,
	"response_generated_by" varchar(50),
	"responded_at" timestamp,
	"sentiment" "review_sentiment",
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);

-- Add FOREIGN KEYS
ALTER TABLE "analytics_metrics" ADD CONSTRAINT "analytics_metrics_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "events" ADD CONSTRAINT "events_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "restaurant_agents" ADD CONSTRAINT "restaurant_agents_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "restaurant_staff" ADD CONSTRAINT "restaurant_staff_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "restaurant_staff" ADD CONSTRAINT "restaurant_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
```

---

## ✅ Passo 2: Popular Catálogo de Agentes

Após criar as tabelas, execute este SQL para popular o catálogo de agentes:

```sql
-- Insert AI Agents Catalog
INSERT INTO agent_catalog (agent_key, name, description, category, icon, features, base_price_monthly, is_active) VALUES
('reservation', 'Reservation & Confirmation Agent', '24/7 automated booking system with WhatsApp integration. Handles reservations, sends confirmations, and manages reminders.', 'starter', 'CalendarCheck', '["Natural language date/time parsing","Automatic confirmations via WhatsApp","Smart reminder system","Calendar integration","Multi-language support"]', '79.00', true),

('support', 'Customer Support Agent', 'AI-powered 24/7 customer support. Answers questions about menu, hours, location, and general inquiries.', 'starter', 'MessageSquare', '["24/7 availability","FAQ automation","Menu information","Business hours queries","Location assistance","Multi-language support"]', '69.00', true),

('reviews', 'Reviews & Reputation Agent', 'Monitor and respond to reviews across Google and TripAdvisor. AI-generated professional responses with sentiment analysis.', 'growth', 'Star', '["Google Reviews monitoring","TripAdvisor integration","AI-generated responses","Sentiment analysis","Negative review alerts","Response templates"]', '129.00', true),

('reengagement', 'Customer Re-engagement Agent', 'Identify inactive customers and send personalized campaigns. Boost repeat visits with targeted messaging.', 'premium', 'Users', '["Inactive customer detection","Personalized WhatsApp campaigns","Audience segmentation","Campaign analytics","A/B testing","ROI tracking"]', '149.00', true);
```

---

## ✅ Passo 3: Verificar Instalação

Execute este SQL para verificar se tudo foi criado corretamente:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check agent catalog
SELECT agent_key, name, base_price_monthly 
FROM agent_catalog;
```

**Resultado esperado:**
- 13 tabelas criadas
- 4 agentes no catálogo

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

1. **users** - Usuários da plataforma (donos de restaurantes)
2. **restaurants** - Restaurantes (tenants)
3. **restaurant_staff** - Equipe do restaurante (RBAC)
4. **agent_catalog** - Catálogo de agentes IA disponíveis
5. **restaurant_agents** - Agentes subscritos por cada restaurante
6. **customers** - Clientes dos restaurantes
7. **reservations** - Reservas
8. **conversations** - Conversas WhatsApp
9. **messages** - Mensagens individuais
10. **reviews** - Avaliações (Google, TripAdvisor)
11. **campaigns** - Campanhas de re-engagement
12. **events** - Fila de eventos para processamento
13. **analytics_metrics** - Métricas e analytics

---

## 🔐 Configuração da Aplicação

Após criar o banco, configure a variável de ambiente `DATABASE_URL` na sua aplicação:

```
DATABASE_URL=postgresql://app_user:xJojHPs9usDtDNkKS9xAXwpp7PLKyaKp@dpg-d5nivv4oud1c73a0hgdg-a.frankfurt-postgres.render.com/restaurant_platform
```

---

## 🚀 Próximos Passos

1. ✅ Executar SQL no Render
2. ✅ Popular catálogo de agentes
3. ✅ Verificar instalação
4. 🔄 Fazer push do código para GitHub (já feito: `https://github.com/cotah/tuxeai_app.git`)
5. 🔄 Deploy da aplicação no Render ou Vercel
6. 🔄 Configurar Stripe para billing
7. 🔄 Configurar WhatsApp Business API

---

## 📝 Notas Importantes

- **Multi-tenancy**: Todas as queries devem filtrar por `restaurant_id`
- **RBAC**: Use `restaurant_staff.role` para controle de permissões
- **Event-driven**: Agentes processam eventos da tabela `events`
- **Analytics**: Todas as métricas vão para `analytics_metrics`

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique se todas as 13 tabelas foram criadas
2. Confirme que os 4 agentes estão no catálogo
3. Teste a conexão com a DATABASE_URL
4. Verifique os logs do Render

**Database Info:**
- Host: `dpg-d5nivv4oud1c73a0hgdg-a.frankfurt-postgres.render.com`
- Database: `restaurant_platform`
- User: `app_user`
- PostgreSQL Version: 17.7
