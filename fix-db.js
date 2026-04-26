import Database from 'better-sqlite3';
const db = new Database('local_database.db');
const servers = db.prepare('SELECT id, supportedAppIcons, generalUsageIcons FROM servers').all();
for (const s of servers) {
  let updated = false;
  let supp = s.supportedAppIcons;
  let gen = s.generalUsageIcons;
  
  if (supp && supp.length > 50000) {
    supp = '[]';
    updated = true;
  }
  if (gen && gen.length > 50000) {
    gen = '[]';
    updated = true;
  }
  
  if (updated) {
    db.prepare('UPDATE servers SET supportedAppIcons = ?, generalUsageIcons = ? WHERE id = ?').run(supp, gen, s.id);
    console.log(`Updated server ${s.id} to clear corrupted icons`);
  }
}
