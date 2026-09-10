const test = require('node:test');
const assert = require('node:assert/strict');

const AnalyticsService =
  require('../src/modules/analytics/analytics.service');


test('ANASVC-A1-001 sin filtros devuelve contrato neutral', () => {
  assert.deepEqual(
    AnalyticsService.normalizeFilters({}),
    {
      fechaDesde: null,
      fechaHasta: null,
      quiebreId: null,

      campana: {
        modo: 'TODAS',
        id: null
      },

      matrizId: null,
      lider: null,
      gestor: null,
      auditor: null
    }
  );
});


test('ANASVC-A1-002 normaliza filtros multidominio completos', () => {
  assert.deepEqual(
    AnalyticsService.normalizeFilters({
      fecha_desde: '2026-09-01',
      fecha_hasta: '2026-09-30',
      quiebre_id: '1',
      campana_id: '3',
      matriz_id: '2',
      lider: ' Lider A ',
      gestor: ' Gestor B ',
      auditor: ' Auditor C '
    }),
    {
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-30',
      quiebreId: 1,

      campana: {
        modo: 'ESPECIFICA',
        id: 3
      },

      matrizId: 2,
      lider: 'Lider A',
      gestor: 'Gestor B',
      auditor: 'Auditor C'
    }
  );
});


test('ANASVC-A1-003 soporta escenario directo sin campaña', () => {
  assert.deepEqual(
    AnalyticsService.normalizeFilters({
      quiebre_id: '1',
      sin_campana: 'true'
    }),
    {
      fechaDesde: null,
      fechaHasta: null,
      quiebreId: 1,

      campana: {
        modo: 'SIN_CAMPANA',
        id: null
      },

      matrizId: null,
      lider: null,
      gestor: null,
      auditor: null
    }
  );
});


test('ANASVC-A1-004 campaña específica y sin campaña son incompatibles', () => {
  assert.throws(
    () =>
      AnalyticsService.normalizeFilters({
        campana_id: '2',
        sin_campana: 'true'
      }),
    error => {
      assert.equal(error.status, 400);

      assert.equal(
        error.code,
        'ANALYTICS_CAMPAIGN_FILTER_CONFLICT'
      );

      return true;
    }
  );
});


test('ANASVC-A1-005 rechaza ids inválidos', () => {
  assert.throws(
    () =>
      AnalyticsService.normalizeFilters({
        quiebre_id: 'abc'
      }),
    error => {
      assert.equal(error.status, 400);

      assert.match(
        error.message,
        /quiebre_id debe ser un entero positivo/
      );

      return true;
    }
  );
});


test('ANASVC-A1-006 rechaza fecha inválida', () => {
  assert.throws(
    () =>
      AnalyticsService.normalizeFilters({
        fecha_desde: '2026-02-31'
      }),
    error => {
      assert.equal(error.status, 400);

      assert.match(
        error.message,
        /fecha_desde contiene una fecha inválida/
      );

      return true;
    }
  );
});


test('ANASVC-A1-007 rechaza rango de fechas invertido', () => {
  assert.throws(
    () =>
      AnalyticsService.normalizeFilters({
        fecha_desde: '2026-09-30',
        fecha_hasta: '2026-09-01'
      }),
    error => {
      assert.equal(error.status, 400);

      assert.equal(
        error.code,
        'ANALYTICS_DATE_RANGE_INVALID'
      );

      return true;
    }
  );
});


test('ANASVC-A1-008 acepta aliases camelCase', () => {
  const filtros =
    AnalyticsService.normalizeFilters({
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-02',
      quiebreId: 1,
      campanaId: 2,
      matrizId: 3
    });

  assert.equal(filtros.fechaDesde, '2026-09-01');
  assert.equal(filtros.fechaHasta, '2026-09-02');
  assert.equal(filtros.quiebreId, 1);
  assert.equal(filtros.campana.modo, 'ESPECIFICA');
  assert.equal(filtros.campana.id, 2);
  assert.equal(filtros.matrizId, 3);
});

test(
  'ANASVC-A1-009 getPopulation normaliza y delega al repository',
  async () => {
    let receivedFilters;

    const repository = {
      async listPopulation(filters) {
        receivedFilters = filters;

        return [
          {
            id: 'E1',
            quiebre_id: '1'
          }
        ];
      }
    };

    const service =
      new AnalyticsService(repository);

    const result =
      await service.getPopulation({
        quiebre_id: '1',
        sin_campana: 'true'
      });

    assert.equal(
      receivedFilters.quiebreId,
      1
    );

    assert.equal(
      receivedFilters.campana.modo,
      'SIN_CAMPANA'
    );

    assert.equal(
      result.total,
      1
    );

    assert.deepEqual(
      result.data,
      [
        {
          id: 'E1',
          quiebre_id: '1'
        }
      ]
    );
  }
);


