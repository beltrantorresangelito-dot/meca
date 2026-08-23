class AgentsController {
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
      AgentsController.json(res, 401, { error: 'Token requerido' });
      return false;
    }
    return true;
  }

  async list(req, res, query = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      const { lider, ubicacion, localidad } = query;

      const agentes = await this.service.list({
        lider,
        ubicacion,
        localidad
      });

      console.log(`   ✅ ${agentes.length} agentes encontrados`);

      AgentsController.json(res, 200, agentes);
    } catch (error) {
      console.error('❌ Error en agentes:', error);
      AgentsController.json(res, 500, { error: error.message });
    }
  }

  async update(req, res, id, body) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.update(id, body);

      console.log(`✅ Agente ID ${id} actualizado`);

      AgentsController.json(res, 200, result);
    } catch (error) {
      console.error('Error actualizando agente:', error);
      AgentsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async delete(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.delete(id);

      console.log(`✅ Agente ID ${id} eliminado`);

      AgentsController.json(res, 200, result);
    } catch (error) {
      console.error('Error eliminando agente:', error);
      AgentsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async getById(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      AgentsController.json(
        res,
        200,
        await this.service.getById(id)
      );
    } catch (error) {
      AgentsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async categories(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const categorias = await this.service.listCategories();

      console.log(`✅ ${categorias.length} categorías encontradas`);

      AgentsController.json(res, 200, categorias);
    } catch (error) {
      console.error('❌ Error en categorias:', error);
      AgentsController.json(res, 500, []);
    }
  }

  async complete(req, res) {
    // Contrato legacy deliberado:
    // este handler NO hace requireToken local.
    try {
      AgentsController.json(
        res,
        200,
        await this.service.listComplete()
      );
    } catch (error) {
      console.error('Error en agentes completo:', error);
      AgentsController.json(res, 500, { error: error.message });
    }
  }

  async exportCsv(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const csvContent = await this.service.exportCsv();

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          `attachment; filename="agentes_${new Date().toISOString().slice(0, 10)}.csv"`
      });

      res.end(csvContent);
    } catch (error) {
      console.error('❌ Error exportando agentes:', error);
      AgentsController.json(res, 500, { error: error.message });
    }
  }
}

module.exports = AgentsController;
