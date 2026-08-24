class MatrixRecalculationRepository {
  constructor(db) {
    this.db = db;
  }

  async listDetailsWithSubreason() {
    const result = await this.db.query(`
      SELECT d.id, d.submotivo, d.evaluacion_id
      FROM detalles_evaluacion d
      WHERE d.submotivo IS NOT NULL
    `);

    return result.rows || [];
  }

  async findActiveWeightBySubreasonCode(code) {
    const result = await this.db.query(`
      SELECT peso_individual
      FROM sub_motivos
      WHERE codigo = $1
        AND activo = true
    `, [code]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return parseFloat(result.rows[0].peso_individual);
  }

  async updateDetailWeight(detailId, weight) {
    await this.db.query(`
      UPDATE detalles_evaluacion
      SET peso = $1
      WHERE id = $2
    `, [weight, detailId]);
  }

  async listDistinctEvaluationIds() {
    const result = await this.db.query(`
      SELECT DISTINCT evaluacion_id
      FROM detalles_evaluacion
    `);

    return (result.rows || []).map(row => row.evaluacion_id);
  }

  async calculateEvaluationTotals(evaluationId) {
    const result = await this.db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN bloque = 'ENC' AND cumple = true THEN peso ELSE 0 END), 0) as total_enc,
        COALESCE(SUM(CASE WHEN bloque = 'ECUF' AND cumple = true THEN peso ELSE 0 END), 0) as total_ecuf,
        COALESCE(SUM(CASE WHEN bloque = 'ECN' AND cumple = true THEN peso ELSE 0 END), 0) as total_ecn,
        COALESCE(SUM(CASE WHEN cumple = true THEN peso ELSE 0 END), 0) as nota_final
      FROM detalles_evaluacion
      WHERE evaluacion_id = $1
    `, [evaluationId]);

    return result.rows[0];
  }

  async updateEvaluationTotals(evaluationId, totals) {
    await this.db.query(`
      UPDATE evaluaciones
      SET total_enc = $1,
          total_ecuf = $2,
          total_ecn = $3,
          nota_final = $4
      WHERE id = $5
    `, [
      totals.total_enc,
      totals.total_ecuf,
      totals.total_ecn,
      totals.nota_final,
      evaluationId
    ]);
  }

  async getFinalSummary() {
    const result = await this.db.query(`
      SELECT
        COUNT(*) as total_evaluaciones,
        ROUND(AVG(nota_final), 2) as promedio_notas,
        MIN(nota_final) as nota_min,
        MAX(nota_final) as nota_max
      FROM evaluaciones
    `);

    return result.rows[0];
  }
}

module.exports = MatrixRecalculationRepository;