test(
  'ANASVC-A1-010 getPopulation propaga validación de filtros',
  async () => {
    let repositoryCalled = false;

    const repository = {
      async listPopulation() {
        repositoryCalled = true;
        return [];
      }
    };

    const service =
      new AnalyticsService(repository);

    await assert.rejects(
      service.getPopulation({
        campana_id: '2',
        sin_campana: 'true'
      }),
      error => {
        assert.equal(
          error.status,
          400
        );

        assert.equal(
          error.code,
          'ANALYTICS_CAMPAIGN_FILTER_CONFLICT'
        );

        return true;
      }
    );

    assert.equal(
      repositoryCalled,
      false
    );
  }
);

test(
  'ANASVC-A2-001 construye resumen ejecutivo y porcentajes por rango',
  async () => {
    const repository = {
      async getExecutiveSummary(filters) {
        assert.equal(
          filters.quiebreId,
          1
        );

        assert.equal(
          filters.campana.modo,
          'SIN_CAMPANA'
        );

        return {
          evaluaciones: 100,
          gestores: 20,
          auditores: 4,
          nota_promedio: '92.52',
          nota_minima: '0.00',
          nota_maxima: '100.00',
          total_enc: '10.00',
          total_ecuf: '20.00',
          total_ecn: '30.00'
        };
      },

      async listRangeDistribution(filters) {
        assert.equal(
          filters.quiebreId,
          1
        );

        return [
          {
            rango: 'Excelente',
            cantidad: 40
          },
          {
            rango: 'Bien',
            cantidad: 30
          },
          {
            rango: 'Regular',
            cantidad: 20
          },
          {
            rango: 'Bajo',
            cantidad: 10
          }
        ];
      }
    };

    const service =
      new AnalyticsService(repository);

    const result =
      await service.getExecutiveSummary({
        quiebre_id: '1',
        sin_campana: 'true'
      });

    assert.deepEqual(
      result.poblacion,
      {
        evaluaciones: 100,
        gestores: 20,
        auditores: 4
      }
    );

    assert.deepEqual(
      result.calidad,
      {
        notaPromedio: 92.52,
        notaMinima: 0,
        notaMaxima: 100
      }
    );

    assert.deepEqual(
      result.errores,
      {
        enc: 10,
        ecuf: 20,
        ecn: 30
      }
    );

    assert.deepEqual(
      result.rangos,
      [
        {
          rango: 'Excelente',
          cantidad: 40,
          porcentaje: 40
        },
        {
          rango: 'Bien',
          cantidad: 30,
          porcentaje: 30
        },
        {
          rango: 'Regular',
          cantidad: 20,
          porcentaje: 20
        },
        {
          rango: 'Bajo',
          cantidad: 10,
          porcentaje: 10
        }
      ]
    );
  }
);


test(
  'ANASVC-A2-002 maneja población vacía sin divisiones inválidas',
  async () => {
    const repository = {
      async getExecutiveSummary() {
        return {
          evaluaciones: 0,
          gestores: 0,
          auditores: 0,
          nota_promedio: null,
          nota_minima: null,
          nota_maxima: null,
          total_enc: 0,
          total_ecuf: 0,
          total_ecn: 0
        };
      },

      async listRangeDistribution() {
        return [];
      }
    };

    const service =
      new AnalyticsService(repository);

    const result =
      await service.getExecutiveSummary({});

    assert.equal(
      result.poblacion.evaluaciones,
      0
    );

    assert.equal(
      result.calidad.notaPromedio,
      null
    );

    assert.equal(
      result.calidad.notaMinima,
      null
    );

    assert.equal(
      result.calidad.notaMaxima,
      null
    );

    assert.deepEqual(
      result.rangos,
      []
    );
  }
);

