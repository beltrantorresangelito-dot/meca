class MatrixController {
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
      MatrixController.json(res, 401, { error: 'Token requerido' });
      return false;
    }

    return true;
  }

  async evaluationActiveVersion(
    req,
    res,
    query = {}
) {
    if (!this.requireToken(req, res)) return;

    const matrizId =
        query.matrizId ||
        query.matriz_id;

    if (!matrizId) {
        MatrixController.json(
            res,
            400,
            {
                error:
                    'matrizId requerido'
            }
        );
        return;
    }

    try {
        const versionActiva =
            await this.service
                .getEvaluationActiveVersion(
                    matrizId
                );

        if (
            versionActiva.version !==
            'default'
        ) {
            console.log(
                `✅ Versión activa matriz ${matrizId}: ` +
                `${versionActiva.version}`
            );
        }

        MatrixController.json(
            res,
            200,
            versionActiva
        );

    } catch (error) {
        console.error(
            '❌ Error en /api/evaluacion/version-activa:',
            error
        );

        const status =
            error.code === 'VALIDATION_ERROR'
                ? 400
                : 500;

        MatrixController.json(
            res,
            status,
            { error: error.message }
        );
    }
}

async activeVersion(
    req,
    res,
    query = {}
) {
    if (!this.requireToken(req, res)) return;

    const matrizId =
        query.matrizId ||
        query.matriz_id;

    if (!matrizId) {
        MatrixController.json(
            res,
            400,
            {
                error:
                    'matrizId requerido'
            }
        );
        return;
    }

    try {
        const versionActiva =
            await this.service
                .getActiveVersion(
                    matrizId
                );

        if (!versionActiva) {
            MatrixController.json(
                res,
                404,
                {
                    error:
                        'No hay versión activa para la matriz indicada'
                }
            );
            return;
        }

        MatrixController.json(
            res,
            200,
            versionActiva
        );

    } catch (error) {
        console.error(
            'Error en /api/matriz/versiones/activa:',
            error
        );

        const status =
            error.code === 'VALIDATION_ERROR'
                ? 400
                : 500;

        MatrixController.json(
            res,
            status,
            { error: error.message }
        );
      }
}
async versionByDate(
    req,
    res,
    query = {}
) {
    if (!this.requireToken(req, res)) return;

    const {
        fecha
    } = query;

    const matrizId =
        query.matrizId ||
        query.matriz_id;

    if (!matrizId) {
        MatrixController.json(
            res,
            400,
            {
                error:
                    'matrizId requerido'
            }
        );
        return;
    }

    if (!fecha) {
        MatrixController.json(
            res,
            400,
            {
                error:
                    'Fecha requerida'
            }
        );
        return;
    }

    try {
        const version =
            await this.service
                .getVersionByDate(
                    matrizId,
                    fecha
                );

        if (!version) {
            MatrixController.json(
                res,
                404,
                {
                    error:
                        'No hay versión para esta matriz y fecha'
                }
            );
            return;
        }

        MatrixController.json(
            res,
            200,
            version
        );

    } catch (error) {
        console.error(
            'Error en /api/matriz/versiones/por-fecha:',
            error
        );

        const status =
            error.code === 'VALIDATION_ERROR'
                ? 400
                : 500;

        MatrixController.json(
            res,
            status,
            { error: error.message }
        );
    }
}

  async structure(req, res, versionId) {
    if (!this.requireToken(req, res)) return;

    const parsedId = parseInt(versionId);

    if (!parsedId || isNaN(parsedId)) {
      MatrixController.json(res, 400, { error: 'ID de versión inválido' });
      return;
    }

    console.log(`📡 Obteniendo estructura de versión ID: ${parsedId}`);

    try {
      const estructura = await this.service.getStructure(parsedId);

      if (!estructura) {
        MatrixController.json(res, 404, { error: 'Versión no encontrada' });
        return;
      }

      console.log(`✅ Versión encontrada: ${estructura.version.version}`);
      console.log(`✅ Estructura completada: ${estructura.frentes.length} frentes`);

      MatrixController.json(res, 200, estructura);
    } catch (error) {
      console.error('❌ Error obteniendo estructura:', error);
      MatrixController.json(res, 500, { error: error.message });
    }
  }

  async listVersions(req, res, query = {}) {
  if (!this.requireToken(req, res)) return;

  try {
    const matrizId =
      query.matrizId ??
      query.matriz_id ??
      null;

    const versiones =
      await this.service.listVersions(matrizId);

    MatrixController.json(
      res,
      200,
      versiones
    );
  } catch (error) {
    console.error(
      'Error en /api/matriz/versiones:',
      error
    );

    const status =
      error.code === 'VALIDATION_ERROR'
        ? 400
        : 500;

    MatrixController.json(
      res,
      status,
      { error: error.message }
    );
  }
}

  async rulesByVersion(req, res, versionId) {
    if (!this.requireToken(req, res)) return;

    try {
      const reglas = await this.service.getEvaluationRulesByVersion(
        parseInt(versionId)
      );

      console.log(
        `✅ ${reglas.length} reglas encontradas para versión ${versionId}`
      );

      MatrixController.json(res, 200, reglas);
    } catch (error) {
      console.error(
        '❌ Error en /api/reglas-evaluacion/version/:id:',
        error
      );

      // Contrato legacy deliberado: las reglas opcionales nunca
      // deben impedir cargar la evaluación.
      MatrixController.json(res, 200, []);
    }
  }

