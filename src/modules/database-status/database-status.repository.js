class DatabaseStatusRepository {
  constructor(db) {
    this.db = db;
  }

  async getDatabaseSizeBytes() {
    const result = await this.db.query(`
      SELECT pg_database_size(current_database()) as size_bytes
    `);

    return parseInt(result.rows?.[0]?.size_bytes || 0);
  }

  async listPublicTablesWithSizes() {
    const result = await this.db.query(`
      SELECT
        tablename,
        pg_total_relation_size('public.' || tablename) as total_bytes,
        pg_table_size('public.' || tablename) as table_bytes,
        pg_indexes_size('public.' || tablename) as index_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY total_bytes DESC
    `);

    return result.rows || [];
  }

  async countRows(tablename) {
    const safeTable = String(tablename).replace(/"/g, '""');

    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM "${safeTable}"`
    );

    return parseInt(result.rows?.[0]?.count || 0);
  }

  async listPublicTableTotalSizes() {
    const result = await this.db.query(`
      SELECT
        tablename,
        pg_total_relation_size('public.' || tablename) as total_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY total_bytes DESC
    `);

    return result.rows || [];
  }
}

module.exports = DatabaseStatusRepository;
