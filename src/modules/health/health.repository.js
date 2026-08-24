class HealthRepository {
  constructor(db) {
    this.db = db;
  }

  async now() {
    const result = await this.db.query(
      'SELECT NOW()'
    );

    return result.rows[0]?.now;
  }
}

module.exports = HealthRepository;