async listFrentes(req, res, query = {}) {
  if (!this.requireToken(req, res)) {
    return;
  }

  try {
    const rows =
      await this.service.listFrentes(
        query.matriz_id || null
      );

    MatrixController.json(
      res,
      200,
      rows
    );
  } catch (error) {
    console.error('Error:', error);

    MatrixController.json(
      res,
      500,
      { error: error.message }
    );
  }
}

async listAtributos(req, res, query = {}) {
  if (!this.requireToken(req, res)) {
    return;
  }

  try {
    const rows =
      await this.service.listAtributos(
        query.frente_id || null,
        query.matriz_id || null
      );

    MatrixController.json(
      res,
      200,
      rows
    );
  } catch (error) {
    console.error('Error:', error);

    MatrixController.json(
      res,
      500,
      { error: error.message }
    );
  }
}

async listSubMotivos(req, res, query = {}) {
  if (!this.requireToken(req, res)) {
    return;
  }

  try {
    const rows =
      await this.service.listSubMotivos(
        query.atributo_id || null,
        query.matriz_id || null
      );

    MatrixController.json(
      res,
      200,
      rows
    );
  } catch (error) {
    console.error('Error:', error);

    MatrixController.json(
      res,
      500,
      { error: error.message }
    );
  }
}

async listEvaluationRulesAdmin(req, res, query = {}) {
  if (!this.requireToken(req, res)) return;

  try {
    const rows =
      await this.service.listEvaluationRulesAdmin(
        query.matriz_id || null
      );

    MatrixController.json(
      res,
      200,
      rows
    );

  } catch (error) {
    console.error('Error:', error);

    if (error.status) {
      MatrixController.json(
        res,
        error.status,
        error.payload || {
          error: error.message
        }
      );
      return;
    }

    // Contrato legacy real:
    // error interno -> HTTP 500, body [].
    MatrixController.json(
      res,
      500,
      []
    );
  }
}


