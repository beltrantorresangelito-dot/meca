class ReportsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getKpis() {
    return this.repository.listEvaluationsDesc();
  }

  async getRanking() {
    return this.repository.listEvaluationsDesc();
  }

  async getAvailableMonths() {
    const rows = await this.repository.listEvaluationDates();

    const mesesMap = new Map();
    const mesesNombres = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    for (const row of rows) {
      const fechaStr = row.fecha_formateada;

      if (fechaStr && fechaStr.includes('/')) {
        const partes = fechaStr.split('/');

        if (partes.length >= 3) {
          const mes = parseInt(partes[1]);
          const anio = parseInt(partes[2]);

          if (
            !Number.isNaN(anio) &&
            !Number.isNaN(mes) &&
            mes >= 1 &&
            mes <= 12
          ) {
            const key = `${anio}-${mes.toString().padStart(2, '0')}`;

            if (!mesesMap.has(key)) {
              mesesMap.set(key, {
                anio,
                mes,
                valor: key,
                label: `${mesesNombres[mes - 1]} ${anio}`
              });
            }
          }
        }
      }
    }

    return Array.from(mesesMap.values()).sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.mes - a.mes;
    });
  }

  async getEvolution(periodo = 'dia') {
    // Contrato legacy: periodo existe pero todavía no modifica el dataset.
    void periodo;
    return this.repository.listEvaluationsAsc();
  }

  async getTopFailures() {
    return this.repository.listFailedDetails();
  }

  static normalizeDate(fechaStr) {
    if (!fechaStr) return null;

    const fechaLimpia = fechaStr.split(' ')[0];

    if (fechaLimpia.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return fechaLimpia;
    }

    if (fechaLimpia.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fechaLimpia.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    return fechaLimpia;
  }

  async getAuditorErrors({ periodo, auditor } = {}) {
    const rows = await this.repository.listAuditorErrors({
      periodo,
      auditor
    });

    const erroresPorAuditorPorFecha = {};
    const detallesPorAuditorPorFecha = {};
    const fechasSet = new Set();
    const auditoresSet = new Set();

    for (const row of rows) {
      const evaluador = row.evaluador;
      const fechaRaw = row.fecha_formateada || '';
      const fecha = ReportsService.normalizeDate(fechaRaw);

      if (!evaluador || !fecha) continue;

      auditoresSet.add(evaluador);
      fechasSet.add(fecha);

      if (!erroresPorAuditorPorFecha[evaluador]) {
        erroresPorAuditorPorFecha[evaluador] = {};
      }

      if (!erroresPorAuditorPorFecha[evaluador][fecha]) {
        erroresPorAuditorPorFecha[evaluador][fecha] = 0;
      }

      erroresPorAuditorPorFecha[evaluador][fecha]++;

      if (!detallesPorAuditorPorFecha[evaluador]) {
        detallesPorAuditorPorFecha[evaluador] = {};
      }

      if (!detallesPorAuditorPorFecha[evaluador][fecha]) {
        detallesPorAuditorPorFecha[evaluador][fecha] = [];
      }

      detallesPorAuditorPorFecha[evaluador][fecha].push({
        agente: row.agente || 'Sin agente',
        bloque: row.bloque || 'Sin bloque',
        atributo: row.atributo || 'Sin atributo',
        submotivo: row.submotivo || 'Sin submotivo',
        peso: parseFloat(row.peso) || 0,
        detalle_id: row.detalle_id
      });
    }

    const fechasOrdenadas = Array.from(fechasSet).sort((a, b) => {
      const [diaA, mesA, anioA] = a.split('/');
      const [diaB, mesB, anioB] = b.split('/');

      return (
        new Date(anioA, mesA - 1, diaA) -
        new Date(anioB, mesB - 1, diaB)
      );
    });

    const auditoresLista = Array.from(auditoresSet).sort();
    const auditoresConNombre = [];

    for (const usuario of auditoresLista) {
      let nombreCompleto = usuario;

      try {
        const nombre = await this.repository.getUserFullName(usuario);
        if (nombre) nombreCompleto = nombre;
      } catch (_) {
        // Contrato legacy: fallo al resolver nombre no invalida el reporte.
      }

      auditoresConNombre.push({
        usuario,
        nombre: nombreCompleto
      });
    }

    return {
      success: true,
      erroresPorAuditorPorFecha,
      fechasOrdenadas,
      auditores: auditoresConNombre,
      detallesPorAuditorPorFecha
    };
  }

  async getEvaluationsWithDetails() {
    const evaluaciones = await this.repository.listEvaluationsDesc();

    // Se preserva N+1 legacy deliberadamente en F3.3.
    for (const ev of evaluaciones) {
      ev.detalles_evaluacion =
        await this.repository.listEvaluationDetails(ev.id);
    }

    return evaluaciones;
  }

  async getLeaders() {
    const rows = await this.repository.listLeaders();
    return rows.map(row => row.lider_2026);
  }

  static mapSummaryRows(rows) {
    return rows.map(row => ({
      nombre: row.nombre,
      totalAgentes: parseInt(row.total_agentes),
      totalEval: parseInt(row.total_eval),
      promedioGeneral: parseFloat(row.promedio_general),
      promedioENC: parseFloat(row.promedio_enc),
      promedioECUF: parseFloat(row.promedio_ecuf),
      promedioECN: parseFloat(row.promedio_ecn),
      pctQuiebres: parseFloat(row.pct_quiebres) || 0,
      gestoresQ4: parseInt(row.gestores_q4) || 0,
      pctQ4: parseFloat(row.pct_q4) || 0
    }));
  }

  async getSummaryByLeader() {
    return ReportsService.mapSummaryRows(
      await this.repository.summaryByLeader()
    );
  }

  async getSummaryByLocation() {
    return ReportsService.mapSummaryRows(
      await this.repository.summaryByLocation()
    );
  }

  async getSummaryByLocality() {
    return ReportsService.mapSummaryRows(
      await this.repository.summaryByLocality()
    );
  }
}

module.exports = ReportsService;