test(
  'ANASVC-A3-001 construye catálogo analítico y separa sin campaña de sin contexto',
  async () => {
    const repository = {
      async listBreakDimensions() {
        return [
          {
            quiebre_id: '1',
            quiebre_codigo: 'COBRANZAS',
            quiebre_descripcion:
              'Actividad de gestión de cobranzas',
            evaluaciones: 2480
          },
          {
            quiebre_id: null,
            quiebre_codigo: null,
            quiebre_descripcion: null,
            evaluaciones: 1
          }
        ];
      },

      async listCampaignDimensions() {
        return [
          {
            quiebre_id: '1',
            campana_id: '1',
            campana_codigo: 'T',
            campana_descripcion:
              'Tempranas',
            evaluaciones: 887
          },
          {
            quiebre_id: '1',
            campana_id: null,
            campana_codigo: null,
            campana_descripcion: null,
            evaluaciones: 1
          },
          {
            quiebre_id: null,
            campana_id: null,
            campana_codigo: null,
            campana_descripcion: null,
            evaluaciones: 1
          }
        ];
      },

      async listMatrixDimensions() {
        return [
          {
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_COBRANZAS',
            evaluaciones: 394
          },
          {
            matriz_id: null,
            matriz_codigo: null,
            evaluaciones: 2087
          }
        ];
      },

      async listLeaderDimensions() {
        return [
          {
            lider: 'Jemmy Cantaro',
            evaluaciones: 100
          }
        ];
      },

      async listManagerDimensions() {
        return [
          {
            gestor: 'GESTOR TEST',
            evaluaciones: 50
          }
        ];
      },

      async listAuditorDimensions() {
        return [
          {
            auditor: 'AUDITOR TEST',
            evaluaciones: 2481
          }
        ];
      }
    };

    const service =
      new AnalyticsService(repository);

    const result =
      await service.getFilters({});

    assert.equal(
      result.quiebres.length,
      1
    );

    assert.deepEqual(
      result.quiebres[0],
      {
        id: 1,
        codigo: 'COBRANZAS',
        descripcion:
          'Actividad de gestión de cobranzas',
        evaluaciones: 2480
      }
    );

    assert.equal(
      result.campanas.length,
      1
    );

    assert.deepEqual(
      result.sinCampana,
      [
        {
          quiebreId: 1,
          evaluaciones: 1
        }
      ]
    );

    assert.deepEqual(
      result.calidadDatos,
      {
        sinContexto: 1
      }
    );

    assert.equal(
      result.matrices[0].id,
      1
    );

    assert.equal(
      result.lideres[0].nombre,
      'Jemmy Cantaro'
    );

    assert.equal(
      result.gestores[0].nombre,
      'GESTOR TEST'
    );

    assert.equal(
      result.auditores[0].nombre,
      'AUDITOR TEST'
    );

    assert.deepEqual(
      result.sinMatriz,
      {
        evaluaciones: 2087
      }
    );

    assert.equal(
      result.matrices.length,
      1
    );

    assert.equal(
      result.matrices[0].evaluaciones,
      394
    );
  }
);


test(
  'ANASVC-A3-002 filtros normalizados se envían a todas las dimensiones',
  async () => {
    const received = [];

    const repository = {
      async listBreakDimensions(filters) {
        received.push(filters);
        return [];
      },

      async listCampaignDimensions(filters) {
        received.push(filters);
        return [];
      },

      async listMatrixDimensions(filters) {
        received.push(filters);
        return [];
      },

      async listLeaderDimensions(filters) {
        received.push(filters);
        return [];
      },

      async listManagerDimensions(filters) {
        received.push(filters);
        return [];
      },

      async listAuditorDimensions(filters) {
        received.push(filters);
        return [];
      }
    };

    const service =
      new AnalyticsService(repository);

    const result =
      await service.getFilters({
        fecha_desde: '2026-09-01',
        fecha_hasta: '2026-09-30',
        quiebre_id: '1',
        sin_campana: 'true',
        matriz_id: '1',
        lider: 'Jemmy Cantaro'
      });

    assert.equal(
      received.length,
      6
    );

    for (const filters of received) {
      assert.equal(
        filters.fechaDesde,
        '2026-09-01'
      );

      assert.equal(
        filters.fechaHasta,
        '2026-09-30'
      );

      assert.equal(
        filters.quiebreId,
        1
      );

      assert.deepEqual(
        filters.campana,
        {
          modo: 'SIN_CAMPANA',
          id: null
        }
      );

      assert.equal(
        filters.matrizId,
        1
      );

      assert.equal(
        filters.lider,
        'Jemmy Cantaro'
      );
    }

    assert.deepEqual(
      result.calidadDatos,
      {
        sinContexto: 0
      }
    );

    assert.deepEqual(
      result.sinMatriz,
      {
        evaluaciones: 0
      }
    );
  }
);

test(
  'ANASVC-A4-001 construye evolución con métricas accionables',
  async () => {
    const repository = {
      async listEvolution(
        filters,
        granularity
      ) {
        assert.equal(
          granularity,
          'month'
        );

        assert.equal(
          filters.quiebreId,
          1
        );

        return [
          {
            periodo:
              '2026-08-01',

            evaluaciones: 100,
            nota_promedio: '90.00',
            gestores: 20,
            auditores: 4,

            excelente: 30,
            bien: 40,
            regular: 20,
            bajo: 10
          },
          {
            periodo:
              '2026-09-01',

            evaluaciones: 120,
            nota_promedio: '92.00',
            gestores: 22,
            auditores: 4,

            excelente: 40,
            bien: 44,
            regular: 24,
            bajo: 12
          }
        ];
      },
      async listEvolutionMatrixContext() {
        return [];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        quiebre_id: '1'
      });

    assert.equal(
      result.granularidad,
      'month'
    );

    assert.equal(
      result.serie.length,
      2
    );

    assert.equal(
      result.serie[0]
        .calidad.favorable,
      70
    );

    assert.equal(
      result.serie[0]
        .calidad.favorablePct,
      70
    );

    assert.equal(
      result.serie[0]
        .calidad.atencionPct,
      30
    );

    assert.equal(
      result.serie[1]
        .variacion.notaPp,
      2
    );

    assert.equal(
      result.serie[1]
        .variacion.volumenPct,
      20
    );

    assert.equal(
      result.comparacion
        .tendencia,
      'MEJORA'
    );
  }
);

