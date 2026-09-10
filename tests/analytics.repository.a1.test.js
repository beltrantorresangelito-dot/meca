const test = require('node:test');
const assert = require('node:assert/strict');

const AnalyticsRepository =
  require('../src/modules/analytics/analytics.repository');


test('ANAREPO-A1-001 sin filtros no genera WHERE', () => {
  const result =
    AnalyticsRepository
      .buildPopulationFilter({
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
      });

  assert.equal(result.sql, '');
  assert.deepEqual(result.params, []);
});


test('ANAREPO-A1-002 filtra quiebre usando dimensión efectiva', () => {
  const result =
    AnalyticsRepository
      .buildPopulationFilter({
        quiebreId: 1,

        campana: {
          modo: 'TODAS',
          id: null
        }
      });

  assert.match(
    result.sql,
    /COALESCE\(e\.quiebre_id, c\.quiebre_id\) = \$1/
  );

  assert.deepEqual(
    result.params,
    [1]
  );
});


test('ANAREPO-A1-003 filtra campaña específica', () => {
  const result =
    AnalyticsRepository
      .buildPopulationFilter({
        quiebreId: null,

        campana: {
          modo: 'ESPECIFICA',
          id: 3
        }
      });

  assert.match(
    result.sql,
    /e\.campana_id = \$1/
  );

  assert.deepEqual(
    result.params,
    [3]
  );
});


test('ANAREPO-A1-004 filtra evaluaciones sin campaña', () => {
  const result =
    AnalyticsRepository
      .buildPopulationFilter({
        quiebreId: 1,

        campana: {
          modo: 'SIN_CAMPANA',
          id: null
        }
      });

  assert.match(
    result.sql,
    /COALESCE\(e\.quiebre_id, c\.quiebre_id\) = \$1/
  );

  assert.match(
    result.sql,
    /e\.campana_id IS NULL/
  );

  assert.deepEqual(
    result.params,
    [1]
  );
});


test('ANAREPO-A1-005 parametriza rango y dimensiones', () => {
  const result =
    AnalyticsRepository
      .buildPopulationFilter({
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
        quiebreId: 1,

        campana: {
          modo: 'ESPECIFICA',
          id: 2
        },

        matrizId: 7,
        lider: 'Lider A',
        gestor: 'Gestor B',
        auditor: 'Auditor C'
      });

  assert.match(
    result.sql,
    /e\.fecha::date >= \$1::date/
  );

  assert.match(
    result.sql,
    /e\.fecha::date <= \$2::date/
  );

  assert.match(
    result.sql,
    /COALESCE\(e\.quiebre_id, c\.quiebre_id\) = \$3/
  );

  assert.match(
    result.sql,
    /e\.campana_id = \$4/
  );

  assert.match(
    result.sql,
    /e\.matriz_id = \$5/
  );

  assert.match(
    result.sql,
    /a\.lider_2026 = \$6/
  );

  assert.match(
    result.sql,
    /e\.agente = \$7/
  );

  assert.match(
    result.sql,
    /e\.evaluador = \$8/
  );

  assert.deepEqual(
    result.params,
    [
      '2026-09-01',
      '2026-09-30',
      1,
      2,
      7,
      'Lider A',
      'Gestor B',
      'Auditor C'
    ]
  );
});


test('ANAREPO-A1-006 listPopulation usa SQL parametrizado', async () => {
  let capturedSql;
  let capturedParams;

  const db = {
    async query(sql, params) {
      capturedSql =
        String(sql);

      capturedParams =
        params;

      return {
        rows: [
          {
            id: 'E1',
            quiebre_id: '1'
          }
        ]
      };
    }
  };

  const repo =
    new AnalyticsRepository(db);

  const result =
    await repo.listPopulation({
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
    });

  assert.match(
    capturedSql,
    /LEFT JOIN campanas c/
  );

  assert.match(
    capturedSql,
    /LEFT JOIN agentes a/
  );

  assert.match(
    capturedSql,
    /COALESCE\(\s*e\.quiebre_id,\s*c\.quiebre_id\s*\)\s+AS quiebre_id/
  );

  assert.match(
    capturedSql,
    /e\.campana_id IS NULL/
  );

  assert.deepEqual(
    capturedParams,
    [1]
  );

  assert.deepEqual(
    result,
    [
      {
        id: 'E1',
        quiebre_id: '1'
      }
    ]
  );
});

