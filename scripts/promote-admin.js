const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.gzqmgvgecspkmnrneadd:Life0852new2580!@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Conectado ao banco.');

  const check = await client.query(
    'SELECT id, email, role, status FROM "User" WHERE email = $1',
    ['devtuma@gmail.com']
  );

  if (check.rows.length === 0) {
    console.log('Usuário não encontrado no banco ainda.');
  } else {
    await client.query(
      'UPDATE "User" SET role = $1, status = $2 WHERE email = $3',
      ['ADMIN', 'APPROVED', 'devtuma@gmail.com']
    );
    const verify = await client.query(
      'SELECT email, role, status FROM "User" WHERE email = $1',
      ['devtuma@gmail.com']
    );
    console.log('✅ Sucesso! Estado atual:', verify.rows[0]);
  }

  await client.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