test(
  'ANASVC-A4-002 clasifica tendencia estable',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo:
              '2026-08-01',
            evaluaciones: 100,
            nota_promedio: '92.00',
            gestores: 20,
            auditores: 3,
            excelente: 50,
            bien: 30,
            regular: 10,
            bajo: 10
          },
          {
            periodo:
              '2026-09-01',
            evaluaciones: 100,
            nota_promedio: '92.30',
            gestores: 20,
            auditores: 3,
            excelente: 50,
            bien: 30,
            regular: 10,
            bajo: 10
          }
        ];
      },
      async listEvolutionMatrixContext() {
        return [];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution();

    assert.equal(
      result.comparacion.tendencia,
      'ESTABLE'
    );

    assert.equal(
      result.comparacion
        .variacionNotaPp,
      0.3
    );

    assert.equal(
      result.comparacion
        .confiabilidad
        .ultimoPeriodoConMuestraInsuficiente,
      false
    );
  }
);

test(
  'ANASVC-A4-003 identifica deterioro',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo:
              '2026-08-01',
            evaluaciones: 100,
            nota_promedio: '94.00',
            gestores: 20,
            auditores: 3,
            excelente: 50,
            bien: 25,
            regular: 15,
            bajo: 10
          },
          {
            periodo:
              '2026-09-01',
            evaluaciones: 100,
            nota_promedio: '92.00',
            gestores: 20,
            auditores: 3,
            excelente: 40,
            bien: 25,
            regular: 20,
            bajo: 15
          }
        ];
      },
      async listEvolutionMatrixContext() {
        return [];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution();

    assert.equal(
      result.comparacion
        .tendencia,
      'DETERIORO'
    );

    assert.equal(
      result.comparacion
        .variacionNotaPp,
      -2
    );

    assert.equal(
      result.comparacion
        .atencionActualPct,
      35
    );

    assert.equal(
      result.comparacion
        .variacionAtencionPp,
      10
    );

    assert.equal(
      result.comparacion
        .confiabilidad
        .ultimoPeriodoConMuestraInsuficiente,
      false
    );
  }
);

test(
  'ANASVC-A4-004 rechaza granularidad inválida',
  async () => {
    let repositoryCalled = false;

    const repository = {
      async listEvolution() {
        repositoryCalled = true;
        return [];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    await assert.rejects(
      () =>
        service.getEvolution({
          granularidad:
            'quarter'
        }),
      error => {
        assert.equal(
          error.status,
          400
        );

        assert.equal(
          error.code,
          'ANALYTICS_GRANULARITY_INVALID'
        );

        return true;
      }
    );

    assert.equal(
      repositoryCalled,
      false
    );
  }
);

test(
  'ANASVC-A4-005 no usa periodos con muestra insuficiente para tendencia ejecutiva',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '90.00',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 30,
            regular: 20,
            bajo: 20
          },
          {
            periodo: '2026-07-01',
            evaluaciones: 80,
            nota_promedio: '91.00',
            gestores: 9,
            auditores: 2,
            excelente: 30,
            bien: 30,
            regular: 10,
            bajo: 10
          },
          {
            periodo: '2026-08-01',
            evaluaciones: 6,
            nota_promedio: '99.00',
            gestores: 6,
            auditores: 1,
            excelente: 6,
            bien: 0,
            regular: 0,
            bajo: 0
          },
          {
            periodo: '2026-09-01',
            evaluaciones: 3,
            nota_promedio: '50.00',
            gestores: 2,
            auditores: 1,
            excelente: 1,
            bien: 0,
            regular: 0,
            bajo: 2
          }
        ];
      },
      async listEvolutionMatrixContext() {
        return [];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution();

    assert.equal(
      result.serie[3]
        .muestra.suficiente,
      false
    );

    assert.equal(
      result.comparacion.periodoActual,
      '2026-07-01'
    );

    assert.equal(
      result.comparacion.periodoAnterior,
      '2026-06-01'
    );

    assert.equal(
      result.comparacion.variacionNotaPp,
      1
    );

    assert.equal(
      result.comparacion.tendencia,
      'MEJORA'
    );

    assert.equal(
      result.comparacion
        .confiabilidad
        .ultimoPeriodoConMuestraInsuficiente,
      true
    );

    assert.equal(
      result.comparacion
        .confiabilidad
        .evaluacionesUltimoPeriodo,
      3
    );
  }
);

