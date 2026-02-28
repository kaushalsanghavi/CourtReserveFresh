import { sql } from "drizzle-orm";
import { db, getCurrentSchema } from "../server/db";

async function setupAiViews(): Promise<void> {
  const schema = getCurrentSchema();

  await db.execute(
    sql.raw(`
      CREATE OR REPLACE VIEW ${schema}.ai_booking_facts AS
      SELECT
        id AS booking_id,
        member_id,
        member_name,
        date AS booking_date_text,
        date::date AS booking_date,
        created_at AS booking_created_at
      FROM ${schema}.bookings
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE OR REPLACE VIEW ${schema}.ai_activity_facts AS
      SELECT
        id AS activity_id,
        member_id,
        member_name,
        action,
        date AS activity_date_text,
        date::date AS activity_date,
        device_info,
        EXTRACT(HOUR FROM created_at) AS activity_hour,
        created_at AS activity_created_at
      FROM ${schema}.activities
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE OR REPLACE VIEW ${schema}.ai_member_facts AS
      SELECT
        id AS member_id,
        name,
        initials,
        avatar_color,
        created_at AS member_created_at
      FROM ${schema}.members
    `),
  );

  await db.execute(
    sql.raw(`
      CREATE OR REPLACE VIEW ${schema}.ai_comment_facts AS
      SELECT
        id AS comment_id,
        member_id,
        member_name,
        date AS comment_date_text,
        date::date AS comment_date,
        comment AS comment_text,
        created_at AS comment_created_at
      FROM ${schema}.comments
    `),
  );

  console.log(`AI analytics views created/updated in schema "${schema}".`);
}

setupAiViews().catch((error: unknown) => {
  console.error("Failed to setup AI views:", error);
  process.exit(1);
});