async createFront(req, res, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.createFront(body);
    MatrixController.json(res, 201, row);
  } catch (error) {
    console.error('Error creando frente:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async updateFront(req, res, id, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.updateFront(id, body);
    MatrixController.json(res, 200, row);
  } catch (error) {
    console.error('Error actualizando frente:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async deleteFront(req, res, id, body = {}) {
  if (!this.requireToken(req, res)) {
    return;
  }

  try {
    const result =
      await this.service.deleteFront(
        id,
        body
      );

    MatrixController.json(
      res,
      200,
      result
    );

  } catch (error) {
    console.error(
      'Error eliminando frente:',
      error
    );

    MatrixController.json(
      res,
      error.status || 500,
      error.payload || {
        error: error.message
      }
    );
  }
}

async createAttribute(req, res, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.createAttribute(body);
    MatrixController.json(res, 201, row);
  } catch (error) {
    console.error('Error creando atributo:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async updateAttribute(req, res, id, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.updateAttribute(id, body);
    MatrixController.json(res, 200, row);
  } catch (error) {
    console.error('Error actualizando atributo:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async deleteAttribute(req, res, id, body = {}) {
  if (!this.requireToken(req, res)) return;

  try {
    const result = await this.service.deleteAttribute(
      id,
      body
    );

    MatrixController.json(res, 200, result);

  } catch (error) {
    console.error(
      'Error eliminando atributo:',
      error
    );

    MatrixController.json(
      res,
      error.status || 500,
      error.payload || {
        error: error.message
      }
    );
  }
}


async createSubReason(req, res, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.createSubReason(body);
    MatrixController.json(res, 201, row);
  } catch (error) {
    console.error('Error creando sub-motivo:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async updateSubReason(req, res, id, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.updateSubReason(id, body);
    MatrixController.json(res, 200, row);
  } catch (error) {
    console.error('Error actualizando sub-motivo:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async deleteSubReason(req, res, id, body = {}) {
  if (!this.requireToken(req, res)) return;

  try {
    const result = await this.service.deleteSubReason(
      id,
      body
    );

    MatrixController.json(res, 200, result);

  } catch (error) {
    console.error(
      'Error eliminando sub-motivo:',
      error
    );

    MatrixController.json(
      res,
      error.status || 500,
      error.payload || {
        error: error.message
      }
    );
  }
}


async freezeVersion(req, res, body) {
  if (!this.requireToken(req, res)) return;
  try {
    const result = await this.service.freezeVersion(body);
    MatrixController.json(res, 200, result);
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async createEmptyVersion(req, res, body) {
  if (!this.requireToken(req, res)) return;
  try {
    const result = await this.service.createEmptyVersion(body);
    MatrixController.json(res, 200, result);
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async activateVersion(req, res, id) {
  if (!this.requireToken(req, res)) return;
  try {
    const result = await this.service.activateVersion(id);
    // Contrato legacy: { success: true }
    MatrixController.json(res, 200, { success: result.success });
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async validateVersionIntegrity(req, res, id) {
  if (!this.requireToken(req, res)) return;
  try {
    const result = await this.service.validateVersionIntegrity(id);
    MatrixController.json(res, 200, result);
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async validateFrontWeight(req, res, body) {
  if (!this.requireToken(req, res)) return;
  try {
    MatrixController.json(
      res, 200, await this.service.validateFrontWeight(body)
    );
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async validateAttributeWeight(req, res, body) {
  if (!this.requireToken(req, res)) return;
  try {
    MatrixController.json(
      res, 200, await this.service.validateAttributeWeight(body)
    );
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async validateSubReasonWeight(req, res, body) {
  if (!this.requireToken(req, res)) return;
  try {
    MatrixController.json(
      res, 200, await this.service.validateSubReasonWeight(body)
    );
  } catch (error) {
    MatrixController.json(
      res, error.status || 500,
      error.payload || { error: error.message }
    );
  }
}


async getActiveEvaluationStructure(
  req,
  res,
  query = {}
) {
  if (!this.requireToken(req, res)) {
    return;
  }

  try {
    const result =
      await this.service
        .getActiveEvaluationStructure(
          query
        );

    MatrixController.json(
      res,
      200,
      result
    );

  } catch (error) {
    console.error(
      'Error en /api/evaluacion/estructura:',
      error
    );

    MatrixController.json(
      res,
      error.status || 500,
      error.payload || {
        error: error.message
      }
    );
  }
}

async createEvaluationRule(req, res, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.createEvaluationRule(body);
    MatrixController.json(res, 201, row);
  } catch (error) {
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async updateEvaluationRule(req, res, id, body) {
  if (!this.requireToken(req, res)) return;

  try {
    const row = await this.service.updateEvaluationRule(id, body);
    MatrixController.json(res, 200, row);
  } catch (error) {
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

async deleteEvaluationRule(
  req,
  res,
  id,
  body = {}
) {
  if (!this.requireToken(req, res)) return;

  try {
    const result =
      await this.service.deleteEvaluationRule(
        id,
        body
      );

    MatrixController.json(
      res,
      200,
      result
    );

  } catch (error) {
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || {
        error: error.message
      }
    );
  }
}

}

module.exports = MatrixController;
