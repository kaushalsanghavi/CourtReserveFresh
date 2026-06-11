import { db, getCurrentSchema } from "../server/db";
import { ensureMemberStatusSchema } from "../server/member-status";

// Applies the member-status schema migrations out-of-band. The production
// API no longer runs these on cold start, so run this once against any
// fresh database (set DATABASE_URL / DATABASE_SCHEMA as needed):
//   npm run db:ensure-schema
async function ensureSchema(): Promise<void> {
  const schema = getCurrentSchema();
  await ensureMemberStatusSchema({ db, schemaName: schema });
  console.log(`Member-status schema ensured in schema "${schema}".`);
}

ensureSchema().catch((error: unknown) => {
  console.error("Failed to ensure schema:", error);
  process.exit(1);
});
