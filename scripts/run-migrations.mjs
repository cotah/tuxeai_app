import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://app_user:xJojHPs9usDtDNkKS9xAXwpp7PLKyaKp@dpg-d5nivv4oud1c73a0hgdg-a.frankfurt-postgres.render.com/restaurant_platform";

console.log("Connecting to database...");

// Create postgres client with SSL
const client = postgres(DATABASE_URL, {
  max: 1,
  ssl: "require",
});

const db = drizzle(client);

console.log("Running migrations...");

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrations completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
} finally {
  await client.end();
}
