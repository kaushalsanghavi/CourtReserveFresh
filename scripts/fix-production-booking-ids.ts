import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixProductionBookingIds() {
  try {
    console.log('🔍 Checking for bookings with undefined IDs in production schema...');

    // Find bookings with undefined IDs
    const undefinedBookings = await sql`
      SELECT * FROM production.bookings WHERE id = 'undefined'
    `;

    console.log(`Found ${undefinedBookings.length} bookings with undefined IDs`);

    if (undefinedBookings.length > 0) {
      console.log('🔧 Fixing undefined booking IDs...');

      for (const booking of undefinedBookings) {
        const newId = crypto.randomUUID();
        
        console.log(`Updating booking for ${booking.member_name} on ${booking.date} with new ID: ${newId}`);
        
        await sql`
          UPDATE production.bookings 
          SET id = ${newId}
          WHERE member_id = ${booking.member_id} AND date = ${booking.date} AND id = 'undefined'
        `;
      }

      console.log('✅ Successfully fixed all undefined booking IDs');
    } else {
      console.log('✅ No undefined booking IDs found');
    }

    // Verify the fix
    const remainingUndefined = await sql`
      SELECT COUNT(*) as count FROM production.bookings WHERE id = 'undefined'
    `;

    console.log(`Verification: ${remainingUndefined[0].count} bookings still have undefined IDs`);

  } catch (error) {
    console.error('❌ Error fixing booking IDs:', error);
    process.exit(1);
  }
}

fixProductionBookingIds();