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

    let insertados = 0;
    let duplicados = 0;

    for (const asig of asignaciones) {
      const exists = await this.repository.assignmentExists(
        asig.ticket || '',
        tarea_id
      );

      if (exists) {
        duplicados++;
        continue;
      }

      const inserted = await this.repository.insertAssignment({
        ...asig,
        tarea_id
      });

      if (inserted) insertados++;
    }

    return {
      success: true,
      total: asignaciones.length,
      insertados,
      duplicados,
      message:
        `${insertados} asignaciones guardadas, ${duplicados} duplicadas omitidas`
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
      creado_por
    } = data;

    if (!id) {
      throw ListeningsService.error('El campo id es requerido', 400);
    }

    if (!fecha_carga) {
      throw ListeningsService.error('El campo fecha_carga es requerido', 400);
    }

    const existing =
      await this.repository.findRecentTaskByFilename(nombre_archivo || '');

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
      creado_por
    });

    return {
      success: true,
      id: created.id,
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
