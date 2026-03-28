require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', '..', 'excel DB', 'otros', 'Asistieron.xlsx');

/**
 * Normalises the phone format found in Asistieron.xlsx.
 * Input examples : '57 313 8140824', '573138140824'
 * Output         : '+573138140824'
 */
function normalisePhone(raw) {
  if (!raw) return null;
  // Remove whitespace, dashes, and parentheses
  let digits = String(raw).replace(/[\s()\-]/g, '');
  // Drop a leading + if somehow present
  if (digits.startsWith('+')) digits = digits.slice(1);
  // Must be all digits now
  if (!/^\d{7,}$/.test(digits)) return null;
  return '+' + digits;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT 1');

    const wb = XLSX.readFile(FILE_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    // No header row — first column is the phone number
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    console.log(`📄 Asistieron.xlsx — ${rows.length} rows found`);

    let inserted = 0;
    let markedAttended = 0;
    let alreadyAttended = 0;
    let skipped = 0;

    for (const row of rows) {
      const phone = normalisePhone(row[0]);
      if (!phone) {
        skipped++;
        continue;
      }

      const result = await pool.query(
        `INSERT INTO contacts (phone_e164, source, attended)
         VALUES ($1, 'ratonera', TRUE)
         ON CONFLICT (phone_e164) DO UPDATE SET
           attended = TRUE
         WHERE contacts.attended = FALSE
         RETURNING (xmax = 0) AS was_inserted,
                   (xmax <> 0) AS was_updated`,
        [phone]
      );

      if (result.rowCount === 0) {
        // Conflict but WHERE attended=FALSE didn't match → already attended
        alreadyAttended++;
      } else {
        const { was_inserted, was_updated } = result.rows[0];
        if (was_inserted)  inserted++;
        if (was_updated)   markedAttended++;
      }
    }

    console.log('\n✅ Done!');
    console.log(`   New contacts inserted          : ${inserted}`);
    console.log(`   Existing → updated to attended : ${markedAttended}`);
    console.log(`   Already attended (untouched)   : ${alreadyAttended}`);
    console.log(`   Skipped (invalid phone)        : ${skipped}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
