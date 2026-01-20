import pg from "pg";
import { readFileSync } from "fs";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://app_user:xJojHPs9usDtDNkKS9xAXwpp7PLKyaKp@dpg-d5nivv4oud1c73a0hgdg-a.frankfurt-postgres.render.com/restaurant_platform";

console.log("Connecting to database...");

// Parse connection string manually
const url = new URL(DATABASE_URL);

const client = new Client({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  database: url.pathname.slice(1),
  user: url.username,
  password: url.password,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();
  console.log("✅ Connected successfully!");

  console.log("\nReading migration file...");
  const migrationSQL = readFileSync("./drizzle/0000_premium_madripoor.sql", "utf-8");

  console.log("Executing migration...");
  await client.query(migrationSQL);
  
  console.log("✅ Database setup completed successfully!");
  console.log("\nTables created:");
  
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  
  result.rows.forEach((row) => console.log(`  - ${row.table_name}`));
  
} catch (error) {
  console.error("❌ Setup failed:", error.message);
  console.error("Full error:", error);
  process.exit(1);
} finally {
  await client.end();
}
