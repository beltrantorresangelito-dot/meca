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


async createAttribute(input = {}) {
  const {
    frente_id,
    nombre,
    peso_maximo,
    orden,
    activo
  } = input;

  if (
    !frente_id ||
    !nombre ||
    peso_maximo === undefined ||
    peso_maximo === null ||
    peso_maximo === ''
  ) {
    throw MatrixService.writeError('Faltan campos obligatorios', 400);
  }

  const peso = parseFloat(peso_maximo);
  if (!Number.isFinite(peso) || peso <= 0) {
    throw MatrixService.writeError(
      'El peso debe ser mayor a 0',
      400
    );
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const front = await this.repository.getActiveFront(
      client,
      frente_id,
      versionId
    );

    if (!front) {
      throw MatrixService.writeError(
        'Frente no encontrado en la versión activa',
        404
      );
    }

    const duplicate = await this.repository.findAttributeByName(
      client,
      versionId,
      frente_id,
      nombre
    );

    if (duplicate) {
      throw MatrixService.writeError(
        `Ya existe un atributo con el nombre "${nombre}" en este frente en la versión activa`,
        400
      );
    }

    const sumaActual = await this.repository.sumActiveAttributeWeights(
      client,
      versionId,
      frente_id
    );

    const pesoMaximoFrente = parseFloat(front.peso_maximo);
    const nuevaSuma = sumaActual + peso;

    if (nuevaSuma > pesoMaximoFrente) {
      const message =
        `La suma de los atributos en la versión activa excede el peso del frente (${pesoMaximoFrente}%). Actual: ${sumaActual}% + ${peso}% = ${nuevaSuma}%`;

      throw MatrixService.writeError(message, 400, {
        error: message,
        suma_actual: sumaActual,
        nuevo_peso: peso,
        peso_maximo_frente: pesoMaximoFrente,
        suma_total: nuevaSuma
      });
    }

    return this.repository.insertAttribute(client, {
      frontId: frente_id,
      nombre,
      pesoMaximo: peso,
      orden: orden || 0,
      activo: activo !== false
    });
  });
}

async updateAttribute(id, input = {}) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de atributo inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const current = await this.repository.getAttributeInActiveVersion(
      client,
      parsedId,
      versionId
    );

    if (!current) {
      throw MatrixService.writeError(
        'Atributo no encontrado en la versión activa',
        404
      );
    }

    const frontId = input.frente_id || current.frente_id;
    const front = await this.repository.getActiveFront(
      client,
      frontId,
      versionId
    );

    if (!front) {
      throw MatrixService.writeError(
        'Frente no encontrado en la versión activa',
        404
      );
    }

    const nombre = input.nombre || current.nombre;
    const peso = input.peso_maximo !== undefined
      ? parseFloat(input.peso_maximo)
      : parseFloat(current.peso_maximo);

    if (!Number.isFinite(peso) || peso <= 0) {
      throw MatrixService.writeError(
        'El peso debe ser mayor a 0',
        400
      );
    }

    const duplicate = await this.repository.findAttributeByName(
      client,
      versionId,
      frontId,
      nombre,
      parsedId
    );

    if (duplicate) {
      throw MatrixService.writeError(
        `Ya existe un atributo con el nombre "${nombre}" en este frente en la versión activa`,
        400
      );
    }

    const sumaOtros = await this.repository.sumActiveAttributeWeights(
      client,
      versionId,
      frontId,
      parsedId
    );

    const pesoMaximoFrente = parseFloat(front.peso_maximo);
    const nuevaSuma = sumaOtros + peso;

    if (nuevaSuma > pesoMaximoFrente) {
      const message =
        `La suma de los atributos en la versión activa excede el peso del frente (${pesoMaximoFrente}%). Actual: ${sumaOtros}% + ${peso}% = ${nuevaSuma}%`;

      throw MatrixService.writeError(message, 400, {
        error: message,
        suma_actual: sumaOtros,
        nuevo_peso: peso,
        peso_maximo_frente: pesoMaximoFrente,
        suma_total: nuevaSuma
      });
    }

    return this.repository.updateAttribute(client, parsedId, {
      frontId,
      nombre,
      pesoMaximo: peso,
      orden: input.orden !== undefined ? input.orden : current.orden || 0,
      activo: input.activo !== undefined ? input.activo : current.activo
    });
  });
}

