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

  async evaluationActiveVersion(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const versionActiva = await this.service.getEvaluationActiveVersion();

      if (versionActiva.version !== 'default') {
        console.log(`✅ Versión activa: ${versionActiva.version}`);
      }

      MatrixController.json(res, 200, versionActiva);
    } catch (error) {
      console.error('❌ Error en /api/evaluacion/version-activa:', error);
      MatrixController.json(res, 500, { error: error.message });
    }
  }

  async activeVersion(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const versionActiva = await this.service.getActiveVersion();

      if (!versionActiva) {
        MatrixController.json(res, 404, { error: 'No hay versión activa' });
        return;
      }

      MatrixController.json(res, 200, versionActiva);
    } catch (error) {
      console.error('Error en /api/matriz/versiones/activa:', error);
      MatrixController.json(res, 500, { error: error.message });
    }
  }

  async versionByDate(req, res, query = {}) {
    if (!this.requireToken(req, res)) return;

    const { fecha } = query;

    if (!fecha) {
      MatrixController.json(res, 400, { error: 'Fecha requerida' });
      return;
    }

    try {
      const version = await this.service.getVersionByDate(fecha);

      if (!version) {
        MatrixController.json(res, 404, { error: 'No hay versión para esta fecha' });
        return;
      }

      MatrixController.json(res, 200, version);
    } catch (error) {
      console.error('Error en /api/matriz/versiones/por-fecha:', error);
      MatrixController.json(res, 500, { error: error.message });
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

  async listVersions(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const versiones = await this.service.listVersions();
      MatrixController.json(res, 200, versiones);
    } catch (error) {
      console.error('Error en /api/matriz/versiones:', error);
      MatrixController.json(res, 500, { error: error.message });
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

async listFrentes(req, res) {
  if (!this.requireToken(req, res)) return;

  try {
    const rows = await this.service.listFrentes();
    MatrixController.json(res, 200, rows);
  } catch (error) {
    console.error('Error:', error);
    MatrixController.json(res, 500, { error: error.message });
  }
}

async listAtributos(req, res, query = {}) {
  if (!this.requireToken(req, res)) return;

  try {
    const rows = await this.service.listAtributos(query.frente_id || null);
    MatrixController.json(res, 200, rows);
  } catch (error) {
    console.error('Error:', error);
    MatrixController.json(res, 500, { error: error.message });
  }
}

async listSubMotivos(req, res, query = {}) {
  if (!this.requireToken(req, res)) return;

  try {
    const rows = await this.service.listSubMotivos(query.atributo_id || null);
    MatrixController.json(res, 200, rows);
  } catch (error) {
    console.error('Error:', error);
    MatrixController.json(res, 500, { error: error.message });
  }
}

async listEvaluationRulesAdmin(req, res) {
  if (!this.requireToken(req, res)) return;

  try {
    const rows = await this.service.listEvaluationRulesAdmin();
    MatrixController.json(res, 200, rows);
  } catch (error) {
    console.error('Error:', error);

    // Contrato legacy real:
    // error interno -> HTTP 500, pero body [].
    MatrixController.json(res, 500, []);
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

async deleteFront(req, res, id) {
  if (!this.requireToken(req, res)) return;

  try {
    const result = await this.service.deleteFront(id);
    MatrixController.json(res, 200, result);
  } catch (error) {
    console.error('Error eliminando frente:', error);
    MatrixController.json(
      res,
      error.status || 500,
      error.payload || { error: error.message }
    );
  }
}

}

module.exports = MatrixController;
