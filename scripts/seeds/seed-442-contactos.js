require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(
  __dirname, '..', '..', 'excel DB', 'otros',
  'Supuestamente Todos los contactos de la lista de chats - 442 Contactos.xlsx'
);

function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[\s()\-]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d{7,}$/.test(digits)) return null;
  return '+' + digits;
}

function cleanName(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw)
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\u200D\uFE0F⚜️]/gu,
      ''
    )
    .trim();
  if (
    !str ||
    str === '.' ||
    /^Contact\s*\d*$/i.test(str)
  ) return null;
  return str;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT 1');

    const wb = XLSX.readFile(FILE_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    console.log(`📄 442-contactos.xlsx — ${rows.length} rows found`);

    let inserted      = 0;
    let nameUpdated   = 0;
    let alreadyOk     = 0;
    let skipped       = 0;
    const skippedRows = [];

    for (const row of rows) {
      const phone = normalisePhone(row.Phone);
      if (!phone) {
        skipped++;
        skippedRows.push(row.Phone);
        continue;
      }

      const name = cleanName(row.Name);

      // If phone exists:  only update name when it was NULL and we have a real name.
      // If phone is new:  insert with attended=FALSE.
      const result = await pool.query(
        `INSERT INTO contacts (name, phone_e164, source, attended)
         VALUES ($1, $2, 'ratonera', FALSE)
         ON CONFLICT (phone_e164) DO UPDATE SET
           name = CASE
                    WHEN contacts.name IS NULL AND EXCLUDED.name IS NOT NULL
                    THEN EXCLUDED.name
                    ELSE contacts.name
                  END
         RETURNING (xmax = 0) AS was_inserted, name AS final_name`,
        [name, phone]
      );

      const { was_inserted, final_name } = result.rows[0];
      if (was_inserted) {
        inserted++;
      } else if (name !== null && final_name === name) {
        // name was NULL before and we just filled it in
        nameUpdated++;
      } else {
        alreadyOk++;
      }
    }

    console.log('\n✅ Done!');
    console.log(`   New contacts inserted  : ${inserted}`);
    console.log(`   Name updated           : ${nameUpdated}`);
    console.log(`   Already up-to-date     : ${alreadyOk}`);
    console.log(`   Skipped (invalid phone): ${skipped}`);
    if (skippedRows.length) {
      console.log('   Skipped values:', skippedRows);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
