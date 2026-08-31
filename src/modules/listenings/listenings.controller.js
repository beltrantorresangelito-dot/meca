class ListeningsController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  requireToken(req, res) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      ListeningsController.json(res, 401, { error: 'Token requerido' });
      return false;
    }
    return true;
  }

  async saveAssignments(req, res, body) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.saveAssignments(body);
      ListeningsController.json(res, 200, result);
    } catch (error) {
      ListeningsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

async createAtomicLoad(req, res, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const result =
      await this.service.createAtomicLoad(body);

    ListeningsController.json(
      res,
      result.tarea?.reutilizado ? 200 : 201,
      result
    );
  } catch (error) {
    console.error(
      'Error realizando carga atómica de escuchas:',
      error
    );

    ListeningsController.json(
      res,
      error.status || 500,
      {
        error: error.message
      }
    );
  }
}

async getLoadTemplate(req, res) {
  if (!this.requireToken(req, res)) return;

  try {
    ListeningsController.json(
      res,
      200,
      await this.service.getLoadTemplate()
    );
  } catch (error) {
    console.error('Error obteniendo plantilla de carga:', error);

    ListeningsController.json(
      res,
      error.status || 500,
      { error: error.message }
    );
  }
}

  async listAssignments(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.listAssignments()
      );
    } catch (error) {
      console.error('Error obteniendo asignaciones:', error);
      ListeningsController.json(res, 500, []);
    }
  }

  async listTasks(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.listTasks()
      );
    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      ListeningsController.json(res, 500, []);
    }
  }

  async createTask(req, res, body) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.createTask(body);

      ListeningsController.json(
        res,
        result.reutilizado ? 200 : 201,
        result
      );
    } catch (error) {
      ListeningsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async deleteTask(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.deleteTask(id);
      ListeningsController.json(res, 200, result);
    } catch (error) {
      console.error('❌ Error eliminando lote:', error);
      ListeningsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async listMyListenings(req, res, query = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      const { auditor } = query;

      ListeningsController.json(
        res,
        200,
        await this.service.listMyListenings(auditor)
      );
    } catch (error) {
      console.error('Error en mis escuchas:', error);
      ListeningsController.json(res, 500, { error: error.message });
    }
  }

  async start(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.start(id)
      );
    } catch (error) {
      console.error('Error iniciar escucha:', error);
      ListeningsController.json(res, 500, { error: error.message });
    }
  }

  async reportIncident(req, res, id, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.reportIncident(id, body.motivo)
      );
    } catch (error) {
      console.error('Error incidencia escucha:', error);
      ListeningsController.json(res, 500, { error: error.message });
    }
  }

  async manage(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.manage(id)
      );
    } catch (error) {
      console.error('Error gestionar escucha:', error);
      ListeningsController.json(res, 500, { error: error.message });
    }
  }

  async cancel(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.cancel(id)
      );
    } catch (error) {
      console.error('Error cancelar escucha:', error);
      ListeningsController.json(res, 500, { error: error.message });
    }
  }

  async reactivate(req, res, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      ListeningsController.json(
        res,
        200,
        await this.service.reactivate(body.ticket)
      );
    } catch (error) {
      console.error('Error reactivar escucha:', error);
      ListeningsController.json(res, 500, { error: error.message });
    }
  }

  async listTicketsByTask(req, res, taskId) {
    if (!this.requireToken(req, res)) return;

    try {
      const rows = await this.service.listTicketsByTask(taskId);
      console.log(`✅ ${rows.length} tickets encontrados en lote ${taskId}`);
      ListeningsController.json(res, 200, rows);
    } catch (error) {
      console.error('Error obteniendo tickets por lote:', error);
      ListeningsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }
}

module.exports = ListeningsController;