test(
  'ANASVC-A4-006 detecta transición de versión dentro del período',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '90',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 40,
            regular: 20,
            bajo: 10
          }
        ];
      },

      async listEvolutionMatrixContext() {
        return [
          {
            periodo: '2026-06-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 40,
            nota_promedio: '92'
          },
          {
            periodo: '2026-06-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '2',
            version_matriz: 'v2',
            auditorias: 60,
            nota_promedio: '88'
          }
        ];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        granularidad: 'month'
      });

    assert.equal(
      result
        .serie[0]
        .contextoMatriz
        .estado,
      'TRANSICION_VERSION'
    );

    assert.equal(
      result
        .serie[0]
        .contextoMatriz
        .configuraciones
        .length,
      2
    );

    assert.equal(
      result
        .serie[0]
        .contextoMatriz
        .configuraciones[1]
        .porcentaje,
      60
    );
  }
);


test(
  'ANASVC-A4-007 detecta cambio de versión entre períodos',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-05-01',
            evaluaciones: 100,
            nota_promedio: '94',
            gestores: 10,
            auditores: 2,
            excelente: 50,
            bien: 30,
            regular: 15,
            bajo: 5
          },
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '88',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 30,
            regular: 25,
            bajo: 15
          }
        ];
      },

      async listEvolutionMatrixContext() {
        return [
          {
            periodo: '2026-05-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 100
          },
          {
            periodo: '2026-06-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '2',
            version_matriz: 'v2',
            auditorias: 100
          }
        ];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        granularidad: 'month'
      });

    const cambio =
      result
        .serie[1]
        .contextoMatriz
        .cambioRespectoAnterior;

    assert.equal(
      cambio.tipo,
      'CAMBIO_VERSION'
    );

    assert.equal(
      cambio.comparable,
      false
    );

    assert.equal(
      cambio.anterior.version,
      'v1'
    );

    assert.equal(
      cambio.actual.version,
      'v2'
    );
  }
);


test(
  'ANASVC-A4-008 detecta cambio de matriz entre períodos',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-05-01',
            evaluaciones: 100,
            nota_promedio: '94',
            gestores: 10,
            auditores: 2,
            excelente: 50,
            bien: 30,
            regular: 15,
            bajo: 5
          },
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '88',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 30,
            regular: 25,
            bajo: 15
          }
        ];
      },

      async listEvolutionMatrixContext() {
        return [
          {
            periodo: '2026-05-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 100
          },
          {
            periodo: '2026-06-01',
            matriz_id: '2',
            matriz_codigo:
              'MATRIZ_B',
            version_matriz_id: '3',
            version_matriz: 'v1',
            auditorias: 100
          }
        ];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        granularidad: 'month'
      });

    const cambio =
      result
        .serie[1]
        .contextoMatriz
        .cambioRespectoAnterior;

    assert.equal(
      cambio.tipo,
      'CAMBIO_MATRIZ'
    );

    assert.equal(
      cambio.comparable,
      false
    );

    assert.equal(
      cambio.anterior.matrizCodigo,
      'MATRIZ_A'
    );

    assert.equal(
      cambio.actual.matrizCodigo,
      'MATRIZ_B'
    );
  }
);

test(
  'ANASVC-A4-009 separa deterioro observado de cambio metodológico',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-05-01',
            evaluaciones: 100,
            nota_promedio: '95',
            gestores: 10,
            auditores: 2,
            excelente: 60,
            bien: 25,
            regular: 10,
            bajo: 5
          },
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '88',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 30,
            regular: 25,
            bajo: 15
          }
        ];
      },

      async listEvolutionMatrixContext() {
        return [
          {
            periodo: '2026-05-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 100
          },
          {
            periodo: '2026-06-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '2',
            version_matriz: 'v2',
            auditorias: 100
          }
        ];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        granularidad: 'month'
      });

    assert.equal(
      result.comparacion.tendencia,
      'DETERIORO'
    );

    assert.equal(
      result.comparacion
        .lecturaEjecutiva,
      'CAMBIO_METODOLOGICO'
    );

    assert.equal(
      result.comparacion
        .metodologia
        .comparable,
      false
    );

    assert.equal(
      result.comparacion
        .metodologia
        .estado,
      'CAMBIO_VERSION'
    );

    assert.equal(
      result.comparacion
        .metodologia
        .cambio
        .tipo,
      'CAMBIO_VERSION'
    );
  }
);

