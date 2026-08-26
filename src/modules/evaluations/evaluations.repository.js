class EvaluationsRepository {
  constructor(db) {
    this.db = db;
  }

  async list({ agente, evaluador, ticket, limite } = {}) {
    let query = 'SELECT * FROM evaluaciones WHERE 1=1';
    const params = [];
    let idx = 1;

    if (agente) {
      query += ` AND agente = $${idx++}`;
      params.push(agente);
    }

    if (evaluador) {
      query += ` AND evaluador = $${idx++}`;
      params.push(evaluador);
    }

    if (ticket) {
      query += ` AND ticket_psi = $${idx++}`;
      params.push(ticket);
    }

    query += ' ORDER BY timestamp DESC';

    if (limite) {
      query += ` LIMIT $${idx++}`;
      params.push(parseInt(limite, 10));
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async insertEvaluation(client, evaluacion) {
    await client.query(`
      INSERT INTO evaluaciones (
        id,
        timestamp,
        fecha,
        fecha_formateada,
        ticket_psi,
        agente,
        evaluador,
        id_llamada,
        fecha_descarga,
        total_enc,
        total_ecuf,
        total_ecn,
        nota_final,
        rango,
        tiempo_auditoria,
        tiempo_auditoria_formateado,
        fecha_registro,
        campana_id,
        matriz_id,
        version_matriz_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
    `, [
      evaluacion.id,
      evaluacion.timestamp,
      evaluacion.fecha,
      evaluacion.fechaFormateada,
      evaluacion.ticketPSI,
      evaluacion.agente,
      evaluacion.evaluador,
      evaluacion.idLlamada,
      evaluacion.fechaDescarga || null,
      evaluacion.totalENC,
      evaluacion.totalECUF,
      evaluacion.totalECN,
      evaluacion.notaFinal,
      evaluacion.rango,
      evaluacion.tiempoAuditoria,
      evaluacion.tiempoAuditoriaFormateado,
      evaluacion.fechaRegistro,
      evaluacion.campana_id ??
        evaluacion.campanaId ??
        null,
      evaluacion.matriz_id ??
        evaluacion.matrizId ??
        null,
      evaluacion.version_matriz_id ??
        evaluacion.versionMatrizId ??
        null
    ]);
  }

  async insertDetail(client, evaluacionId, detalle) {
    if (!detalle?.submotivo) {
      return false;
    }

    await client.query(`
      INSERT INTO detalles_evaluacion (
        evaluacion_id,
        bloque,
        atributo,
        submotivo,
        peso,
        cumple
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      evaluacionId,
      String(detalle.bloque || ''),
      String(detalle.atributo || ''),
      String(detalle.submotivo),
      Number(detalle.peso) || 0,
      detalle.cumple === true ||
        detalle.cumple === 'true' ||
        detalle.cumple === 1 ||
        detalle.cumple === '1'
    ]);

    return true;
  }

  async saveWithDetails(evaluacion) {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      await this.insertEvaluation(client, evaluacion);

      if (Array.isArray(evaluacion.detalles)) {
        for (const detalle of evaluacion.detalles) {
          await this.insertDetail(
            client,
            evaluacion.id,
            detalle
          );
        }
      }

      await client.query('COMMIT');

      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteById(id) {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM detalles_evaluacion WHERE evaluacion_id = $1',
        [id]
      );

      await client.query(
        'DELETE FROM evaluaciones WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');

      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByTicket(ticket) {
    const result = await this.db.query(
      `SELECT id, ticket_psi, agente, nota_final, fecha_formateada
       FROM evaluaciones
       WHERE ticket_psi = $1
       LIMIT 1`,
      [ticket]
    );

    return result.rows[0] || null;
  }

  async listDetails(evaluationId) {
    const result = await this.db.query(
      'SELECT * FROM detalles_evaluacion WHERE evaluacion_id = $1',
      [evaluationId]
    );

    return result.rows;
  }
}

module.exports = EvaluationsRepository;