async deleteAttribute(id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de atributo inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const deleted = await this.repository.deleteAttributeTree(
      client,
      parsedId,
      versionId
    );

    if (!deleted) {
      throw MatrixService.writeError(
        'Atributo no encontrado',
        404
      );
    }

    return {
      success: true,
      message:
        `✅ Atributo "${deleted.attribute.nombre}" eliminado.\n` +
        `📊 Se eliminaron: ${deleted.totalSubReasons} sub-motivos.`
    };
  });
}


async createSubReason(input = {}) {
  const {
    atributo_id,
    codigo,
    descripcion,
    peso_individual,
    orden,
    activo
  } = input;

  if (
    !atributo_id ||
    !codigo ||
    !descripcion ||
    peso_individual === undefined ||
    peso_individual === null ||
    peso_individual === ''
  ) {
    throw MatrixService.writeError('Faltan campos obligatorios', 400);
  }

  const peso = parseFloat(peso_individual);
  if (!Number.isFinite(peso) || peso <= 0) {
    throw MatrixService.writeError('El peso debe ser mayor a 0', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const attribute = await this.repository.getAttributeInActiveVersion(
      client,
      atributo_id,
      versionId
    );

    if (!attribute) {
      throw MatrixService.writeError(
        'Atributo no encontrado en la versión activa',
        404
      );
    }

    const duplicate = await this.repository.findSubReasonByCode(
      client,
      versionId,
      atributo_id,
      codigo
    );

    if (duplicate) {
      throw MatrixService.writeError(
        `Ya existe un sub-motivo con el código "${codigo}" en este atributo en la versión activa`,
        400
      );
    }

    const sumaActual = await this.repository.sumActiveSubReasonWeights(
      client,
      versionId,
      atributo_id
    );

    const pesoMaximoAtributo = parseFloat(attribute.peso_maximo);
    const nuevaSuma = sumaActual + peso;

    if (nuevaSuma > pesoMaximoAtributo) {
      const message =
        `La suma de los sub-motivos en la versión activa excede el peso del atributo (${pesoMaximoAtributo}%). Actual: ${sumaActual}% + ${peso}% = ${nuevaSuma}%`;

      throw MatrixService.writeError(message, 400, {
        error: message,
        suma_actual: sumaActual,
        nuevo_peso: peso,
        peso_maximo_atributo: pesoMaximoAtributo,
        suma_total: nuevaSuma
      });
    }

    return this.repository.insertSubReason(client, {
      attributeId: atributo_id,
      codigo,
      descripcion,
      peso,
      orden: orden || 0,
      activo: activo !== false
    });
  });
}

