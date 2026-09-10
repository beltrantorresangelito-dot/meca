class ListeningsRepository {
  constructor(db) {
    this.db = db;
  }

 async assignmentExists(
  ticket,
  taskId,
  executor = this.db
) {
  const result = await executor.query(
    `
      SELECT id
      FROM asignaciones_escucha
      WHERE ticket = $1
        AND tarea_id = $2
    `,
    [
      ticket || '',
      taskId
    ]
  );

  return result.rows.length > 0;
}

async resolveListeningDomain(
  quiebre,
  campana,
  executor = this.db
) {
  const hasCampaign =
    campana !== null &&
    campana !== undefined &&
    String(campana).trim() !== '';

  const result = hasCampaign
    ? await executor.query(
      `
        SELECT
          quiebre_id,
          quiebre_codigo,
          quiebre_nombre,
          campana_id,
          campana_codigo,
          campana_descripcion
        FROM public.resolver_contexto_carga_escucha($1, $2)
      `,
      [
        quiebre,
        campana
      ]
    )
    : await executor.query(
      `
        SELECT
          quiebre_id,
          quiebre_codigo,
          quiebre_nombre,
          campana_id,
          campana_codigo,
          campana_descripcion
        FROM public.resolver_contexto_carga_escucha_quiebre($1)
      `,
      [
        quiebre
      ]
    );

  return result.rows[0] || null;
}

async getPublishedLoadTemplate(codigo) {
  const result = await this.db.query(
    `
      SELECT
        p.id AS plantilla_id,
        p.codigo,
        p.nombre,
        p.descripcion,
        vp.id AS version_id,
        vp.version,
        vp.publicado_en
      FROM public.plantillas_carga p
      INNER JOIN public.versiones_plantilla_carga vp
        ON vp.plantilla_id = p.id
      WHERE UPPER(TRIM(p.codigo)) = UPPER(TRIM($1))
        AND p.activa = TRUE
        AND vp.activa = TRUE
        AND vp.publicado_en IS NOT NULL
      ORDER BY vp.publicado_en DESC, vp.id DESC
      LIMIT 1
    `,
    [codigo]
  );

  const template = result.rows[0];

  if (!template) {
    return null;
  }

  const fieldsResult = await this.db.query(
    `
      SELECT
        id,
        cabecera_origen,
        campo_destino,
        tipo_dato,
        obligatorio,
        orden
      FROM public.campos_plantilla_carga
      WHERE version_plantilla_id = $1
        AND activo = TRUE
      ORDER BY orden ASC, id ASC
    `,
    [template.version_id]
  );

  return {
    ...template,
    campos: fieldsResult.rows || []
  };
}

async insertAssignment(
  data,
  executor = this.db
) {
  const result = await executor.query(
    `
      INSERT INTO asignaciones_escucha (
        id,
        tarea_id,
        ticket,
        supervisor_responsable,
        gestor_auditado,
        auditor_asignado,
        motivos,
        submotivos,
        subnivel,
        peticion,
        usuario_dni,
        usuario_mov,
        motivo_call,
        fecha_descarga,
        campana,
        campana_id,
        quiebre_id,
        estado,
        fecha_asignacion,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      )
      RETURNING id
    `,
    [
      data.id,
      data.tarea_id,
      data.ticket || '',
      data.supervisor_responsable || '',
      data.gestor_auditado || '',
      data.auditor_asignado || '',
      data.motivos || '',
      data.submotivos || '',
      data.subnivel || '',
      data.peticion || '',
      data.usuario_dni || '',
      data.usuario_mov || '',
      data.motivo_call || '',
      data.fecha_descarga || null,
      data.campana ?? null,
      data.campana_id || null,
      data.quiebre_id || null,
      data.estado || 'pendiente',
      data.fecha_asignacion || new Date().toISOString(),
      data.created_at || new Date().toISOString(),
      data.updated_at || new Date().toISOString()
    ]
  );

  return result.rows[0] || null;
}

  async listAssignments() {
    const result = await this.db.query('SELECT * FROM asignaciones_escucha');
    return result.rows || [];
  }

  async listTasks() {
    const result = await this.db.query(
      'SELECT * FROM tareas_escucha ORDER BY id DESC'
    );
    return result.rows || [];
  }

async findRecentTaskByFilename(
  filename,
  versionPlantillaCargaId,
  executor = this.db
) {
  const result = await executor.query(
    `
      SELECT
        id,
        fecha_carga,
        total_registros,
        version_plantilla_carga_id
      FROM tareas_escucha
      WHERE nombre_archivo = $1
        AND version_plantilla_carga_id = $2
        AND fecha_carga > NOW() - INTERVAL '5 minutes'
      ORDER BY fecha_carga DESC
      LIMIT 1
    `,
    [
      filename || '',
      versionPlantillaCargaId
    ]
  );

  return result.rows[0] || null;
}

async insertTask(
  data,
  executor = this.db
) {
  const result = await executor.query(
    `
      INSERT INTO tareas_escucha (
        id,
        fecha_carga,
        nombre_archivo,
        total_registros,
        estado,
        creado_por,
        version_plantilla_carga_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7
      )
      RETURNING
        id,
        version_plantilla_carga_id
    `,
    [
      data.id,
      data.fecha_carga,
      data.nombre_archivo || null,
      data.total_registros || 0,
      data.estado || 'activo',
      data.creado_por || 'supervisor',
      data.version_plantilla_carga_id
    ]
  );

  return result.rows[0] || null;
}

  async withTransaction(work) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally {
      client.release();
    }
  }

  async getTaskById(taskId, executor = this.db) {
    const result = await executor.query(
      'SELECT id, nombre_archivo FROM tareas_escucha WHERE id = $1',
      [taskId]
    );
    return result.rows[0] || null;
  }

  async deleteAssignmentsByTask(client, taskId) {
    await client.query(
      'DELETE FROM asignaciones_escucha WHERE tarea_id = $1',
      [taskId]
    );
  }

  async deleteTask(client, taskId) {
    await client.query(
      'DELETE FROM tareas_escucha WHERE id = $1',
      [taskId]
    );
  }

  async listMyListenings(auditor) {
    const result = await this.db.query(`
      SELECT * FROM asignaciones_escucha
      WHERE auditor_asignado = $1
        AND audio_disponible = true
        AND estado IN ('pendiente', 'en_proceso')
    `, [auditor]);
    return result.rows;
  }

  async startListening(id) {
    await this.db.query(
      "UPDATE asignaciones_escucha SET estado = 'en_proceso', updated_at = NOW() WHERE id = $1",
      [id]
    );
  }

  async reportIncident(id, motivo) {
    await this.db.query(`
      UPDATE asignaciones_escucha
      SET audio_disponible = false,
          motivo_incidencia = $1,
          fecha_incidencia = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [motivo, id]);
  }

  async markManaged(id, executor = this.db) {
  const result = await executor.query(`
    UPDATE asignaciones_escucha
    SET estado = 'gestionado',
        fecha_gestion = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `, [id]);

  if (result.rowCount !== 1) {
    const error = new Error(
      `Escucha ${id} no encontrada`
    );
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

  async cancelManagement(id) {
    await this.db.query(
      "UPDATE asignaciones_escucha SET estado = 'pendiente', updated_at = NOW() WHERE id = $1",
      [id]
    );
  }

  async getAssignmentById(id, executor = this.db) {
  const result = await executor.query(
    `
      SELECT
        id,
        ticket,
        campana_id,
        quiebre_id,
        auditor_asignado,
        estado
      FROM asignaciones_escucha
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

  async getAssignmentByTicket(ticket) {
    const result = await this.db.query(
      'SELECT id FROM asignaciones_escucha WHERE ticket = $1 LIMIT 1',
      [ticket]
    );
    return result.rows[0] || null;
  }

  async reactivateByTicket(ticket) {
    await this.db.query(
      "UPDATE asignaciones_escucha SET estado = 'pendiente', updated_at = NOW() WHERE ticket = $1",
      [ticket]
    );
  }

  async listTicketsByTask(taskId) {
    const result = await this.db.query(`
      SELECT
        id,
        ticket,
        auditor_asignado,
        supervisor_responsable,
        gestor_auditado,
        motivos,
        submotivos,
        estado,
        fecha_asignacion,
        fecha_gestion,
        audio_disponible,
        motivo_incidencia,
        tarea_id
      FROM asignaciones_escucha
      WHERE tarea_id = $1
      ORDER BY id DESC
    `, [taskId]);
    return result.rows;
  }
}

module.exports = ListeningsRepository;
