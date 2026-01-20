-- ============================================================================
-- Restaurant AI Workforce Platform - PostgreSQL Database Setup
-- ============================================================================
-- Execute este SQL no painel do seu banco PostgreSQL no Render
-- Isso criará todas as 13 tabelas + populará o catálogo de agentes
-- ============================================================================

-- Drop existing tables if they exist (cuidado em produção!)
DROP TABLE IF EXISTS analytics_metrics CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS restaurant_agents CASCADE;
DROP TABLE IF EXISTS agent_catalog CASCADE;
DROP TABLE IF EXISTS restaurant_staff CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS staff_role CASCADE;
DROP TYPE IF EXISTS agent_category CASCADE;
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS message_direction CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS review_sentiment CASCADE;

-- ============================================================================
-- CREATE ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE staff_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE agent_category AS ENUM ('starter', 'growth', 'premium');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'completed', 'cancelled');
CREATE TYPE event_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE review_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Restaurants table (multi-tenant)
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(320),
  website_url VARCHAR(500),
  menu_url VARCHAR(500),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  business_hours JSONB,
  settings JSONB,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Restaurant staff table (RBAC)
CREATE TABLE restaurant_staff (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role staff_role NOT NULL,
  permissions JSONB,
  invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Agent catalog table
CREATE TABLE agent_catalog (
  id SERIAL PRIMARY KEY,
  agent_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category agent_category NOT NULL,
  icon VARCHAR(100),
  features JSONB,
  base_price_monthly VARCHAR(20) NOT NULL,
  stripe_price_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Restaurant agents table (subscriptions)
CREATE TABLE restaurant_agents (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  agent_key VARCHAR(100) NOT NULL,
  configuration JSONB,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMP,
  stripe_subscription_id VARCHAR(255)
);

-- Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(320),
  whatsapp_id VARCHAR(255),
  tags JSONB,
  preferences JSONB,
  total_reservations INTEGER NOT NULL DEFAULT 0,
  last_visit_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversations table (WhatsApp)
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Messages table (WhatsApp)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text',
  metadata JSONB,
  agent_key VARCHAR(100),
  external_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Reservations table
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  reservation_date TIMESTAMP NOT NULL,
  party_size INTEGER NOT NULL,
  special_requests TEXT,
  status reservation_status NOT NULL DEFAULT 'pending',
  source VARCHAR(50),
  confirmation_sent_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  external_id VARCHAR(255),
  platform VARCHAR(50) NOT NULL,
  rating INTEGER NOT NULL,
  review_text TEXT,
  reviewer_name VARCHAR(255),
  review_date TIMESTAMP NOT NULL,
  response_text TEXT,
  responded_at TIMESTAMP,
  response_generated_by VARCHAR(255),
  sentiment review_sentiment,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Campaigns table (re-engagement)
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,
  target_audience JSONB,
  status campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Events table (event-driven architecture)
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  status event_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Analytics metrics table
CREATE TABLE analytics_metrics (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  metric_type VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimensions JSONB,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX idx_restaurant_staff_restaurant_id ON restaurant_staff(restaurant_id);
CREATE INDEX idx_restaurant_staff_user_id ON restaurant_staff(user_id);
CREATE INDEX idx_restaurant_agents_restaurant_id ON restaurant_agents(restaurant_id);
CREATE INDEX idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_conversations_restaurant_id ON conversations(restaurant_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX idx_campaigns_restaurant_id ON campaigns(restaurant_id);
CREATE INDEX idx_events_restaurant_id ON events(restaurant_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_analytics_restaurant_id ON analytics_metrics(restaurant_id);
CREATE INDEX idx_analytics_type ON analytics_metrics(metric_type);

-- ============================================================================
-- POPULATE AGENT CATALOG
-- ============================================================================

INSERT INTO agent_catalog (agent_key, name, description, category, icon, features, base_price_monthly) VALUES
(
  'reservation',
  'Reservation & Confirmation Agent',
  'Automate booking confirmations, reminders, and cancellations via WhatsApp and web widget',
  'starter',
  'Calendar',
  '["Automated booking confirmations", "Smart reminder system", "Cancellation management", "Web widget integration", "WhatsApp integration"]',
  '79'
),
(
  'support',
  'Customer Support Agent',
  '24/7 AI-powered support for menu, hours, location, and common questions',
  'starter',
  'MessageCircle',
  '["24/7 availability", "Menu inquiries", "Location & hours", "Multi-language support", "Smart FAQ responses"]',
  '69'
),
(
  'reviews',
  'Reviews & Reputation Agent',
  'Monitor and respond to Google Reviews and TripAdvisor with AI-generated responses',
  'growth',
  'Star',
  '["Google Reviews monitoring", "TripAdvisor integration", "AI-generated responses", "Sentiment analysis", "Review alerts"]',
  '129'
),
(
  'reengagement',
  'Customer Re-engagement Agent',
  'Identify inactive customers and send targeted promotions to bring them back',
  'growth',
  'Users',
  '["Inactive customer detection", "Targeted promotions", "Personalized messaging", "Campaign analytics", "ROI tracking"]',
  '149'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify everything was created correctly:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM agent_catalog;
-- SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';

-- Expected result: 13 tables + 4 agents in catalog