test(
  'ANASVC-A4-010 mantiene lectura directa con misma matriz y versión',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-05-01',
            evaluaciones: 100,
            nota_promedio: '90',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 40,
            regular: 20,
            bajo: 10
          },
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '92',
            gestores: 10,
            auditores: 2,
            excelente: 40,
            bien: 40,
            regular: 15,
            bajo: 5
          }
        ];
      },

      async listEvolutionMatrixContext() {
        return [
          {
            periodo: '2026-05-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 100
          },
          {
            periodo: '2026-06-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 100
          }
        ];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        granularidad: 'month'
      });

    assert.equal(
      result.comparacion.tendencia,
      'MEJORA'
    );

    assert.equal(
      result.comparacion
        .lecturaEjecutiva,
      'MEJORA'
    );

    assert.equal(
      result.comparacion
        .metodologia
        .comparable,
      true
    );

    assert.equal(
      result.comparacion
        .metodologia
        .estado,
      'COMPARABLE'
    );
  }
);

test(
  'ANASVC-A4-011 hereda advertencia cuando el periodo anterior tiene contexto parcial',
  async () => {
    const repository = {
      async listEvolution() {
        return [
          {
            periodo: '2026-06-01',
            evaluaciones: 100,
            nota_promedio: '89',
            gestores: 10,
            auditores: 2,
            excelente: 30,
            bien: 30,
            regular: 25,
            bajo: 15
          },
          {
            periodo: '2026-07-01',
            evaluaciones: 100,
            nota_promedio: '90',
            gestores: 10,
            auditores: 2,
            excelente: 35,
            bien: 35,
            regular: 20,
            bajo: 10
          }
        ];
      },

      async listEvolutionMatrixContext() {
        return [
          {
            periodo: '2026-06-01',
            matriz_id: null,
            matriz_codigo: null,
            version_matriz_id: null,
            version_matriz: null,
            auditorias: 80
          },
          {
            periodo: '2026-06-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 20
          },
          {
            periodo: '2026-07-01',
            matriz_id: '1',
            matriz_codigo:
              'MATRIZ_A',
            version_matriz_id: '1',
            version_matriz: 'v1',
            auditorias: 100
          }
        ];
      }
    };

    const service =
      new AnalyticsService(
        repository
      );

    const result =
      await service.getEvolution({
        granularidad: 'month'
      });


    assert.equal(
      result.serie[0]
        .contextoMatriz.estado,
      'CONTEXTO_PARCIAL'
    );

    assert.equal(
      result.serie[0]
        .comparabilidad.estado,
      'CONTEXTO_PARCIAL'
    );

    assert.equal(
      result.serie[1]
        .comparabilidad.estado,
      'COMPARABLE'
    );


    assert.equal(
      result.comparacion
        .tendencia,
      'MEJORA'
    );

    assert.equal(
      result.comparacion
        .lecturaEjecutiva,
      'CONTEXTO_PARCIAL'
    );

    assert.equal(
      result.comparacion
        .metodologia
        .comparable,
      false
    );

    assert.equal(
      result.comparacion
        .metodologia
        .estado,
      'COMPARABLE'
    );

    assert.equal(
      result.comparacion
        .metodologia
        .estadoAnterior,
      'CONTEXTO_PARCIAL'
    );
  }
);

test(
  'ANASVC-A5-001 construye diagnóstico y núcleo Pareto 80',
  async () => {
    const repository = {
      async listDiagnosticPareto() {
        return [
          {
            bloque: 'ECN',
            atributo: 'ATRIBUTO A',
            submotivo: 'CRITERIO A',

            registros: 1000,
            incumplimientos: 500,
            cumplimientos: 100,
            no_aplica: 100,
            sin_respuesta: 300,

            respuestas_aplicables_explicitas:
              600,

            respuestas_triestado:
              700,

            tasa_incumplimiento_explicita_pct:
              '83.33',

            cobertura_triestado_pct:
              '70.00',

            participacion_fallas_pct:
              '50.00',

            pareto_acumulado_pct:
              '50.00'
          },

          {
            bloque: 'ENC',
            atributo: 'ATRIBUTO B',
            submotivo: 'CRITERIO B',

            registros: 1000,
            incumplimientos: 300,
            cumplimientos: 300,
            no_aplica: 100,
            sin_respuesta: 300,

            respuestas_aplicables_explicitas:
              600,

            respuestas_triestado:
              700,

            tasa_incumplimiento_explicita_pct:
              '50.00',

            cobertura_triestado_pct:
              '70.00',

            participacion_fallas_pct:
              '30.00',

            pareto_acumulado_pct:
              '80.00'
          },

          {
            bloque: 'ECUF',
            atributo: 'ATRIBUTO C',
            submotivo: 'CRITERIO C',

            registros: 1000,
            incumplimientos: 200,
            cumplimientos: 400,
            no_aplica: 100,
            sin_respuesta: 300,

            respuestas_aplicables_explicitas:
              600,

            respuestas_triestado:
              700,

            tasa_incumplimiento_explicita_pct:
              '33.33',

            cobertura_triestado_pct:
              '70.00',

            participacion_fallas_pct:
              '20.00',

            pareto_acumulado_pct:
              '100.00'
          }
        ];
      }
    };


    const service =
      new AnalyticsService(
        repository
      );


    const result =
      await service.getDiagnostic({
        quiebre_id: 1
      });


    assert.equal(
      result.resumen
        .totalIncumplimientos,
      1000
    );


    assert.equal(
      result.resumen
        .criteriosConFalla,
      3
    );


    assert.equal(
      result.resumen
        .criteriosNucleoPareto80,
      2
    );


    assert.equal(
      result.resumen
        .participacionNucleoPareto80Pct,
      80
    );


    assert.equal(
      result.pareto.nucleo.length,
      2
    );


    assert.equal(
      result.pareto
        .nucleo[1]
        .criterio,
      'CRITERIO B'
    );


    assert.equal(
      result.calidadDatos
        .coberturaTriestadoPct,
      70
    );


    assert.equal(
      result.calidadDatos
        .historialParcial,
      true
    );


    assert.equal(
      result.frentes[0]
        .frente,
      'ECN'
    );


    assert.equal(
      result.frentes[0]
        .participacionFallasPct,
      50
    );


    assert.equal(
      result.atributos[0]
        .atributo,
      'ATRIBUTO A'
    );
  }
);

