const { readFile } = require('node:fs/promises');
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try { await pool.query(await readFile(__dirname + '/init.sql', 'utf8')); console.log('Base de datos inicializada.'); }
  finally { await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
