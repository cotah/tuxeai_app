import postgres from "postgres";
import { readFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://app_user:xJojHPs9usDtDNkKS9xAXwpp7PLKyaKp@dpg-d5nivv4oud1c73a0hgdg-a.frankfurt-postgres.render.com/restaurant_platform";

console.log("Connecting to database...");

// Create postgres client with SSL
const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

console.log("Reading migration file...");
const migrationSQL = readFileSync("./drizzle/0000_premium_madripoor.sql", "utf-8");

console.log("Executing migration...");

try {
  // Execute the SQL directly
  await sql.unsafe(migrationSQL);
  console.log("✅ Database setup completed successfully!");
  console.log("\nTables created:");
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  
  tables.forEach((t) => console.log(`  - ${t.table_name}`));
  
} catch (error) {
  console.error("❌ Setup failed:", error.message);
  process.exit(1);
} finally {
  await sql.end();
}