test(
  'A6-001 concentración separa operación y auditoría',
  async () => {
    const repository = {
      listConcentration: async () => [
        {
          lider: 'LIDER A',
          gestor: 'GESTOR 1',
          auditor: 'AUDITOR X',
          evaluaciones: 10,
          incumplimientos: 30
        },
        {
          lider: 'LIDER A',
          gestor: 'GESTOR 2',
          auditor: 'AUDITOR Y',
          evaluaciones: 8,
          incumplimientos: 20
        },
        {
          lider: 'LIDER B',
          gestor: 'GESTOR 3',
          auditor: 'AUDITOR X',
          evaluaciones: 6,
          incumplimientos: 10
        }
      ]
    };

    const AnalyticsService =
      require(
        '../src/modules/analytics/analytics.service'
      );

    const service =
      new AnalyticsService(repository);

    const resultado =
      await service.getConcentration({});

    assert.equal(
      resultado.operacion.lideres.length,
      2
    );

    assert.equal(
      resultado.operacion.lideres[0].lider,
      'LIDER A'
    );

    assert.equal(
      resultado.operacion.lideres[0]
        .incumplimientos,
      50
    );

    assert.equal(
      resultado.operacion.lideres[0]
        .gestores.length,
      2
    );

    assert.equal(
      resultado.auditoria.auditores.length,
      2
    );

    const auditorX =
      resultado.auditoria.auditores.find(
        item =>
          item.auditor === 'AUDITOR X'
      );

    assert.ok(auditorX);

    assert.equal(
      auditorX.incumplimientos,
      40
    );

    /*
     * El auditor NO debe estar anidado
     * dentro del gestor.
     */
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        resultado.operacion.lideres[0]
          .gestores[0],
        'auditores'
      ),
      false
    );
  }
);

