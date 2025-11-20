import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql+asyncpg://postgres:1234@localhost:5432/postgres",
});
