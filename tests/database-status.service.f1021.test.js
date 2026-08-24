const test = require('node:test');
const assert = require('node:assert/strict');
const Service =
  require('../src/modules/database-status/database-status.service');

function repo(overrides = {}) {
  return {
    getDatabaseSizeBytes: async () => 0,
    listPublicTablesWithSizes: async () => [],
    countRows: async () => 0,
    listPublicTableTotalSizes: async () => [],
    ...overrides
  };
}

test('DBSTATSVC-001 formato BD usa MB bajo 1GB', () => {
  const result = Service.formatDatabaseSize(
    512 * 1024 * 1024
  );

  assert.equal(result.totalSizeFormatted, '512.00 MB');
});

test('DBSTATSVC-002 formato BD usa GB desde 1GB', () => {
  const result = Service.formatDatabaseSize(
    2 * 1024 * 1024 * 1024
  );

  assert.equal(result.totalSizeFormatted, '2.00 GB');
});

test('DBSTATSVC-003 formatTableSize usa KB MB GB', () => {
  assert.equal(
    Service.formatTableSize(512 * 1024),
    '512 KB'
  );

  assert.equal(
    Service.formatTableSize(2 * 1024 * 1024),
    '2.00 MB'
  );

  assert.equal(
    Service.formatTableSize(2 * 1024 * 1024 * 1024),
    '2.00 GB'
  );
});

test('DBSTATSVC-004 getStatus arma resumen completo', async () => {
  const service = new Service(repo({
    getDatabaseSizeBytes: async () =>
      10 * 1024 * 1024,

    listPublicTablesWithSizes: async () => [{
      tablename: 'usuarios',
      total_bytes: 2 * 1024 * 1024,
      table_bytes: 1024 * 1024,
      index_bytes: 1024 * 1024
    }],

    countRows: async () => 25
  }));

  const status = await service.getStatus();

  assert.equal(status.totalSizeMB, 10);
  assert.equal(status.totalRows, 25);
  assert.equal(status.totalTables, 1);
  assert.equal(status.tablas[0].row_count, 25);
});

test('DBSTATSVC-005 error por tabla conserva fila degradada', async () => {
  const service = new Service(repo({
    listPublicTablesWithSizes: async () => [{
      tablename: 'rota',
      total_bytes: 100,
      table_bytes: 50,
      index_bytes: 50
    }],
    countRows: async () => {
      throw new Error('boom');
    }
  }));

  const status = await service.getStatus();

  assert.deepEqual(status.tablas[0], {
    tablename: 'rota',
    total_size_mb: 0,
    total_size_formatted: '0 B',
    table_size_formatted: '0 B',
    indexes_size_formatted: '0 B',
    row_count: 0
  });
});

test('DBSTATSVC-006 tablas se ordenan por tamaño desc', async () => {
  const service = new Service(repo({
    listPublicTablesWithSizes: async () => [
      {
        tablename: 'a',
        total_bytes: 1 * 1024 * 1024,
        table_bytes: 1,
        index_bytes: 1
      },
      {
        tablename: 'b',
        total_bytes: 3 * 1024 * 1024,
        table_bytes: 1,
        index_bytes: 1
      }
    ],
    countRows: async () => 0
  }));

  const status = await service.getStatus();

  assert.deepEqual(
    status.tablas.map(t => t.tablename),
    ['b', 'a']
  );
});

test('DBSTATSVC-007 getTableSizes conserva array simple', async () => {
  const service = new Service(repo({
    listPublicTableTotalSizes: async () => [{
      tablename: 'usuarios',
      total_bytes: 1572864
    }]
  }));

  assert.deepEqual(
    await service.getTableSizes(),
    [{
      tablename: 'usuarios',
      total_size_mb: 1.5,
      total_size_bytes: 1572864
    }]
  );
});