test(
  'A7-001 detalle de hallazgo conecta criterio con evaluaciones y contexto de llamada',
  async () => {
    const repository = {
      async listFindingEvaluations() {
        return [
          {
            evaluacion_id: 1001,
            fecha: '2026-09-01',
            ticket_psi: 'TICKET-001',

            gestor: 'GESTOR 1',
            lider: 'LIDER A',
            auditor: 'AUDITOR X',

            nota_final: 82,
            rango: 'Bien',

            campana_id: 1,
            quiebre_id: 1,
            matriz_id: 1,
            version_matriz_id: 7,

            frente: 'ECN',
            atributo: 'TIPIFICACION',
            criterio:
              'Tipificacion_correcta',

            valor_respuesta: '0',

            /*
             * --------------------------------------------
             * CONTEXTO LEGACY DE LA LLAMADA
             * asignaciones_escucha
             * --------------------------------------------
             */
            asignacion_id: 9001,

            estado_escucha:
              'gestionado',

            fecha_asignacion:
              '2026-09-01T10:00:00',

            fecha_gestion:
              '2026-09-01T11:00:00',

            peticion:
              'PETICION A',

            motivo_call:
              'MOTIVO CALL A',

            motivos_escucha:
              'MOTIVO OPERATIVO',

            submotivos_escucha:
              'SUBMOTIVO OPERATIVO'
          },

          {
            evaluacion_id: 1002,
            fecha: '2026-09-02',
            ticket_psi: 'TICKET-002',

            gestor: 'GESTOR 2',
            lider: 'LIDER A',
            auditor: 'AUDITOR Y',

            nota_final: 75,
            rango: 'Regular',

            campana_id: 1,
            quiebre_id: 1,
            matriz_id: 1,
            version_matriz_id: 7,

            frente: 'ECN',
            atributo: 'TIPIFICACION',
            criterio:
              'Tipificacion_correcta',

            valor_respuesta: '0',

            /*
             * --------------------------------------------
             * CONTEXTO LEGACY DE LA LLAMADA
             * asignaciones_escucha
             * --------------------------------------------
             */
            asignacion_id: 9002,

            estado_escucha:
              'gestionado',

            fecha_asignacion:
              '2026-09-02T10:00:00',

            fecha_gestion:
              '2026-09-02T11:00:00',

            peticion:
              'PETICION B',

            motivo_call:
              'MOTIVO CALL B',

            motivos_escucha:
              'MOTIVO B',

            submotivos_escucha:
              'SUBMOTIVO B'
          }
        ];
      }
    };


    const service =
      new AnalyticsService(
        repository
      );


    const resultado =
      await service.getFindingDetail({
        frente: 'ECN',

        atributo:
          'TIPIFICACION',

        criterio:
          'Tipificacion_correcta'
      });


    /*
     * ============================================
     * HALLAZGO
     * ============================================
     */

    assert.equal(
      resultado.hallazgo.frente,
      'ECN'
    );

    assert.equal(
      resultado.hallazgo.atributo,
      'TIPIFICACION'
    );

    assert.equal(
      resultado.hallazgo.criterio,
      'Tipificacion_correcta'
    );


    /*
     * ============================================
     * RESUMEN
     * ============================================
     */

    assert.equal(
      resultado.resumen.evaluaciones,
      2
    );

    assert.equal(
      resultado.evaluaciones.length,
      2
    );


    /*
     * ============================================
     * PRIMERA EVALUACIÓN
     * ============================================
     */

    const primera =
      resultado.evaluaciones[0];


    assert.equal(
      primera.id,
      1001
    );

    assert.equal(
      primera.ticketPsi,
      'TICKET-001'
    );

    assert.equal(
      primera.gestor,
      'GESTOR 1'
    );

    assert.equal(
      primera.lider,
      'LIDER A'
    );

    assert.equal(
      primera.auditor,
      'AUDITOR X'
    );

    assert.equal(
      primera.notaFinal,
      82
    );

    assert.equal(
      primera.rango,
      'Bien'
    );


    /*
     * ============================================
     * CONTEXTO DE DOMINIO
     * ============================================
     */

    assert.equal(
      primera.campanaId,
      1
    );

    assert.equal(
      primera.quiebreId,
      1
    );

    assert.equal(
      primera.matrizId,
      1
    );

    assert.equal(
      primera.versionMatrizId,
      7
    );


    /*
     * ============================================
     * EVIDENCIA DEL HALLAZGO
     * ============================================
     */

    assert.equal(
      primera.evidencia.frente,
      'ECN'
    );

    assert.equal(
      primera.evidencia.atributo,
      'TIPIFICACION'
    );

    assert.equal(
      primera.evidencia.criterio,
      'Tipificacion_correcta'
    );

    assert.equal(
      primera.evidencia
        .valorRespuesta,
      '0'
    );


    /*
     * ============================================
     * CONTEXTO DE LLAMADA
     * ============================================
     *
     * Estos campos provienen temporalmente de
     * asignaciones_escucha.
     *
     * Analytics no debe depender de audio,
     * transcripción ni Python para este contrato.
     * ============================================
     */

    assert.ok(
      primera.contextoLlamada
    );

    assert.equal(
      primera.contextoLlamada
        .asignacionId,
      9001
    );

    assert.equal(
      primera.contextoLlamada
        .estado,
      'gestionado'
    );

    assert.equal(
      primera.contextoLlamada
        .fechaAsignacion,
      '2026-09-01T10:00:00'
    );

    assert.equal(
      primera.contextoLlamada
        .fechaGestion,
      '2026-09-01T11:00:00'
    );

    assert.equal(
      primera.contextoLlamada
        .peticion,
      'PETICION A'
    );

    assert.equal(
      primera.contextoLlamada
        .motivoCall,
      'MOTIVO CALL A'
    );

    assert.equal(
      primera.contextoLlamada
        .motivos,
      'MOTIVO OPERATIVO'
    );

    assert.equal(
      primera.contextoLlamada
        .submotivos,
      'SUBMOTIVO OPERATIVO'
    );


    /*
     * ============================================
     * SEGUNDA EVALUACIÓN
     * ============================================
     */

    const segunda =
      resultado.evaluaciones[1];


    assert.equal(
      segunda.id,
      1002
    );

    assert.equal(
      segunda.ticketPsi,
      'TICKET-002'
    );

    assert.equal(
      segunda.contextoLlamada
        .asignacionId,
      9002
    );

    assert.equal(
      segunda.contextoLlamada
        .peticion,
      'PETICION B'
    );

    assert.equal(
      segunda.contextoLlamada
        .motivoCall,
      'MOTIVO CALL B'
    );
  }
);