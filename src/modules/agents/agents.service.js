class AgentsService {
  constructor(repository) {
    this.repository = repository;
  }

  static error(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async list(filters = {}) {
    return this.repository.list(filters);
  }

  async update(id, data = {}) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw AgentsService.error('ID de agente inválido', 400);
    }

    const result = await this.repository.update(parsedId, data);

    if (result.noChanges) {
      throw AgentsService.error('No hay datos para actualizar', 400);
    }

    if (result.rowCount === 0) {
      throw AgentsService.error('Agente no encontrado', 404);
    }

    return {
      success: true,
      message: 'Agente actualizado correctamente'
    };
  }

  async delete(id) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw AgentsService.error('ID de agente inválido', 400);
    }

    const deleted = await this.repository.delete(parsedId);

    if (deleted === 0) {
      throw AgentsService.error('Agente no encontrado', 404);
    }

    return {
      success: true,
      message: 'Agente eliminado correctamente'
    };
  }

  async getById(id) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw AgentsService.error('ID de agente inválido', 400);
    }

    const agente = await this.repository.getById(parsedId);

    if (!agente) {
      throw AgentsService.error('Agente no encontrado', 404);
    }

    return agente;
  }

  async listCategories() {
    return this.repository.listCategories();
  }

  async listComplete() {
    return this.repository.listComplete();
  }

  static escapeCsv(value) {
    let finalValue = value ?? '';

    if (typeof finalValue !== 'string') {
      finalValue = String(finalValue);
    }

    finalValue = finalValue.replace(/"/g, '""');

    return `"${finalValue}"`;
  }

  async exportCsv() {
    const agentes = await this.repository.listForExport();

    const headers = [
      'ID',
      'Nombre',
      'DNI',
      'Carnet',
      'Correo',
      'Estado',
      'Líder',
      'Ubicación',
      'Localidad',
      'Categoría',
      'Funciones',
      'Fecha Registro'
    ];

    const csvRows = [headers.join(',')];

    for (const agente of agentes) {
      const values = [
        agente.id,
        agente.nombre,
        agente.dni || '',
        agente.carnet || '',
        agente.correo || '',
        agente.estado || '',
        agente.lider_2026 || '',
        agente.ubicacion || '',
        agente.localidad || '',
        agente.categoria_label || '',
        agente.funciones || '',
        agente.fecha_registro || ''
      ].map(AgentsService.escapeCsv);

      csvRows.push(values.join(','));
    }

    return '\uFEFF' + csvRows.join('\n');
  }
}

module.exports = AgentsService;
