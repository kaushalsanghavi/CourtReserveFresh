# Database Migrations

This directory contains database migration scripts for the Court Reserve application.

## Sunday Booking Schema Migration

### Overview
The Sunday booking feature extends the existing `bookings` table with additional columns to support flexible weekend bookings.

### Migration Files

#### `0001_add_sunday_booking_columns.sql`
Adds the following columns to the `bookings` table:
- `is_sunday_booking` (boolean, default false) - Flag to identify Sunday bookings
- `time_slot` (text, nullable) - Time slot for Sunday bookings (e.g., "8:00 AM - 9:00 AM")
- `time_set_by` (varchar, nullable) - Member ID who set the time slot
- `time_set_at` (timestamp, nullable) - When the time slot was set

Also adds performance indexes:
- `idx_bookings_sunday` - For Sunday booking queries
- `idx_bookings_weekday` - For weekday booking queries  
- `idx_bookings_date_member` - For date and member queries
- `idx_bookings_time_set_by` - For time setter queries

#### `0001_rollback_sunday_booking_columns.sql`
Rollback script that removes the Sunday booking columns and indexes.

### Running Migrations

#### Automatic Migration (Recommended)
```bash
npm run db:migrate:sunday
```

This runs the TypeScript migration script that:
- Applies the schema changes safely
- Verifies the migration was successful
- Provides detailed feedback

#### Manual Migration
```bash
# Apply migration
psql $DATABASE_URL -f migrations/0001_add_sunday_booking_columns.sql

# Rollback if needed
psql $DATABASE_URL -f migrations/0001_rollback_sunday_booking_columns.sql
```

### Schema Changes

#### Before Migration
```sql
CREATE TABLE bookings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id varchar NOT NULL,
  member_name text NOT NULL,
  date text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);
```

#### After Migration
```sql
CREATE TABLE bookings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id varchar NOT NULL,
  member_name text NOT NULL,
  date text NOT NULL,
  is_sunday_booking boolean DEFAULT false,
  time_slot text,
  time_set_by varchar,
  time_set_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);
```

### TypeScript Schema Updates

The Drizzle schema in `shared/schema.ts` has been updated to include:

```typescript
export const bookings = pgTable("bookings", {
  // ... existing columns
  isSundayBooking: boolean("is_sunday_booking").default(false),
  timeSlot: text("time_slot"),
  timeSetBy: varchar("time_set_by"),
  timeSetAt: timestamp("time_set_at"),
  // ... existing columns
});
```

### Validation Schemas

New Zod schemas for Sunday booking validation:

```typescript
export const bookSlotSchema = z.object({
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isSundayBooking: z.boolean().optional(),
  timeSlot: z.string().optional(),
});

export const timeUpdateSchema = z.object({
  timeSlot: z.string().min(1),
  memberId: z.string().min(1),
});
```

### Testing

Run the schema test to verify everything is working:

```bash
npx tsx scripts/test-sunday-booking-schema.ts
```

### Rollback Plan

If you need to rollback the migration:

1. **Immediate rollback** (removes columns and data):
   ```bash
   psql $DATABASE_URL -f migrations/0001_rollback_sunday_booking_columns.sql
   ```

2. **Code rollback**: Revert the changes in `shared/schema.ts` and `server/storage.ts`

3. **Restart application** to use the old schema

### Safety Notes

- The migration uses `IF NOT EXISTS` clauses to be safely re-runnable
- Existing data is preserved - new columns are nullable or have defaults
- Indexes are created with `IF NOT EXISTS` to avoid conflicts
- The migration script includes verification steps

### Next Steps

After running this migration:

1. ✅ Database schema extended
2. ⏳ Update API endpoints for Sunday bookings
3. ⏳ Implement Sunday booking business logic  
4. ⏳ Create Sunday booking UI components
5. ⏳ Add comprehensive tests