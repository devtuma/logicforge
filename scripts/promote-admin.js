const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:Life0852new2580!@db.gzqmgvgecspkmnrneadd.supabase.co:5432/postgres';
const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();

  // Verifica colunas da tabela User
  const cols = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'User'
    ORDER BY ordinal_position
  `);
  console.log('Colunas da tabela User:');
  cols.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type, r.column_default ? `(default: ${r.column_default})` : ''));

  // Verifica enums existentes
  const enums = await client.query(`
    SELECT typname, enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY typname, enumsortorder
  `);
  console.log('\nEnums no banco:');
  enums.rows.forEach(r => console.log(' -', r.typname, ':', r.enumlabel));

  await client.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
