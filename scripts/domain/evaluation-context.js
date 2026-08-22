const { pool } = require('../../models/database');

async function resolveEvaluationContext({ campaignId, date = null }) {
  if (!campaignId) {
    throw new Error('campaignId es obligatorio');
  }

  const sql = date
    ? 'SELECT * FROM resolver_contexto_evaluacion($1, $2::date)'
    : 'SELECT * FROM resolver_contexto_evaluacion($1, CURRENT_DATE)';

  const params = date ? [campaignId, date] : [campaignId];
  const result = await pool.query(sql, params);

  if (result.rows.length !== 1) {
    throw new Error(
      `La resolución de contexto esperaba 1 fila y obtuvo ${result.rows.length}`
    );
  }

  return result.rows[0];
}

async function validateDomainConsistency() {
  const checks = {};

  const orphanCampaigns = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM campanas
    WHERE quiebre_id IS NULL
  `);
  checks.campaignsWithoutBreak = orphanCampaigns.rows[0].count;

  const orphanVersions = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM versiones_matriz
    WHERE matriz_id IS NULL
  `);
  checks.matrixVersionsWithoutMatrix = orphanVersions.rows[0].count;

  const crossBreakLinks = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM campana_matriz cm
    JOIN campanas c ON c.id = cm.campana_id
    JOIN matrices m ON m.id = cm.matriz_id
    WHERE c.quiebre_id <> m.quiebre_id
  `);
  checks.crossBreakCampaignMatrixLinks = crossBreakLinks.rows[0].count;

  const campaignsWithoutActiveMatrix = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM campanas c
    WHERE NOT EXISTS (
      SELECT 1
      FROM campana_matriz cm
      WHERE cm.campana_id = c.id
        AND cm.activa = TRUE
    )
  `);
  checks.campaignsWithoutActiveMatrix = campaignsWithoutActiveMatrix.rows[0].count;

  checks.ok = Object.values(checks)
    .filter(v => typeof v === 'number')
    .every(v => v === 0);

  return checks;
}

module.exports = {
  resolveEvaluationContext,
  validateDomainConsistency
};