test(
  'ANAREPO-A2-001 resumen ejecutivo reutiliza población analítica',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              evaluaciones: 10,
              gestores: 4,
              auditores: 2,
              nota_promedio: '91.50'
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.getExecutiveSummary({
        quiebreId: 1,

        campana: {
          modo: 'SIN_CAMPANA',
          id: null
        },

        matrizId: null,
        lider: null,
        gestor: null,
        auditor: null,
        fechaDesde: null,
        fechaHasta: null
      });

    assert.match(
      capturedSql,
      /COALESCE\(e\.quiebre_id,\s*c\.quiebre_id\)/
    );

    assert.match(
      capturedSql,
      /e\.campana_id IS NULL/
    );

    assert.deepEqual(
      capturedParams,
      [1]
    );

    assert.equal(
      result.evaluaciones,
      10
    );
  }
);


test(
  'ANAREPO-A2-002 resumen ejecutivo aplica todos los filtros parametrizados',
  async () => {
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedParams = params;

        return {
          rows: [
            {
              evaluaciones: 0,
              gestores: 0,
              auditores: 0
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.getExecutiveSummary({
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-30',
      quiebreId: 1,

      campana: {
        modo: 'ESPECIFICA',
        id: 3
      },

      matrizId: 1,
      lider: 'Jemmy Cantaro',
      gestor: 'GESTOR TEST',
      auditor: 'AUDITOR TEST'
    });

    assert.deepEqual(
      capturedParams,
      [
        '2026-09-01',
        '2026-09-30',
        1,
        3,
        1,
        'Jemmy Cantaro',
        'GESTOR TEST',
        'AUDITOR TEST'
      ]
    );
  }
);

test(
  'ANAREPO-A2-003 distribución por rango reutiliza filtros analíticos',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              rango: 'Excelente',
              cantidad: 7
            },
            {
              rango: 'Bien',
              cantidad: 3
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listRangeDistribution({
        quiebreId: 1,

        campana: {
          modo: 'SIN_CAMPANA',
          id: null
        },

        matrizId: null,
        lider: null,
        gestor: null,
        auditor: null,
        fechaDesde: null,
        fechaHasta: null
      });

    assert.match(
      capturedSql,
      /GROUP BY e\.rango/
    );

    assert.match(
      capturedSql,
      /e\.campana_id IS NULL/
    );

    assert.match(
      capturedSql,
      /COALESCE\(e\.quiebre_id,\s*c\.quiebre_id\)/
    );

    assert.deepEqual(
      capturedParams,
      [1]
    );

    assert.deepEqual(
      result,
      [
        {
          rango: 'Excelente',
          cantidad: 7
        },
        {
          rango: 'Bien',
          cantidad: 3
        }
      ]
    );
  }
);


test(
  'ANAREPO-A2-004 distribución por rango mantiene orden de calidad',
  async () => {
    let capturedSql;

    const db = {
      async query(sql) {
        capturedSql = sql;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.listRangeDistribution({
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
    });

    assert.match(
      capturedSql,
      /WHEN 'Excelente' THEN 1/
    );

    assert.match(
      capturedSql,
      /WHEN 'Bien' THEN 2/
    );

    assert.match(
      capturedSql,
      /WHEN 'Regular' THEN 3/
    );

    assert.match(
      capturedSql,
      /WHEN 'Bajo' THEN 4/
    );
  }
);

test(
  'ANAREPO-A3-001 lista quiebres usando contexto efectivo',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
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
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listBreakDimensions({
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
      });

    assert.match(
      capturedSql,
      /COALESCE\(\s*e\.quiebre_id,\s*c\.quiebre_id\s*\)/
    );

    assert.match(
      capturedSql,
      /LEFT JOIN quiebres q/
    );

    assert.deepEqual(
      capturedParams,
      []
    );

    assert.equal(
      result.length,
      2
    );

    assert.equal(
      result[0].quiebre_codigo,
      'COBRANZAS'
    );

    assert.equal(
      result[1].quiebre_id,
      null
    );
  }
);


test(
  'ANAREPO-A3-002 dimensiones de quiebre respetan población filtrada',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.listBreakDimensions({
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-30',

      quiebreId: 1,

      campana: {
        modo: 'SIN_CAMPANA',
        id: null
      },

      matrizId: 1,
      lider: null,
      gestor: null,
      auditor: null
    });

    assert.match(
      capturedSql,
      /e\.campana_id IS NULL/
    );

    assert.deepEqual(
      capturedParams,
      [
        '2026-09-01',
        '2026-09-30',
        1,
        1
      ]
    );
  }
);

test(
  'ANAREPO-A3-003 lista campañas y conserva sin campaña',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              quiebre_id: '1',
              campana_id: '1',
              campana_codigo: 'T',
              campana_descripcion: 'Tempranas',
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
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listCampaignDimensions({
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
      });

    assert.match(
      capturedSql,
      /e\.campana_id/
    );

    assert.match(
      capturedSql,
      /COALESCE\(\s*e\.quiebre_id,\s*c\.quiebre_id\s*\)/
    );

    assert.deepEqual(
      capturedParams,
      []
    );

    assert.equal(
      result.length,
      3
    );

    assert.equal(
      result[0].campana_codigo,
      'T'
    );

    assert.equal(
      result[1].quiebre_id,
      '1'
    );

    assert.equal(
      result[1].campana_id,
      null
    );

    assert.equal(
      result[2].quiebre_id,
      null
    );
  }
);


test(
  'ANAREPO-A3-004 campañas respetan filtros encadenados',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.listCampaignDimensions({
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-30',

      quiebreId: 1,

      campana: {
        modo: 'TODAS',
        id: null
      },

      matrizId: 1,
      lider: 'Jemmy Cantaro',
      gestor: null,
      auditor: null
    });

    assert.match(
      capturedSql,
      /COALESCE\(\s*e\.quiebre_id,\s*c\.quiebre_id\s*\)/
    );

    assert.match(
      capturedSql,
      /a\.lider_2026/
    );

    assert.deepEqual(
      capturedParams,
      [
        '2026-09-01',
        '2026-09-30',
        1,
        1,
        'Jemmy Cantaro'
      ]
    );
  }
);

