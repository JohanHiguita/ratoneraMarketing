require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EXCEL_DIR = path.join(__dirname, '..', '..', 'excel DB');

/**
 * Maps each Excel filename to its metadata.
 * attended: true  → comes from a "Pagó" file
 * showSlug: null  → contact only showed interest, no show association
 */
const FILE_CONFIG = {
  // ── Attended ──────────────────────────────────────────────────────────────
  'Pagó Mero Bar.xlsx':        { attended: true,  showSlug: '31jul25' },
  'Pagó Sep 04.xlsx':          { attended: true,  showSlug: '04sep25' },
  'Pagó Sep 18.xlsx':          { attended: true,  showSlug: '18sep25' },
  'Pagó Terraza Sep 26.xlsx':  { attended: true,  showSlug: '26sep25' },
  'Pagó Oct. 02.xlsx':         { attended: true,  showSlug: '02oct25' },
  'Pagó Oct 16.xlsx':          { attended: true,  showSlug: '16oct25' },
  'Pagó Oct. 30.xlsx':         { attended: true,  showSlug: '30oct25' },
  // ── Interested only ───────────────────────────────────────────────────────
  'Sep 18.xlsx':               { attended: false, showSlug: null },
  'Terraza Sep 26.xlsx':       { attended: false, showSlug: null },
  'Oct. 02.xlsx':              { attended: false, showSlug: null },
  '16 octubre.xlsx':           { attended: false, showSlug: null },
  'Oct. 30.xlsx':              { attended: false, showSlug: null },
};

const SHOWS = [
  { slug: '31jul25', show_date: '2025-07-31', venue: 'Mero'       },
  { slug: '04sep25', show_date: '2025-09-04', venue: 'Místico'    },
  { slug: '18sep25', show_date: '2025-09-18', venue: 'Místico'    },
  { slug: '26sep25', show_date: '2025-09-26', venue: 'Terraza77'  },
  { slug: '02oct25', show_date: '2025-10-02', venue: 'Místico'    },
  { slug: '16oct25', show_date: '2025-10-16', venue: 'Místico'    },
  { slug: '30oct25', show_date: '2025-10-30', venue: 'Místico'    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips emojis and other pictographic unicode from a string.
 * Returns null if the result is empty, a generic "Contact N" label, or just punctuation.
 */
function cleanName(raw) {
  if (raw === null || raw === undefined) return null;

  const str = String(raw)
    // Remove emoji / pictographic / misc symbol ranges
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\u200D\uFE0F⚜️]/gu,
      ''
    )
    .trim();

  if (
    !str ||
    str === '.' ||
    /^Contact\s*\d*$/i.test(str) ||
    /^Pag[oó]\s+/i.test(str)   // labels like "Pagó Mero Bar 1"
  ) {
    return null;
  }

  return str;
}

/**
 * Normalises a phone string to E.164 format (removes spaces and stray chars).
 * Returns null if the result looks unusable.
 */
function normalisePhone(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s+/g, '');
  // Must start with + and contain at least 7 digits after it
  if (!/^\+\d{7,}$/.test(cleaned)) return null;
  return cleaned;
}

// ---------------------------------------------------------------------------
// DDL
// ---------------------------------------------------------------------------

const CREATE_TABLES_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS shows (
  id         SERIAL       PRIMARY KEY,
  slug       VARCHAR(10)  NOT NULL UNIQUE,
  show_date  DATE         NOT NULL,
  venue      VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255),
  phone_e164  VARCHAR(20)  NOT NULL UNIQUE,
  source      VARCHAR(50)  DEFAULT NULL,
  attended    BOOLEAN      NOT NULL DEFAULT FALSE,
  opted_out   BOOLEAN      NOT NULL DEFAULT FALSE,
  blocked     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_shows (
  id          SERIAL  PRIMARY KEY,
  contact_id  UUID    NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  show_id     INT     NOT NULL REFERENCES shows(id),
  UNIQUE (contact_id, show_id)
);
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT 1'); // smoke-test

    // ── Create tables ────────────────────────────────────────────────────────
    console.log('📐 Creating tables...');
    await pool.query(CREATE_TABLES_SQL);

    // ── Seed shows ───────────────────────────────────────────────────────────
    console.log('🎤 Inserting shows...');
    for (const show of SHOWS) {
      await pool.query(
        `INSERT INTO shows (slug, show_date, venue)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [show.slug, show.show_date, show.venue]
      );
    }

    // Build slug → id lookup once
    const { rows: showRows } = await pool.query('SELECT id, slug FROM shows');
    const showIdBySlug = Object.fromEntries(showRows.map(r => [r.slug, r.id]));

    // ── Process Excel files ──────────────────────────────────────────────────
    const files = fs.readdirSync(EXCEL_DIR).filter(f => f.endsWith('.xlsx'));

    let inserted = 0;
    let updated  = 0;
    let skipped  = 0;
    let linked   = 0;

    for (const filename of files) {
      const config = FILE_CONFIG[filename];
      if (!config) {
        console.warn(`  ⚠️  No config for "${filename}", skipping`);
        continue;
      }

      console.log(`\n📄 Processing: ${filename}`);

      const wb = XLSX.readFile(path.join(EXCEL_DIR, filename));
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

      for (const row of rows) {
        const phone = normalisePhone(row.Phone);
        if (!phone) {
          skipped++;
          continue;
        }

        const name = cleanName(row.Name);

        // Upsert contact
        // - If phone already exists: set attended=TRUE if this file is a Pagó,
        //   and fill in name only if it was previously NULL.
        const result = await pool.query(
          `INSERT INTO contacts (name, phone_e164, source, attended)
           VALUES ($1, $2, 'ratonera', $3)
           ON CONFLICT (phone_e164) DO UPDATE SET
             attended  = contacts.attended OR EXCLUDED.attended,
             name      = CASE
                           WHEN contacts.name IS NULL AND EXCLUDED.name IS NOT NULL
                           THEN EXCLUDED.name
                           ELSE contacts.name
                         END
           RETURNING (xmax = 0) AS was_inserted, id`,
          [name, phone, config.attended]
        );

        const { was_inserted, id: contactId } = result.rows[0];
        if (was_inserted) inserted++; else updated++;

        // Link to show if this is a Pagó file
        if (config.attended && config.showSlug) {
          const showId = showIdBySlug[config.showSlug];
          if (showId) {
            await pool.query(
              `INSERT INTO contact_shows (contact_id, show_id)
               VALUES ($1, $2)
               ON CONFLICT (contact_id, show_id) DO NOTHING`,
              [contactId, showId]
            );
            linked++;
          }
        }
      }
    }

    console.log('\n✅ Done!');
    console.log(`   Contacts inserted : ${inserted}`);
    console.log(`   Contacts updated  : ${updated}  (duplicates merged)`);
    console.log(`   Rows skipped      : ${skipped}  (invalid phone)`);
    console.log(`   Show links created: ${linked}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
