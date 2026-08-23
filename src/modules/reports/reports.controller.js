class ReportsController {
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
      ReportsController.json(res, 401, { error: 'Token requerido' });
      return false;
    }
    return true;
  }

  async getKpis(req, res) {
    try {
      ReportsController.json(res, 200, await this.service.getKpis());
    } catch (error) {
      console.error('Error en kpis:', error);
      ReportsController.json(res, 500, { error: error.message });
    }
  }

  async getRanking(req, res) {
    try {
      ReportsController.json(res, 200, await this.service.getRanking());
    } catch (error) {
      console.error('Error en ranking:', error);
      ReportsController.json(res, 500, { error: error.message });
    }
  }

  async getAvailableMonths(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const meses = await this.service.getAvailableMonths();
      console.log(`✅ ${meses.length} meses disponibles únicos`);
      ReportsController.json(res, 200, meses);
    } catch (error) {
      console.error('❌ Error en meses-disponibles:', error);
      // Contrato legacy: error interno -> 200 + []
      ReportsController.json(res, 200, []);
    }
  }

  async getEvolution(req, res, query = {}) {
    try {
      const periodo = query.periodo || 'dia';
      ReportsController.json(
        res,
        200,
        await this.service.getEvolution(periodo)
      );
    } catch (error) {
      console.error('Error en evolutivo:', error);
      ReportsController.json(res, 500, { error: error.message });
    }
  }

  async getTopFailures(req, res) {
    try {
      ReportsController.json(res, 200, await this.service.getTopFailures());
    } catch (error) {
      console.error('Error en top-fallas:', error);
      ReportsController.json(res, 500, { error: error.message });
    }
  }

  async getAuditorErrors(req, res, query = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      const { periodo, auditor } = query;

      const result = await this.service.getAuditorErrors({
        periodo,
        auditor
      });

      console.log(`✅ Auditores con errores: ${result.auditores.length}`);
      console.log(`   Fechas únicas: ${result.fechasOrdenadas.length}`);

      ReportsController.json(res, 200, result);
    } catch (error) {
      console.error('❌ Error:', error);
      ReportsController.json(res, 500, {
        success: false,
        error: error.message,
        erroresPorAuditorPorFecha: {},
        fechasOrdenadas: [],
        auditores: [],
        detallesPorAuditorPorFecha: {}
      });
    }
  }

  async getEvaluationsWithDetails(req, res) {
    try {
      ReportsController.json(
        res,
        200,
        await this.service.getEvaluationsWithDetails()
      );
    } catch (error) {
      console.error('Error en evaluaciones-con-detalles:', error);
      ReportsController.json(res, 500, { error: error.message });
    }
  }

  async getLeaders(req, res) {
    try {
      ReportsController.json(res, 200, await this.service.getLeaders());
    } catch (error) {
      console.error('Error en lideres:', error);
      ReportsController.json(res, 500, { error: error.message });
    }
  }

  async getSummaryByLeader(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      ReportsController.json(
        res,
        200,
        await this.service.getSummaryByLeader()
      );
    } catch (error) {
      console.error('❌ Error:', error);
      ReportsController.json(res, 500, []);
    }
  }

  async getSummaryByLocation(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      ReportsController.json(
        res,
        200,
        await this.service.getSummaryByLocation()
      );
    } catch (error) {
      console.error('❌ Error:', error);
      ReportsController.json(res, 500, []);
    }
  }

  async getSummaryByLocality(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      ReportsController.json(
        res,
        200,
        await this.service.getSummaryByLocality()
      );
    } catch (error) {
      console.error('❌ Error:', error);
      ReportsController.json(res, 500, []);
    }
  }
}

module.exports = ReportsController;
