class ListeningsService {
  constructor(repository) {
    this.repository = repository;
  }

  static error(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

async saveAssignments({ tarea_id, asignaciones } = {}) {
  if (
    !tarea_id ||
    !Array.isArray(asignaciones) ||
    asignaciones.length === 0
  ) {
    throw ListeningsService.error('Datos inválidos', 400);
  }

  return this.repository.withTransaction(async (client) => {
    let insertados = 0;
    let duplicados = 0;

    for (const asig of asignaciones) {
      const quiebreInformado =
        asig.quiebre !== undefined &&
        asig.quiebre !== null &&
        String(asig.quiebre).trim() !== '';

      const campanaInformada =
        asig.campana !== undefined &&
        asig.campana !== null &&
        String(asig.campana).trim() !== '';

      // ========================================================
      // DOMINIO MULTIDOMINIO
      //
      // Cuando la escucha informa Quiebre, el backend resuelve
      // Quiebre + Campaña y NO confía en IDs enviados por frontend.
      //
      // Todas las operaciones de esta carga utilizan el mismo
      // client PostgreSQL para garantizar atomicidad.
      //
      // Compatibilidad temporal:
      // las cargas legacy que todavía solo envían Campaña
      // continúan funcionando.
      // ========================================================

      let assignmentToSave = {
        ...asig,
        tarea_id
      };

      if (quiebreInformado) {
        if (!campanaInformada) {
          throw ListeningsService.error(
            `La Campaña es obligatoria cuando se informa Quiebre para el ticket "${asig.ticket || ''}"`,
            400
          );
        }

        let dominio;

        try {
          dominio =
            await this.repository.resolveListeningDomain(
              String(asig.quiebre).trim(),
              String(asig.campana).trim(),
              client
            );
        } catch (error) {
          throw ListeningsService.error(
            `Contexto inválido para el ticket "${asig.ticket || ''}": ${error.message}`,
            400
          );
        }

        if (!dominio) {
          throw ListeningsService.error(
            `No se pudo resolver el contexto de dominio para el ticket "${asig.ticket || ''}"`,
            400
          );
        }

        assignmentToSave = {
          ...assignmentToSave,

          // La BD es la autoridad.
          quiebre_id: dominio.quiebre_id,
          campana_id: dominio.campana_id,

          // Código normalizado para compatibilidad legacy.
          campana: dominio.campana_codigo
        };
      }

      const exists =
        await this.repository.assignmentExists(
          assignmentToSave.ticket || '',
          tarea_id,
          client
        );

      if (exists) {
        duplicados++;
        continue;
      }

      const inserted =
        await this.repository.insertAssignment(
          assignmentToSave,
          client
        );

      if (inserted) {
        insertados++;
      }
    }

    return {
      success: true,
      total: asignaciones.length,
      insertados,
      duplicados,
      message:
        `${insertados} asignaciones guardadas, ` +
        `${duplicados} duplicadas omitidas`
    };
  });
}

async createAtomicLoad({
  tarea,
  asignaciones
} = {}) {
  if (!tarea || typeof tarea !== 'object') {
    throw ListeningsService.error(
      'Los datos del lote son requeridos',
      400
    );
  }

  if (
    !Array.isArray(asignaciones) ||
    asignaciones.length === 0
  ) {
    throw ListeningsService.error(
      'La carga debe contener al menos una asignación',
      400
    );
  }

  const {
    id,
    fecha_carga,
    nombre_archivo,
    total_registros,
    estado,
    creado_por,
    version_plantilla_carga_id
  } = tarea;

  if (!id) {
    throw ListeningsService.error(
      'El campo id del lote es requerido',
      400
    );
  }

  if (!fecha_carga) {
    throw ListeningsService.error(
      'El campo fecha_carga es requerido',
      400
    );
  }

  const versionPlantillaId =
    Number(version_plantilla_carga_id);

  if (
    !Number.isInteger(versionPlantillaId) ||
    versionPlantillaId <= 0
  ) {
    throw ListeningsService.error(
      'El campo version_plantilla_carga_id es requerido y debe ser un entero positivo',
      400
    );
  }

  return this.repository.withTransaction(
    async (client) => {
      // ========================================================
      // 1. BUSCAR LOTE RECIENTE
      // ========================================================

      const existing =
        await this.repository.findRecentTaskByFilename(
          nombre_archivo || '',
          versionPlantillaId,
          client
        );

      let taskId;
      let reutilizado = false;

      if (existing) {
        taskId = existing.id;
        reutilizado = true;
      } else {
        const created =
          await this.repository.insertTask(
            {
              id,
              fecha_carga,
              nombre_archivo,
              total_registros,
              estado,
              creado_por,
              version_plantilla_carga_id:
                versionPlantillaId
            },
            client
          );

        if (!created || !created.id) {
          throw ListeningsService.error(
            'No se pudo crear el lote de escucha',
            500
          );
        }

        taskId = created.id;
      }

      // ========================================================
      // 2. PROCESAR TODAS LAS ASIGNACIONES
      // ========================================================

      let insertados = 0;
      let duplicados = 0;

      for (const asig of asignaciones) {
        const quiebreInformado =
          asig.quiebre !== undefined &&
          asig.quiebre !== null &&
          String(asig.quiebre).trim() !== '';

        const campanaInformada =
          asig.campana !== undefined &&
          asig.campana !== null &&
          String(asig.campana).trim() !== '';

        let assignmentToSave = {
          ...asig,
          tarea_id: taskId
        };

        // ======================================================
        // NUEVO FLUJO MULTIDOMINIO
        // ======================================================

        if (quiebreInformado) {
          if (!campanaInformada) {
            throw ListeningsService.error(
              `La Campaña es obligatoria cuando se informa Quiebre para el ticket "${asig.ticket || ''}"`,
              400
            );
          }

          let dominio;

          try {
            dominio =
              await this.repository.resolveListeningDomain(
                String(asig.quiebre).trim(),
                String(asig.campana).trim(),
                client
              );
          } catch (error) {
            throw ListeningsService.error(
              `Contexto inválido para el ticket "${asig.ticket || ''}": ${error.message}`,
              400
            );
          }

          if (!dominio) {
            throw ListeningsService.error(
              `No se pudo resolver el contexto de dominio para el ticket "${asig.ticket || ''}"`,
              400
            );
          }

          assignmentToSave = {
            ...assignmentToSave,

            // PostgreSQL resuelve los IDs de dominio.
            quiebre_id: dominio.quiebre_id,
            campana_id: dominio.campana_id,

            // Compatibilidad con la columna legacy campana.
            campana: dominio.campana_codigo
          };
        }

        // ======================================================
        // DUPLICADO TICKET + LOTE
        // ======================================================

        const exists =
          await this.repository.assignmentExists(
            assignmentToSave.ticket || '',
            taskId,
            client
          );

        if (exists) {
          duplicados++;
          continue;
        }

        // ======================================================
        // INSERT
        // ======================================================

        const inserted =
          await this.repository.insertAssignment(
            assignmentToSave,
            client
          );

        if (inserted) {
          insertados++;
        }
      }

      // ========================================================
      // TODO CORRECTO -> withTransaction hará COMMIT
      // ========================================================

      return {
        success: true,

        tarea: {
          id: taskId,
          reutilizado,
          version_plantilla_carga_id:
            existing?.version_plantilla_carga_id ??
            versionPlantillaId
        },

        total: asignaciones.length,
        insertados,
        duplicados,

        message:
          `${insertados} asignaciones guardadas, ` +
          `${duplicados} duplicadas omitidas`
      };
    }
  );
}

async getLoadTemplate() {
  const template =
    await this.repository.getPublishedLoadTemplate('ESCUCHAS_GENERAL');

  if (!template) {
    throw ListeningsService.error(
      'No existe una plantilla de carga activa y publicada para Escuchas',
      404
    );
  }

  if (!Array.isArray(template.campos) || template.campos.length === 0) {
    throw ListeningsService.error(
      'La plantilla de carga de Escuchas no tiene campos activos configurados',
      409
    );
  }

  return {
    success: true,
    plantilla: template
  };
}

  async listAssignments() {
    return this.repository.listAssignments();
  }

  async listTasks() {
    return this.repository.listTasks();
  }

  async createTask(data = {}) {
  const {
    id,
    fecha_carga,
    nombre_archivo,
    total_registros,
    estado,
    creado_por,
    version_plantilla_carga_id
  } = data;

  if (!id) {
    throw ListeningsService.error(
      'El campo id es requerido',
      400
    );
  }

  if (!fecha_carga) {
    throw ListeningsService.error(
      'El campo fecha_carga es requerido',
      400
    );
  }

  const versionPlantillaId =
    Number(version_plantilla_carga_id);

  if (
    !Number.isInteger(versionPlantillaId) ||
    versionPlantillaId <= 0
  ) {
    throw ListeningsService.error(
      'El campo version_plantilla_carga_id es requerido y debe ser un entero positivo',
      400
    );
  }

  const existing =
    await this.repository.findRecentTaskByFilename(
      nombre_archivo || '',
      versionPlantillaId
    );

  if (existing) {
    return {
      success: true,
      id: existing.id,
      total_registros: existing.total_registros,
      message: 'Lote ya existente, reutilizado',
      reutilizado: true
    };
  }

  const created = await this.repository.insertTask({
    id,
    fecha_carga,
    nombre_archivo,
    total_registros,
    estado,
    creado_por,
    version_plantilla_carga_id: versionPlantillaId
  });

  return {
    success: true,
    id: created.id,
    version_plantilla_carga_id:
      created.version_plantilla_carga_id,
    message: 'Tarea creada correctamente',
    reutilizado: false
  };
}

  async deleteTask(taskId) {
    const parsedId = Number(taskId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw ListeningsService.error('ID de lote inválido', 400);
    }

    const task = await this.repository.withTransaction(async client => {
      const found = await this.repository.getTaskById(parsedId, client);

      if (!found) {
        throw ListeningsService.error('Lote no encontrado', 404);
      }

      await this.repository.deleteAssignmentsByTask(client, parsedId);
      await this.repository.deleteTask(client, parsedId);

      return found;
    });

    const nombreArchivo = task.nombre_archivo || 'Desconocido';

    return {
      success: true,
      message: `Lote "${nombreArchivo}" eliminado correctamente`
    };
  }

  async listMyListenings(auditor) {
    return this.repository.listMyListenings(auditor);
  }

  async start(id) {
    await this.repository.startListening(id);
    return { success: true };
  }

  async reportIncident(id, motivo) {
    await this.repository.reportIncident(id, motivo);
    return { success: true };
  }

  async manage(id) {
    await this.repository.markManaged(id);
    return { success: true };
  }

  async cancel(id) {
    await this.repository.cancelManagement(id);
    return { success: true };
  }

  async reactivate(ticket) {
    const existing = await this.repository.getAssignmentByTicket(ticket);

    if (existing) {
      await this.repository.reactivateByTicket(ticket);
    }

    return { success: true };
  }

  async listTicketsByTask(taskId) {
    const parsedId = Number(taskId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw ListeningsService.error('ID de lote inválido', 400);
    }

    const task = await this.repository.getTaskById(parsedId);

    if (!task) {
      throw ListeningsService.error('Lote no encontrado', 404);
    }

    return this.repository.listTicketsByTask(parsedId);
  }
}

module.exports = ListeningsService;
