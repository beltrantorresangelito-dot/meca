class DatabaseStatusService {
  constructor(repository) {
    this.repository = repository;
  }

  static formatDatabaseSize(totalSizeBytes) {
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    if (totalSizeMB >= 1024) {
      return {
        totalSizeMB,
        totalSizeFormatted: `${(totalSizeMB / 1024).toFixed(2)} GB`
      };
    }

    return {
      totalSizeMB,
      totalSizeFormatted: `${totalSizeMB.toFixed(2)} MB`
    };
  }

  static formatTableSize(bytes) {
    const mb = bytes / (1024 * 1024);

    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${(mb * 1024).toFixed(0)} KB`;
  }

  async getStatus() {
    const totalSizeBytes =
      await this.repository.getDatabaseSizeBytes();

    const {
      totalSizeMB,
      totalSizeFormatted
    } = DatabaseStatusService.formatDatabaseSize(
      totalSizeBytes
    );

    const tables =
      await this.repository.listPublicTablesWithSizes();

    const tablas = [];
    let totalRows = 0;

    for (const t of tables) {
      try {
        const rowCount =
          await this.repository.countRows(t.tablename);

        totalRows += rowCount;

        const totalMB =
          t.total_bytes / (1024 * 1024);

        const tableMB =
          t.table_bytes / (1024 * 1024);

        const indexMB =
          t.index_bytes / (1024 * 1024);

        tablas.push({
          tablename: t.tablename,
          total_size_mb: parseFloat(totalMB.toFixed(2)),
          total_size_formatted:
            DatabaseStatusService.formatTableSize(
              t.total_bytes
            ),
          total_size_bytes: parseInt(t.total_bytes),
          table_size_mb: parseFloat(tableMB.toFixed(2)),
          table_size_formatted:
            DatabaseStatusService.formatTableSize(
              t.table_bytes
            ),
          indexes_size_mb:
            parseFloat(indexMB.toFixed(2)),
          indexes_size_formatted:
            DatabaseStatusService.formatTableSize(
              t.index_bytes
            ),
          row_count: rowCount
        });
      } catch (error) {
        console.warn(
          `Error procesando ${t.tablename}:`,
          error.message
        );

        tablas.push({
          tablename: t.tablename,
          total_size_mb: 0,
          total_size_formatted: '0 B',
          table_size_formatted: '0 B',
          indexes_size_formatted: '0 B',
          row_count: 0
        });
      }
    }

    tablas.sort(
      (a, b) =>
        b.total_size_mb - a.total_size_mb
    );

    return {
      totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
      totalSizeFormatted,
      totalSizeBytes,
      totalRows,
      totalTables: tablas.length,
      tablas
    };
  }

  async getTableSizes() {
    const rows =
      await this.repository.listPublicTableTotalSizes();

    return rows.map(t => ({
      tablename: t.tablename,
      total_size_mb: parseFloat(
        (t.total_bytes / (1024 * 1024)).toFixed(2)
      ),
      total_size_bytes: parseInt(t.total_bytes)
    }));
  }
}

module.exports = DatabaseStatusService;