async updateSubReason(id, input = {}) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de sub-motivo inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const current = await this.repository.getSubReasonInActiveVersion(
      client,
      parsedId,
      versionId
    );

    if (!current) {
      throw MatrixService.writeError(
        'Sub-motivo no encontrado en la versión activa',
        404
      );
    }

    const attributeId = input.atributo_id || current.atributo_id;
    const attribute = await this.repository.getAttributeInActiveVersion(
      client,
      attributeId,
      versionId
    );

    if (!attribute) {
      throw MatrixService.writeError(
        'Atributo no encontrado en la versión activa',
        404
      );
    }

    const codigo = input.codigo || current.codigo;
    const descripcion = input.descripcion || current.descripcion;
    const peso = input.peso_individual !== undefined
      ? parseFloat(input.peso_individual)
      : parseFloat(current.peso_individual);

    if (!Number.isFinite(peso) || peso <= 0) {
      throw MatrixService.writeError('El peso debe ser mayor a 0', 400);
    }

    const duplicate = await this.repository.findSubReasonByCode(
      client,
      versionId,
      attributeId,
      codigo,
      parsedId
    );

    if (duplicate) {
      throw MatrixService.writeError(
        `Ya existe un sub-motivo con el código "${codigo}" en este atributo en la versión activa`,
        400
      );
    }

    const sumaOtros = await this.repository.sumActiveSubReasonWeights(
      client,
      versionId,
      attributeId,
      parsedId
    );

    const pesoMaximoAtributo = parseFloat(attribute.peso_maximo);
    const nuevaSuma = sumaOtros + peso;

    if (nuevaSuma > pesoMaximoAtributo) {
      const message =
        `La suma de los sub-motivos en la versión activa excede el peso del atributo (${pesoMaximoAtributo}%). Actual: ${sumaOtros}% + ${peso}% = ${nuevaSuma}%`;

      throw MatrixService.writeError(message, 400, {
        error: message,
        suma_actual: sumaOtros,
        nuevo_peso: peso,
        peso_maximo_atributo: pesoMaximoAtributo,
        suma_total: nuevaSuma
      });
    }

    return this.repository.updateSubReason(client, parsedId, {
      attributeId,
      codigo,
      descripcion,
      peso,
      orden: input.orden !== undefined ? input.orden : current.orden || 0,
      activo: input.activo !== undefined ? input.activo : current.activo
    });
  });
}

async deleteSubReason(id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de sub-motivo inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const versionId = await this.repository.getActiveVersionId(client);
    if (!versionId) {
      throw MatrixService.writeError('No hay versión activa', 404);
    }

    const deleted = await this.repository.deleteSubReason(
      client,
      parsedId,
      versionId
    );

    if (!deleted) {
      throw MatrixService.writeError('Sub-motivo no encontrado', 404);
    }

    return {
      success: true,
      message: `✅ Sub-motivo "${deleted.codigo}" eliminado.`
    };
  });
}


async freezeVersion(input = {}) {
  const { version, descripcion, fecha_vigencia } = input;

  if (!version || !fecha_vigencia) {
    throw MatrixService.writeError(
      'Versión y fecha vigencia son requeridos',
      400
    );
  }

  return this.repository.withTransaction(async client => {
    const source = await this.repository.getActiveVersionSource(client);
    if (!source) {
      throw MatrixService.writeError(
        'No hay una versión activa para congelar',
        400
      );
    }

    const exists = await this.repository.findVersionByName(client, version);
    if (exists) {
      throw MatrixService.writeError(
        `La versión "${version}" ya existe`,
        400
      );
    }

    const created = await this.repository.insertVersion(client, {
      matrizId: source.matriz_id,
      version,
      descripcion: descripcion || `Snapshot de versión ${source.id}`,
      fechaVigencia: fecha_vigencia,
      activa: false
    });

    const resumen = await this.repository.copyVersionTree(
      client,
      source.id,
      created.id
    );

    return {
      success: true,
      message: `Versión "${version}" creada exitosamente como snapshot`,
      version_id: created.id,
      resumen
    };
  });
}

async createEmptyVersion(input = {}) {
  const { version, descripcion } = input;
  if (!version) {
    throw MatrixService.writeError('Versión requerida', 400);
  }

  return this.repository.withTransaction(async client => {
    const source = await this.repository.getActiveVersionSource(client);
    if (!source) {
      throw MatrixService.writeError(
        'No hay versión activa para resolver la matriz',
        400
      );
    }

    const exists = await this.repository.findVersionByName(client, version);
    if (exists) {
      throw MatrixService.writeError(`La versión "${version}" ya existe`, 400);
    }

    return this.repository.insertVersion(client, {
      matrizId: source.matriz_id,
      version,
      descripcion,
      activa: false
    });
  });
}

async validateVersionIntegrity(versionId) {
  const id = Number(versionId);
  if (!Number.isInteger(id) || id <= 0) {
    throw MatrixService.writeError('ID de versión inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const result = await this.repository.getVersionIntegrity(client, id);
    if (!result) {
      throw MatrixService.writeError('Versión no encontrada', 404);
    }
    return result;
  });
}

