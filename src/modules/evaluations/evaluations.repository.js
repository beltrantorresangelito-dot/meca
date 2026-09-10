const ListeningsRepository = require('../listenings/listenings.repository');

class EvaluationsRepository {
  constructor(db) {
    this.db = db;
    this.listeningsRepository = new ListeningsRepository(db);
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
      quiebre_id,
      campana_id,
      matriz_id,
      version_matriz_id
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,$14,$15,$16,$17,
      $18,$19,$20,$21
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

    evaluacion.quiebre_id ??
      evaluacion.quiebreId ??
      null,

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

  async insertDetail(
    client,
    evaluacionId,
    detalle
) {
    if (
        !detalle?.submotivo
    ) {
        return false;
    }


    const frenteId =
        Number(
            detalle.frente_id ??
            detalle.frenteId
        );

    const atributoId =
        Number(
            detalle.atributo_id ??
            detalle.atributoId
        );

    const criterioId =
        Number(
            detalle.criterio_id ??
            detalle.criterioId
        );


    if (
        !Number.isInteger(frenteId) ||
        frenteId <= 0
    ) {
        throw new Error(
            `frente_id inválido para ${detalle.submotivo}`
        );
    }


    if (
        !Number.isInteger(atributoId) ||
        atributoId <= 0
    ) {
        throw new Error(
            `atributo_id inválido para ${detalle.submotivo}`
        );
    }


    if (
        !Number.isInteger(criterioId) ||
        criterioId <= 0
    ) {
        throw new Error(
            `criterio_id inválido para ${detalle.submotivo}`
        );
    }


    await client.query(
        `
            INSERT INTO detalles_evaluacion (
                evaluacion_id,
                bloque,
                atributo,
                submotivo,

                frente_id,
                atributo_id,
                criterio_id,

                peso,
                cumple,
                valor_respuesta
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
            )
        `,
        [
            evaluacionId,

            String(
                detalle.bloque ||
                ''
            ),

            String(
                detalle.atributo ||
                ''
            ),

            String(
                detalle.submotivo
            ),

            frenteId,
            atributoId,
            criterioId,

            Number(
                detalle.peso
            ) || 0,

            detalle.cumple === true ||
            detalle.cumple === 'true' ||
            detalle.cumple === 1 ||
            detalle.cumple === '1',

            detalle.valor_respuesta ??
            detalle.valorRespuesta ??
            null
        ]
    );


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

      const escuchaId =
        evaluacion.escucha_id ??
        evaluacion.escuchaId ??
        null;

      if (escuchaId !== null && escuchaId !== undefined) {
        const escucha =
          await this.listeningsRepository.getAssignmentById(
            escuchaId,
            client
          );

        if (!escucha) {
          const error = new Error(
            `Escucha ${escuchaId} no encontrada`
          );

          error.status = 404;
          throw error;
        }

        const ticketEvaluacion =
          String(evaluacion.ticketPSI || '').trim();

        const ticketEscucha =
          String(escucha.ticket || '').trim();

        if (
          !ticketEvaluacion ||
          !ticketEscucha ||
          ticketEvaluacion !== ticketEscucha
        ) {
          const error = new Error(
            'La escucha no corresponde al ticket de la evaluación'
          );

          error.status = 409;
          error.code = 'EVALUATION_LISTENING_MISMATCH';

          throw error;
        }

        await this.listeningsRepository.markManaged(
          escuchaId,
          client
        );
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

  async updateWithDetails(evaluationId, evaluacion) {
  const client = await this.db.connect();

  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      `
        UPDATE evaluaciones
        SET
          total_enc = $1,
          total_ecuf = $2,
          total_ecn = $3,
          nota_final = $4,
          rango = $5,
          fecha = $6,
          fecha_formateada = $7,
          fecha_modificacion = NOW(),
          veces_editado = COALESCE(veces_editado, 0) + 1
        WHERE id = $8
        RETURNING id, veces_editado
      `,
      [
        evaluacion.totalENC ?? evaluacion.total_enc ?? 0,
        evaluacion.totalECUF ?? evaluacion.total_ecuf ?? 0,
        evaluacion.totalECN ?? evaluacion.total_ecn ?? 0,
        evaluacion.notaFinal ?? evaluacion.nota_final,
        evaluacion.rango,
        evaluacion.fecha,
        evaluacion.fechaFormateada ?? evaluacion.fecha_formateada,
        evaluationId
      ]
    );

    if (updateResult.rowCount !== 1) {
      const error = new Error(
        `Evaluación ${evaluationId} no encontrada`
      );
      error.status = 404;
      error.code = 'EVALUATION_NOT_FOUND';
      throw error;
    }

    if (
      !Array.isArray(evaluacion.detalles) ||
      evaluacion.detalles.length === 0
    ) {
      const error = new Error(
        'La evaluación debe contener detalles'
      );
      error.status = 400;
      error.code = 'EVALUATION_DETAILS_REQUIRED';
      throw error;
    }

    await client.query(
      `
        DELETE FROM detalles_evaluacion
        WHERE evaluacion_id = $1
      `,
      [evaluationId]
    );

    for (const detalle of evaluacion.detalles) {
      await this.insertDetail(
        client,
        evaluationId,
        detalle
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      id: updateResult.rows[0].id,
      veces_editado:
        updateResult.rows[0].veces_editado
    };
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
