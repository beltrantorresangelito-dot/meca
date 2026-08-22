const { pool } = require('../../../models/database');

class DomainRepository {
  constructor(db = pool) { this.db = db; }
  async getLegacyActiveMatrixVersion() {
    const result = await this.db.query(`
      SELECT *
      FROM versiones_matriz
      WHERE activa = TRUE
      LIMIT 1
    `);
    return result.rows[0] || null;
  }
}
module.exports = DomainRepository;