async activateVersion(versionId) {
  const id = Number(versionId);
  if (!Number.isInteger(id) || id <= 0) {
    throw MatrixService.writeError('ID de versión inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const integrity = await this.repository.getVersionIntegrity(client, id);
    if (!integrity) {
      throw MatrixService.writeError('Versión no encontrada', 404);
    }

    if (!integrity.ok) {
      throw MatrixService.writeError(
        'La versión no puede activarse porque la matriz no está íntegra',
        400,
        {
          error: 'La versión no puede activarse porque la matriz no está íntegra',
          integrity
        }
      );
    }

    const activated = await this.repository.activateVersion(client, id);
    return { success: true, version: activated };
  });
}

async validateFrontWeight(input = {}) {
  return this.repository.withTransaction(async client => {
    const result = await this.repository.validateFrontWeight(client, {
      frenteId: input.frente_id,
      nuevoPeso: input.nuevo_peso,
      excluirId: input.excluir_id
    });

    if (result.notFound) {
      throw MatrixService.writeError(result.notFound, 404);
    }

    if (result.total > result.max) {
      const message =
        `La suma total de los frentes (${result.total}%) excede el 100%`;
      throw MatrixService.writeError(message, 400, {
        valid: false,
        error: message,
        total_actual: result.total,
        peso_maximo: result.max
      });
    }

    return { valid: true, total: result.total, peso_maximo: result.max };
  });
}

async validateAttributeWeight(input = {}) {
  return this.repository.withTransaction(async client => {
    const result = await this.repository.validateAttributeWeight(client, {
      frenteId: input.frente_id,
      nuevoPeso: input.nuevo_peso,
      excluirId: input.excluir_id || input.atributo_id
    });

    if (result.notFound) {
      throw MatrixService.writeError(result.notFound, 404);
    }

    if (result.total > result.max) {
      const message =
        `La suma de los atributos (${result.total}%) excede el peso máximo del frente (${result.max}%)`;
      throw MatrixService.writeError(message, 400, {
        valid: false,
        error: message,
        total_actual: result.total,
        peso_maximo: result.max
      });
    }

    return { valid: true, total: result.total, peso_maximo: result.max };
  });
}

async validateSubReasonWeight(input = {}) {
  return this.repository.withTransaction(async client => {
    const result = await this.repository.validateSubReasonWeight(client, {
      atributoId: input.atributo_id,
      nuevoPeso: input.nuevo_peso,
      excluirId: input.excluir_id || input.sub_motivo_id
    });

    if (result.notFound) {
      throw MatrixService.writeError(result.notFound, 404);
    }

    if (result.total > result.max) {
      const message =
        `La suma de los sub-motivos (${result.total}%) excede el peso máximo del atributo (${result.max}%)`;
      throw MatrixService.writeError(message, 400, {
        valid: false,
        error: message,
        total_actual: result.total,
        peso_maximo: result.max
      });
    }

    return { valid: true, total: result.total, peso_maximo: result.max };
  });
}


async getActiveEvaluationStructure() {
  return this.repository.getActiveEvaluationStructure();
}

async createEvaluationRule(input = {}) {
  if (!input.version_id || !input.submotivo_origen) {
    throw MatrixService.writeError('Faltan campos obligatorios', 400);
  }

  return this.repository.withTransaction(client =>
    this.repository.createEvaluationRule(client, input)
  );
}

async updateEvaluationRule(id, input = {}) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de regla inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const row = await this.repository.updateEvaluationRule(
      client,
      parsedId,
      input
    );

    if (!row) {
      throw MatrixService.writeError('Regla no encontrada', 404);
    }

    return row;
  });
}

async deleteEvaluationRule(id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw MatrixService.writeError('ID de regla inválido', 400);
  }

  return this.repository.withTransaction(async client => {
    const row = await this.repository.deleteEvaluationRule(client, parsedId);

    if (!row) {
      throw MatrixService.writeError('Regla no encontrada', 404);
    }

    return {
      success: true,
      message: 'Regla eliminada correctamente',
      id: parsedId
    };
  });
}

}

module.exports = MatrixService;
