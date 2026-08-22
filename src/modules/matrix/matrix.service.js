const MatrixRepository = require('./matrix.repository');

class MatrixService {
  constructor(repository = new MatrixRepository()) {
    this.repository = repository;
  }

  async getActiveVersion() {
    return this.repository.getLegacyActiveMatrixVersion();
  }

  async getEvaluationActiveVersion() {
    const row = await this.repository.getLegacyEvaluationActiveVersion();

    if (!row) {
      return {
        version: 'default',
        activa: false,
        message: 'No hay versión activa configurada'
      };
    }

    return row;
  }

  async getVersionByDate(date) {
    if (!date) {
      const error = new Error('Fecha requerida');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    return this.repository.getLegacyMatrixVersionByDate(date);
  }

async getStructure(versionId) {
  const parsed = Number(versionId);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error('ID de versión inválido');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return this.repository.getLegacyMatrixStructure(parsed);
}


async listVersions() {
  try {
    if (typeof this.repository.matrixVersionsTableExists === 'function') {
      const exists = await this.repository.matrixVersionsTableExists();
      if (!exists) return [];
    }

    return await this.repository.listLegacyMatrixVersions();
  } catch (error) {
    return [];
  }
}


async getEvaluationRulesByVersion(versionId) {
  const parsed = Number(versionId);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error('ID de versión inválido');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  try {
    return await this.repository.getLegacyEvaluationRulesByVersion(parsed);
  } catch (error) {
    // Compatibilidad legacy: este endpoint históricamente nunca bloquea
    // la evaluación por errores en reglas opcionales.
    return [];
  }
}


async listFrentes() {
  return this.repository.listLegacyFrentes();
}

async listAtributos(frenteId = null) {
  return this.repository.listLegacyAtributos(frenteId || null);
}

async listSubMotivos(atributoId = null) {
  return this.repository.listLegacySubMotivos(atributoId || null);
}

async listEvaluationRulesAdmin() {
  return this.repository.listLegacyEvaluationRulesAdmin();
}

}

module.exports = MatrixService;
