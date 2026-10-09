// Creates/refreshes the SQLite schema (idempotent) and prints the table list.
const db = require('../backend-node/src/db');
const config = require('../backend-node/config');

db.migrate();
const tables = db.tableNames();
console.log(`db: ${config.dbPath}`);
console.log(`tables (${tables.length}): ${tables.join(', ')}`);
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  console.log(`  ${t}: ${cols.join(', ')}`);
}
