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


static writeError(message, status = 400, payload = null) {
  const error = new Error(message);
  error.status = status;
  error.payload = payload || { error: message };
  return error;
}

async createFront(input = {}) {
  const { codigo, nombre, peso_maximo, orden, activo } = input;

  if (!codigo || !nombre || !peso_maximo) {
    throw MatrixService.writeError('Faltan campos obligatorios', 400);
  }

  const nuevoPeso = parseFloat(peso_maximo);
  if (!Number.isFinite(nuevoPeso) || nuevoPeso <= 0 || nuevoPeso > 100) {
    throw MatrixService.writeError(
      'El peso debe ser mayor a 0 y menor o igual a 100',
      400
    );
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const existing = await this.repository.findFrontByCode(
      client, versionId, codigo
    );
    if (existing) {
      throw MatrixService.writeError(
        `Ya existe un frente con el código "${codigo}" en esta versión`,
        400
      );
    }

    const sumaActual = await this.repository.sumActiveFrontWeights(
      client, versionId
    );
    const nuevaSuma = sumaActual + nuevoPeso;

    if (nuevaSuma > 100) {
      throw MatrixService.writeError(
        `La suma total de los frentes en la versión activa excede el 100%. Actual: ${sumaActual}% + ${nuevoPeso}% = ${nuevaSuma}%`,
        400,
        {
          error: `La suma total de los frentes en la versión activa excede el 100%. Actual: ${sumaActual}% + ${nuevoPeso}% = ${nuevaSuma}%`,
          suma_actual: sumaActual,
          nuevo_peso: nuevoPeso,
          peso_maximo: 100,
          suma_total: nuevaSuma
        }
      );
    }

    return this.repository.insertFront(client, {
      versionId,
      codigo,
      nombre,
      pesoMaximo: nuevoPeso,
      orden: orden || 0,
      activo: activo !== false
    });
  });
}

async updateFront(id, input = {}) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de frente inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const actual = await this.repository.getFrontByIdAndVersion(
      client, parsedId, versionId
    );
    if (!actual) {
      throw MatrixService.writeError(
        'Frente no encontrado en la versión activa',
        404
      );
    }

    const nuevoPeso = input.peso_maximo !== undefined
      ? parseFloat(input.peso_maximo)
      : parseFloat(actual.peso_maximo);

    // El endpoint legacy no tenía esta validación explícita en PUT.
    // Solo aseguramos que el valor pueda participar en la suma.
    if (!Number.isFinite(nuevoPeso)) {
      throw MatrixService.writeError('Peso inválido', 400);
    }

    const nuevoCodigo = input.codigo || actual.codigo;

    if (input.codigo && input.codigo !== actual.codigo) {
      const duplicate = await this.repository.findFrontByCode(
        client, versionId, input.codigo, parsedId
      );

      if (duplicate) {
        throw MatrixService.writeError(
          `Ya existe un frente con el código "${input.codigo}" en esta versión`,
          400
        );
      }
    }

    const sumaOtros = await this.repository.sumActiveFrontWeights(
      client, versionId, parsedId
    );
    const nuevaSuma = sumaOtros + nuevoPeso;

    if (nuevaSuma > 100) {
      throw MatrixService.writeError(
        `La suma total de los frentes en la versión activa excede el 100%. Otros: ${sumaOtros}% + ${nuevoPeso}% = ${nuevaSuma}%`,
        400,
        {
          error: `La suma total de los frentes en la versión activa excede el 100%. Otros: ${sumaOtros}% + ${nuevoPeso}% = ${nuevaSuma}%`,
          suma_actual: sumaOtros,
          nuevo_peso: nuevoPeso,
          peso_maximo: 100,
          suma_total: nuevaSuma
        }
      );
    }

    return this.repository.updateFront(client, parsedId, {
      codigo: nuevoCodigo,
      nombre: input.nombre || actual.nombre,
      pesoMaximo: nuevoPeso,
      orden: input.orden !== undefined ? input.orden : 0,
      activo: input.activo !== undefined ? input.activo : true
    });
  });
}

async deleteFront(id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de frente inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const front = await this.repository.deleteFrontTree(
      client, parsedId, versionId
    );

    if (!front) {
      throw MatrixService.writeError('Frente no encontrado', 404);
    }

    return {
      success: true,
      message: `✅ Frente "${front.nombre}" eliminado correctamente.`
    };
  });
}

}

module.exports = MatrixService;