test(
  'ANAREPO-A3-005 lista matrices presentes en la población',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              matriz_id: '1',
              matriz_codigo: 'MATRIZ_COBRANZAS',
              evaluaciones: 2481
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listMatrixDimensions({
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
      });

    assert.match(
      capturedSql,
      /e\.matriz_id/
    );

    assert.match(
      capturedSql,
      /LEFT JOIN matrices m/
    );

    assert.deepEqual(
      capturedParams,
      []
    );

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0].matriz_id,
      '1'
    );

    assert.equal(
      result[0].matriz_codigo,
      'MATRIZ_COBRANZAS'
    );
  }
);


test(
  'ANAREPO-A3-006 matrices respetan filtros encadenados',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.listMatrixDimensions({
      fechaDesde: '2026-09-01',
      fechaHasta: '2026-09-30',

      quiebreId: 1,

      campana: {
        modo: 'ESPECIFICA',
        id: 2
      },

      matrizId: null,

      lider: 'Jemmy Cantaro',

      gestor:
        'MORE SEMINARIO MAGDALENA',

      auditor: null
    });

    assert.match(
      capturedSql,
      /e\.campana_id/
    );

    assert.match(
      capturedSql,
      /a\.lider_2026/
    );

    assert.match(
      capturedSql,
      /e\.agente/
    );

    assert.deepEqual(
      capturedParams,
      [
        '2026-09-01',
        '2026-09-30',
        1,
        2,
        'Jemmy Cantaro',
        'MORE SEMINARIO MAGDALENA'
      ]
    );
  }
);

test(
  'ANAREPO-A3-007 lista líderes de la población',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              lider: 'Jemmy Cantaro',
              evaluaciones: 100
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listLeaderDimensions({
        fechaDesde: null,
        fechaHasta: null,
        quiebreId: 1,

        campana: {
          modo: 'TODAS',
          id: null
        },

        matrizId: null,
        lider: null,
        gestor: null,
        auditor: null
      });

    assert.match(
      capturedSql,
      /a\.lider_2026 AS lider/
    );

    assert.match(
      capturedSql,
      /a\.lider_2026 IS NOT NULL/
    );

    assert.deepEqual(
      capturedParams,
      [1]
    );

    assert.equal(
      result[0].lider,
      'Jemmy Cantaro'
    );
  }
);


test(
  'ANAREPO-A3-008 lista gestores respetando filtros encadenados',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              gestor:
                'MORE SEMINARIO MAGDALENA',
              evaluaciones: 1
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listManagerDimensions({
        fechaDesde: null,
        fechaHasta: null,
        quiebreId: 1,

        campana: {
          modo: 'SIN_CAMPANA',
          id: null
        },

        matrizId: 1,
        lider: 'Jemmy Cantaro',
        gestor: null,
        auditor: null
      });

    assert.match(
      capturedSql,
      /e\.agente AS gestor/
    );

    assert.match(
      capturedSql,
      /e\.campana_id IS NULL/
    );

    assert.match(
      capturedSql,
      /a\.lider_2026/
    );

    assert.deepEqual(
      capturedParams,
      [
        1,
        1,
        'Jemmy Cantaro'
      ]
    );

    assert.equal(
      result[0].gestor,
      'MORE SEMINARIO MAGDALENA'
    );
  }
);


