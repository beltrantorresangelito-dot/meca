class ReportsRepository {
  constructor(db) {
    this.db = db;
  }

  async listEvaluationsDesc() {
    const result = await this.db.query(
      'SELECT * FROM evaluaciones ORDER BY timestamp DESC'
    );
    return result.rows;
  }

  async listEvaluationDates() {
    const result = await this.db.query(`
      SELECT fecha_formateada
      FROM evaluaciones
      WHERE fecha_formateada IS NOT NULL
        AND fecha_formateada != ''
      ORDER BY fecha_formateada DESC
    `);
    return result.rows;
  }

  async listEvaluationsAsc() {
    const result = await this.db.query(
      'SELECT * FROM evaluaciones ORDER BY timestamp ASC'
    );
    return result.rows;
  }

  async listFailedDetails() {
    const result = await this.db.query(
      'SELECT * FROM detalles_evaluacion WHERE cumple = false'
    );
    return result.rows;
  }

  async listAuditorErrors({ periodo, auditor } = {}) {
    let fechaFiltro = '';
    if (periodo && periodo !== 'all' && periodo !== 'todos') {
      const periodoDias = parseInt(periodo);
      if (!Number.isNaN(periodoDias) && periodoDias > 0) {
        fechaFiltro =
          ` AND e.fecha::date >= CURRENT_DATE - INTERVAL '${periodoDias} days'`;
      }
    }

    let auditorFiltro = '';
    const params = [];
    if (auditor && auditor !== 'todos' && auditor !== 'all') {
      auditorFiltro = ' AND e.evaluador = $1';
      params.push(auditor);
    }

    const result = await this.db.query(`
      SELECT
        e.evaluador,
        e.fecha_formateada,
        e.agente,
        d.bloque,
        d.atributo,
        d.submotivo,
        d.peso,
        d.id as detalle_id,
        d.cumple
      FROM evaluaciones e
      INNER JOIN detalles_evaluacion d ON e.id = d.evaluacion_id
      WHERE e.evaluador IS NOT NULL
        AND e.evaluador != ''
        AND d.cumple = false
        ${fechaFiltro}
        ${auditorFiltro}
      ORDER BY e.evaluador, e.fecha_formateada DESC
    `, params);

    return result.rows;
  }

  async getUserFullName(usuario) {
    const result = await this.db.query(
      'SELECT nombre_completo FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    return result.rows[0]?.nombre_completo || null;
  }

  async listEvaluationDetails(evaluacionId) {
    const result = await this.db.query(
      'SELECT * FROM detalles_evaluacion WHERE evaluacion_id = $1',
      [evaluacionId]
    );
    return result.rows;
  }

  async listLeaders() {
    const result = await this.db.query(`
      SELECT DISTINCT a.lider_2026
      FROM agentes a
      INNER JOIN evaluaciones e ON e.agente = a.nombre
      WHERE a.lider_2026 IS NOT NULL
        AND a.lider_2026 != ''
      ORDER BY a.lider_2026
    `);

    return result.rows;
  }

  async summaryByLeader() {
    const result = await this.db.query(`
      SELECT
        COALESCE(a.lider_2026, 'Sin líder') as nombre,
        COUNT(DISTINCT a.nombre) as total_agentes,
        COUNT(e.id) as total_eval,
        ROUND(AVG(e.nota_final), 1) as promedio_general,
        ROUND(AVG(e.total_enc), 1) as promedio_enc,
        ROUND(AVG(e.total_ecuf), 1) as promedio_ecuf,
        ROUND(AVG(e.total_ecn), 1) as promedio_ecn,
        ROUND(COUNT(CASE WHEN e.nota_final < 85 THEN 1 END) * 100.0 / COUNT(e.id), 1) as pct_quiebres,
        COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) as gestores_q4,
        ROUND(COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) * 100.0 / COUNT(DISTINCT a.nombre), 1) as pct_q4
      FROM evaluaciones e
      INNER JOIN agentes a ON e.agente = a.nombre
      LEFT JOIN (
        SELECT
          agente,
          CASE
            WHEN AVG(nota_final) >= 97 THEN 'Q1'
            WHEN AVG(nota_final) >= 90 THEN 'Q2'
            WHEN AVG(nota_final) >= 85 THEN 'Q3'
            ELSE 'Q4'
          END as cuartil
        FROM evaluaciones
        GROUP BY agente
      ) ranking ON e.agente = ranking.agente
      WHERE e.fecha_formateada IS NOT NULL
        AND a.lider_2026 IS NOT NULL
        AND a.lider_2026 != ''
      GROUP BY a.lider_2026
      ORDER BY promedio_general DESC
    `);

    return result.rows;
  }

  async summaryByLocation() {
    const result = await this.db.query(`
      SELECT
        COALESCE(a.ubicacion, 'Sin ubicación') as nombre,
        COUNT(DISTINCT a.nombre) as total_agentes,
        COUNT(e.id) as total_eval,
        ROUND(AVG(e.nota_final), 1) as promedio_general,
        ROUND(AVG(e.total_enc), 1) as promedio_enc,
        ROUND(AVG(e.total_ecuf), 1) as promedio_ecuf,
        ROUND(AVG(e.total_ecn), 1) as promedio_ecn,
        ROUND(COUNT(CASE WHEN e.nota_final < 85 THEN 1 END) * 100.0 / COUNT(e.id), 1) as pct_quiebres,
        COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) as gestores_q4,
        ROUND(COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) * 100.0 / COUNT(DISTINCT a.nombre), 1) as pct_q4
      FROM evaluaciones e
      INNER JOIN agentes a ON e.agente = a.nombre
      LEFT JOIN (
        SELECT
          agente,
          CASE
            WHEN AVG(nota_final) >= 97 THEN 'Q1'
            WHEN AVG(nota_final) >= 90 THEN 'Q2'
            WHEN AVG(nota_final) >= 85 THEN 'Q3'
            ELSE 'Q4'
          END as cuartil
        FROM evaluaciones
        GROUP BY agente
      ) ranking ON e.agente = ranking.agente
      WHERE e.fecha_formateada IS NOT NULL
        AND a.ubicacion IS NOT NULL
        AND a.ubicacion != ''
      GROUP BY a.ubicacion
      ORDER BY promedio_general DESC
    `);

    return result.rows;
  }

  async summaryByLocality() {
    const result = await this.db.query(`
      SELECT
        COALESCE(a.localidad, 'Sin localidad') as nombre,
        COUNT(DISTINCT a.nombre) as total_agentes,
        COUNT(e.id) as total_eval,
        ROUND(AVG(e.nota_final), 1) as promedio_general,
        ROUND(AVG(e.total_enc), 1) as promedio_enc,
        ROUND(AVG(e.total_ecuf), 1) as promedio_ecuf,
        ROUND(AVG(e.total_ecn), 1) as promedio_ecn,
        ROUND(COUNT(CASE WHEN e.nota_final < 85 THEN 1 END) * 100.0 / COUNT(e.id), 1) as pct_quiebres,
        COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) as gestores_q4,
        ROUND(COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) * 100.0 / COUNT(DISTINCT a.nombre), 1) as pct_q4
      FROM evaluaciones e
      INNER JOIN agentes a ON e.agente = a.nombre
      LEFT JOIN (
        SELECT
          agente,
          CASE
            WHEN AVG(nota_final) >= 97 THEN 'Q1'
            WHEN AVG(nota_final) >= 90 THEN 'Q2'
            WHEN AVG(nota_final) >= 85 THEN 'Q3'
            ELSE 'Q4'
          END as cuartil
        FROM evaluaciones
        GROUP BY agente
      ) ranking ON e.agente = ranking.agente
      WHERE e.fecha_formateada IS NOT NULL
        AND a.localidad IS NOT NULL
        AND a.localidad != ''
      GROUP BY a.localidad
      ORDER BY promedio_general DESC
    `);

    return result.rows;
  }
}

module.exports = ReportsRepository;
