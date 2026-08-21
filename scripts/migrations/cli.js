const path = require('path');
const { pool } = require('../../models/database');
const {
  discoverMigrations,
  validateMigrations
} = require('./lib');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const LOCK_KEY = 26082101;

async function ensureControlTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      execution_ms INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function getApplied(client) {
  const result = await client.query(`
    SELECT version, name, filename, checksum, applied_at, execution_ms
    FROM schema_migrations
    ORDER BY version
  `);
  return result.rows;
}

function verifyAppliedChecksums(migrations, appliedRows) {
  const byVersion = new Map(migrations.map(m => [m.version, m]));

  for (const row of appliedRows) {
    const migration = byVersion.get(Number(row.version));
    if (!migration || !migration.up) {
      throw new Error(
        `La migración aplicada ${row.version} (${row.filename}) no existe en la carpeta migrations.`
      );
    }
    if (migration.up.checksum !== row.checksum) {
      throw new Error(
        `CHECKSUM INVÁLIDO en migración ${row.version}: el archivo fue modificado después de aplicarse.`
      );
    }
  }
}

async function status(client, migrations) {
  const applied = await getApplied(client);
  verifyAppliedChecksums(migrations, applied);
  const appliedVersions = new Set(applied.map(r => Number(r.version)));

  console.log('\nEstado de migraciones MECA\n');
  console.log('VERSION  ESTADO      MIGRACIÓN');
  console.log('-------  ----------  ------------------------------------------');
  for (const m of migrations) {
    const state = appliedVersions.has(m.version) ? 'APLICADA' : 'PENDIENTE';
    console.log(
      `${String(m.version).padStart(4, '0')}     ${state.padEnd(10)}  ${m.name}`
    );
  }

  if (migrations.length === 0) {
    console.log('(No existen migraciones.)');
  }

  console.log(`\nAplicadas: ${applied.length}`);
  console.log(`Pendientes: ${migrations.filter(m => !appliedVersions.has(m.version)).length}`);
}

async function migrateUp(client, migrations) {
  const applied = await getApplied(client);
  verifyAppliedChecksums(migrations, applied);
  const appliedVersions = new Set(applied.map(r => Number(r.version)));
  const pending = migrations.filter(m => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    console.log('✅ No hay migraciones pendientes.');
    return;
  }

  for (const migration of pending) {
    const started = Date.now();
    console.log(`➡ Aplicando ${String(migration.version).padStart(4, '0')}_${migration.name}...`);

    await client.query('BEGIN');
    try {
      await client.query(migration.up.sql);
      await client.query(
        `INSERT INTO schema_migrations
          (version, name, filename, checksum, execution_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          migration.version,
          migration.name,
          migration.up.filename,
          migration.up.checksum,
          Date.now() - started
        ]
      );
      await client.query('COMMIT');
      console.log(`✅ Aplicada ${migration.version}_${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Falló la migración ${migration.version}_${migration.name}: ${error.message}`
      );
    }
  }
}

async function migrateDown(client, migrations) {
  const applied = await getApplied(client);
  verifyAppliedChecksums(migrations, applied);

  if (applied.length === 0) {
    console.log('✅ No hay migraciones para revertir.');
    return;
  }

  const latest = applied[applied.length - 1];
  const migration = migrations.find(m => m.version === Number(latest.version));

  if (!migration || !migration.down) {
    throw new Error(`No se encontró rollback para la migración ${latest.version}.`);
  }

  console.log(`↩ Revirtiendo ${migration.version}_${migration.name}...`);
  await client.query('BEGIN');
  try {
    await client.query(migration.down.sql);
    await client.query(
      'DELETE FROM schema_migrations WHERE version = $1',
      [migration.version]
    );
    await client.query('COMMIT');
    console.log(`✅ Revertida ${migration.version}_${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(
      `Falló rollback ${migration.version}_${migration.name}: ${error.message}`
    );
  }
}

async function main() {
  const command = (process.argv[2] || 'status').toLowerCase();
  if (!['up', 'down', 'status'].includes(command)) {
    throw new Error('Comando inválido. Use: up, down o status.');
  }

  const migrations = discoverMigrations(MIGRATIONS_DIR);
  validateMigrations(migrations);

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await ensureControlTable(client);

    if (command === 'status') await status(client, migrations);
    if (command === 'up') await migrateUp(client, migrations);
    if (command === 'down') await migrateDown(client, migrations);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } catch (_) {}
    client.release();
    await pool.end();
  }
}

main().catch(async error => {
  console.error(`❌ ${error.message}`);
  try { await pool.end(); } catch (_) {}
  process.exitCode = 1;
});