test(
  'ANAREPO-A3-009 lista auditores de la población',
  async () => {
    let capturedSql;

    const db = {
      async query(sql) {
        capturedSql = sql;

        return {
          rows: [
            {
              auditor:
                'TORRES BELTRAN ANGEL SILVESTER',
              evaluaciones: 2481
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository.listAuditorDimensions({
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
      });

    assert.match(
      capturedSql,
      /e\.evaluador AS auditor/
    );

    assert.match(
      capturedSql,
      /e\.evaluador IS NOT NULL/
    );

    assert.equal(
      result.length,
      1
    );
  }
);


test(
  'ANAREPO-A3-010 rechaza dimensión humana no permitida',
  async () => {
    const db = {
      async query() {
        throw new Error(
          'No debería consultar la BD'
        );
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await assert.rejects(
      () =>
        repository.listHumanDimension(
          {},
          'campo_inventado'
        ),

      /Dimensión humana Analytics inválida/
    );
  }
);

test(
  'ANAREPO-A4-001 genera evolución mensual con métricas de calidad',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = sql;
        capturedParams = params;

        return {
          rows: [
            {
              periodo:
                '2026-09-01',
              evaluaciones: 100,
              nota_promedio: '93.50',
              gestores: 20,
              auditores: 4,
              excelente: 40,
              bien: 35,
              regular: 15,
              bajo: 10
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const filters = {
      fechaDesde: null,
      fechaHasta: null,
      quiebreId: 1,

      campana: {
        modo: 'TODAS',
        id: null
      },

      matrizId: null,
      lider: null,
      gestor: null,
      auditor: null
    };

    const rows =
      await repository.listEvolution(
        filters,
        'month'
      );

    assert.equal(
      rows.length,
      1
    );

    assert.match(
      capturedSql,
      /date_trunc\('month', e\.fecha::date\)::date/
    );

    assert.match(
      capturedSql,
      /AVG\(e\.nota_final\)/
    );

    assert.match(
      capturedSql,
      /WHERE e\.rango = 'Excelente'/
    );

    assert.match(
      capturedSql,
      /WHERE e\.rango = 'Bajo'/
    );

    assert.match(
      capturedSql,
      /COALESCE\(e\.quiebre_id,\s*c\.quiebre_id\)/
    );

    assert.deepEqual(
      capturedParams,
      [1]
    );
  }
);

test(
  'ANAREPO-A4-002 soporta evolución diaria',
  async () => {
    let capturedSql;

    const db = {
      async query(sql) {
        capturedSql = sql;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.listEvolution(
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
      },
      'day'
    );

    assert.match(
      capturedSql,
      /date_trunc\('day', e\.fecha::date\)::date/
    );
  }
);

test(
  'ANAREPO-A4-003 soporta evolución semanal',
  async () => {
    let capturedSql;

    const db = {
      async query(sql) {
        capturedSql = sql;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository.listEvolution(
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
      },
      'week'
    );

    assert.match(
      capturedSql,
      /date_trunc\('week', e\.fecha::date\)::date/
    );
  }
);

test(
  'ANAREPO-A4-004 rechaza granularidad no permitida',
  async () => {
    const db = {
      async query() {
        throw new Error(
          'No debe consultar DB'
        );
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await assert.rejects(
      () =>
        repository.listEvolution(
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
          },
          "month); DROP TABLE evaluaciones;--"
        ),
      /Granularidad Analytics inválida/
    );
  }
);

test(
  'ANAREPO-A4-005 evolución de matriz agrupa por período matriz y versión',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedSql = String(sql);
        capturedParams = params;

        return {
          rows: [
            {
              periodo: '2026-06-01',
              matriz_id: '1',
              matriz_codigo:
                'MATRIZ_COBRANZAS',
              version_matriz_id: '7',
              version_matriz: 'v2.1.0',
              auditorias: 100,
              nota_promedio: '91.50'
            }
          ]
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    const result =
      await repository
        .listEvolutionMatrixContext(
          {
            fechaDesde: null,
            fechaHasta: null,
            quiebreId: 1,

            campana: {
              modo: 'TODAS',
              id: null
            },

            matrizId: null,
            lider: null,
            gestor: null,
            auditor: null
          },
          'month'
        );

    assert.match(
      capturedSql,
      /e\.version_matriz_id/
    );

    assert.match(
      capturedSql,
      /LEFT JOIN versiones_matriz vm/
    );

    assert.match(
      capturedSql,
      /vm\.version AS version_matriz/
    );

    assert.match(
      capturedSql,
      /GROUP BY[\s\S]*e\.matriz_id[\s\S]*e\.version_matriz_id/
    );

    assert.match(
      capturedSql,
      /AVG\(e\.nota_final\)/
    );

    assert.deepEqual(
      capturedParams,
      [1]
    );

    assert.equal(
      result[0].version_matriz,
      'v2.1.0'
    );
  }
);


test(
  'ANAREPO-A4-006 contexto de matriz respeta filtros Analytics',
  async () => {
    let capturedParams;

    const db = {
      async query(sql, params) {
        capturedParams = params;

        return {
          rows: []
        };
      }
    };

    const repository =
      new AnalyticsRepository(db);

    await repository
      .listEvolutionMatrixContext(
        {
          fechaDesde: '2026-04-01',
          fechaHasta: '2026-06-30',
          quiebreId: 1,

          campana: {
            modo: 'ESPECIFICA',
            id: 2
          },

          matrizId: 1,
          lider: 'LIDER TEST',
          gestor: 'GESTOR TEST',
          auditor: 'AUDITOR TEST'
        },
        'month'
      );

    assert.deepEqual(
      capturedParams,
      [
        '2026-04-01',
        '2026-06-30',
        1,
        2,
        1,
        'LIDER TEST',
        'GESTOR TEST',
        'AUDITOR TEST'
      ]
    );
  }
);


test(
  'ANAREPO-A4-007 sin campaña excluye registros sin contexto',
  () => {
    const result =
      AnalyticsRepository
        .buildPopulationFilter({
          quiebreId: null,

          campana: {
            modo: 'SIN_CAMPANA',
            id: null
          }
        });

    assert.match(
      result.sql,
      /e\.campana_id IS NULL/
    );

    assert.match(
      result.sql,
      /COALESCE\(\s*e\.quiebre_id,\s*c\.quiebre_id\s*\) IS NOT NULL/
    );

    assert.deepEqual(
      result.params,
      []
    );
  }
);

test(
  'ANAREPO-A5-001 construye Pareto de incumplimientos con cobertura triestado',
  async () => {
    let capturedSql;
    let capturedParams;

    const db = {
      async query(
        sql,
        params
      ) {
        capturedSql =
          String(sql);

        capturedParams =
          params;

        return {
          rows: [
            {
              bloque: 'ECN',
              atributo:
                'MOTIVO DE NO PAGO',
              submotivo:
                'Pregunta_motivo_no_pago',

              registros: 2481,
              incumplimientos: 946,
              cumplimientos: 0,
              no_aplica: 279,
              sin_respuesta: 1256,

              respuestas_aplicables_explicitas:
                946,

              respuestas_triestado:
                1225,

              tasa_incumplimiento_explicita_pct:
                '100.00',

              cobertura_triestado_pct:
                '49.38',

              participacion_fallas_pct:
                '15.30',

              pareto_acumulado_pct:
                '15.30'
            }
          ]
        };
      }
    };


    const repository =
      new AnalyticsRepository(
        db
      );


    const rows =
      await repository
        .listDiagnosticPareto({
          fechaDesde:
            '2026-06-01',

          fechaHasta:
            '2026-07-31',

          quiebreId: 1,

          campana: {
            modo: 'TODAS',
            id: null
          },

          matrizId: null,
          lider: null,
          gestor: null,
          auditor: null
        });


    assert.match(
      capturedSql,
      /INNER JOIN detalles_evaluacion d/
    );


    assert.match(
      capturedSql,
      /d\.valor_respuesta = '0'/
    );


    assert.match(
      capturedSql,
      /d\.valor_respuesta = 'NA'/
    );


    assert.match(
      capturedSql,
      /d\.valor_respuesta IS NULL/
    );


    assert.match(
      capturedSql,
      /cobertura_triestado_pct/
    );


    assert.match(
      capturedSql,
      /participacion_fallas_pct/
    );


    assert.match(
      capturedSql,
      /pareto_acumulado_pct/
    );


    /*
     * Verificamos reutilización exacta
     * del contrato de filtros Analytics.
     */
    assert.deepEqual(
      capturedParams,
      [
        '2026-06-01',
        '2026-07-31',
        1
      ]
    );


    assert.equal(
      rows.length,
      1
    );


    assert.equal(
      rows[0].incumplimientos,
      946
    );
  }
);