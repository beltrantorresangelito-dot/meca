const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE_RE = /^(\d{4})_([a-z0-9_]+)\.(up|down)\.sql$/i;

function checksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function parseMigrationFilename(filename) {
  const match = FILE_RE.exec(filename);
  if (!match) return null;
  return {
    version: Number(match[1]),
    name: match[2],
    direction: match[3].toLowerCase(),
    filename
  };
}

function discoverMigrations(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .map(parseMigrationFilename)
    .filter(Boolean);

  const byVersion = new Map();

  for (const item of files) {
    if (!byVersion.has(item.version)) {
      byVersion.set(item.version, {
        version: item.version,
        name: item.name,
        up: null,
        down: null
      });
    }

    const migration = byVersion.get(item.version);
    if (migration.name !== item.name) {
      throw new Error(
        `La versión ${String(item.version).padStart(4, '0')} tiene nombres incompatibles: ` +
        `${migration.name} / ${item.name}`
      );
    }

    if (migration[item.direction]) {
      throw new Error(`Migración duplicada para versión ${item.version} (${item.direction}).`);
    }

    const fullPath = path.join(dir, item.filename);
    const sql = fs.readFileSync(fullPath, 'utf8');
    migration[item.direction] = {
      filename: item.filename,
      fullPath,
      sql,
      checksum: checksum(sql)
    };
  }

  return [...byVersion.values()].sort((a, b) => a.version - b.version);
}

function validateMigrations(migrations) {
  const versions = new Set();
  for (const m of migrations) {
    if (versions.has(m.version)) {
      throw new Error(`Versión de migración duplicada: ${m.version}`);
    }
    versions.add(m.version);
    if (!m.up) {
      throw new Error(`La migración ${m.version}_${m.name} no tiene archivo .up.sql`);
    }
    if (!m.down) {
      throw new Error(`La migración ${m.version}_${m.name} no tiene archivo .down.sql`);
    }
  }
  return true;
}

module.exports = {
  checksum,
  parseMigrationFilename,
  discoverMigrations,
  validateMigrations
};
