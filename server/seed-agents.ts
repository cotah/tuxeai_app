/**
 * Seed script to populate the agent catalog
 * Run with: node --import tsx server/seed-agents.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { agentCatalog } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const agents = [
  {
    agentKey: "reservation",
    name: "Reservation & Confirmation Agent",
    description: "Automates booking, confirmations, and reminders through WhatsApp and web widget. Handles reservation requests 24/7 with intelligent date/time parsing.",
    category: "starter" as const,
    basePriceMonthly: "79.00",
    features: [
      "WhatsApp & Web booking",
      "Automatic confirmations",
      "Smart reminders",
      "Natural language processing",
      "Calendar integration",
      "Party size management"
    ],
    icon: "CalendarCheck",
    isActive: 1,
    sortOrder: 1,
  },
  {
    agentKey: "support",
    name: "Customer Support Agent",
    description: "24/7 AI-powered customer support answering questions about menu, hours, location, and general inquiries. Learns from your restaurant's specific information.",
    category: "starter" as const,
    basePriceMonthly: "69.00",
    features: [
      "24/7 availability",
      "Menu information",
      "Business hours & location",
      "Custom FAQ support",
      "Multi-language support",
      "Conversation history"
    ],
    icon: "MessageSquare",
    isActive: 1,
    sortOrder: 2,
  },
  {
    agentKey: "reviews",
    name: "Reviews & Reputation Agent",
    description: "Monitors Google Reviews and TripAdvisor, generates professional responses, and alerts you to negative feedback. Protects and enhances your online reputation.",
    category: "growth" as const,
    basePriceMonthly: "129.00",
    features: [
      "Google Reviews monitoring",
      "TripAdvisor integration",
      "AI-generated responses",
      "Sentiment analysis",
      "Negative review alerts",
      "Reputation dashboard"
    ],
    icon: "Star",
    isActive: 1,
    sortOrder: 3,
  },
  {
    agentKey: "reengagement",
    name: "Customer Re-engagement Agent",
    description: "Identifies inactive customers and sends personalized promotional messages via WhatsApp. Brings back lost customers with targeted campaigns.",
    category: "growth" as const,
    basePriceMonthly: "149.00",
    features: [
      "Inactive customer detection",
      "Personalized promotions",
      "WhatsApp campaigns",
      "Campaign analytics",
      "Audience segmentation",
      "A/B testing support"
    ],
    icon: "Users",
    isActive: 1,
    sortOrder: 4,
  },
];

async function seedAgents() {
  console.log("🌱 Seeding agent catalog...");

  try {
    for (const agent of agents) {
      await db
        .insert(agentCatalog)
        .values(agent)
        .onDuplicateKeyUpdate({
          set: {
            name: agent.name,
            description: agent.description,
            category: agent.category,
            basePriceMonthly: agent.basePriceMonthly,
            features: agent.features,
            icon: agent.icon,
            sortOrder: agent.sortOrder,
          },
        });
      
      console.log(`✓ Seeded agent: ${agent.name}`);
    }

    console.log("✅ Agent catalog seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding agents:", error);
    process.exit(1);
  }
}

seedAgents();
