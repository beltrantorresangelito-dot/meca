const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAnalyticsHandler
} = require('../src/modules/analytics/analytics.routes');


function createResponse() {
  return {
    statusCode: null,
    headers: null,
    body: null,

    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },

    end(body) {
      this.body = body;
    }
  };
}


test(
  'ANAROUTE-A2-001 responde resumen ejecutivo',
  async () => {
    let receivedQuery;

    const controller = {
      async getExecutiveSummary(query) {
        receivedQuery = query;

        return {
          poblacion: {
            evaluaciones: 10,
            gestores: 4,
            auditores: 2
          },

          calidad: {
            notaPromedio: 95,
            notaMinima: 80,
            notaMaxima: 100
          },

          errores: {
            enc: 0,
            ecuf: 0,
            ecn: 0
          },

          rangos: []
        };
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const handled =
      await handler({
        ruta:
          '/api/analytics/resumen-ejecutivo',

        metodo: 'GET',

        peticion: {},

        respuesta,

        query: {
          quiebre_id: '1',
          sin_campana: 'true'
        }
      });

    assert.equal(
      handled,
      true
    );

    assert.deepEqual(
      receivedQuery,
      {
        quiebre_id: '1',
        sin_campana: 'true'
      }
    );

    assert.equal(
      respuesta.statusCode,
      200
    );

    const body =
      JSON.parse(
        respuesta.body
      );

    assert.equal(
      body.poblacion.evaluaciones,
      10
    );
  }
);


test(
  'ANAROUTE-A2-002 devuelve error controlado del service',
  async () => {
    const controller = {
      async getExecutiveSummary() {
        const error =
          new Error(
            'Filtro de campaña conflictivo'
          );

        error.status = 400;
        error.code =
          'ANALYTICS_CAMPAIGN_FILTER_CONFLICT';

        throw error;
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const handled =
      await handler({
        ruta:
          '/api/analytics/resumen-ejecutivo',

        metodo: 'GET',

        peticion: {},

        respuesta,

        query: {
          campana_id: '1',
          sin_campana: 'true'
        }
      });

    assert.equal(
      handled,
      true
    );

    assert.equal(
      respuesta.statusCode,
      400
    );

    const body =
      JSON.parse(
        respuesta.body
      );

    assert.equal(
      body.success,
      false
    );

    assert.equal(
      body.code,
      'ANALYTICS_CAMPAIGN_FILTER_CONFLICT'
    );
  }
);


test(
  'ANAROUTE-A2-003 ignora rutas que no pertenecen a Analytics',
  async () => {
    const controller = {
      async getExecutiveSummary() {
        throw new Error(
          'No debería ejecutarse'
        );
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const handled =
      await handler({
        ruta: '/api/otra-ruta',
        metodo: 'GET',
        peticion: {},
        respuesta,
        query: {}
      });

    assert.equal(
      handled,
      false
    );

    assert.equal(
      respuesta.statusCode,
      null
    );
  }
);

test(
  'ANAROUTE-A3-001 responde catálogo de filtros',
  async () => {
    let receivedQuery;

    const controller = {
      async getFilters(query) {
        receivedQuery = query;

        return {
          filters: {
            quiebreId: 1
          },

          quiebres: [
            {
              id: 1,
              codigo: 'COBRANZAS',
              evaluaciones: 2480
            }
          ],

          campanas: [],
          sinCampana: [],
          matrices: [],
          lideres: [],
          gestores: [],
          auditores: [],

          calidadDatos: {
            sinContexto: 0
          }
        };
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const handled =
      await handler({
        ruta:
          '/api/analytics/filtros',

        metodo: 'GET',

        peticion: {},

        respuesta,

        query: {
          quiebre_id: '1'
        }
      });

    assert.equal(
      handled,
      true
    );

    assert.deepEqual(
      receivedQuery,
      {
        quiebre_id: '1'
      }
    );

    assert.equal(
      respuesta.statusCode,
      200
    );

    const body =
      JSON.parse(
        respuesta.body
      );

    assert.equal(
      body.quiebres[0].codigo,
      'COBRANZAS'
    );

    assert.equal(
      body.quiebres[0].evaluaciones,
      2480
    );
  }
);

test(
  'ANAROUTE-A3-002 devuelve error controlado en filtros inválidos',
  async () => {
    const controller = {
      async getFilters() {
        const error =
          new Error(
            'Filtro de campaña conflictivo'
          );

        error.status = 400;
        error.code =
          'ANALYTICS_CAMPAIGN_FILTER_CONFLICT';

        throw error;
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const handled =
      await handler({
        ruta:
          '/api/analytics/filtros',

        metodo: 'GET',

        peticion: {},

        respuesta,

        query: {
          campana_id: '1',
          sin_campana: 'true'
        }
      });

    assert.equal(
      handled,
      true
    );

    assert.equal(
      respuesta.statusCode,
      400
    );

    const body =
      JSON.parse(
        respuesta.body
      );

    assert.equal(
      body.success,
      false
    );

    assert.equal(
      body.code,
      'ANALYTICS_CAMPAIGN_FILTER_CONFLICT'
    );
  }
);

test(
  'ANAROUTE-A4-001 responde evolución Analytics',
  async () => {
    let receivedQuery;

    const controller = {
      async getEvolution(query) {
        receivedQuery = query;

        return {
          filters: {
            quiebreId: 1
          },

          granularidad: 'month',

          serie: [
            {
              periodo: '2026-09-01',
              evaluaciones: 100,
              notaPromedio: 93.5,
              gestores: 20,
              auditores: 4,

              rangos: {
                excelente: 40,
                bien: 35,
                regular: 15,
                bajo: 10
              },

              calidad: {
                favorable: 75,
                favorablePct: 75,
                atencion: 25,
                atencionPct: 25
              },

              variacion: {
                notaPp: null,
                volumenPct: null,
                atencionPp: null
              }
            }
          ],

          comparacion: {
            periodoActual: '2026-09-01',
            periodoAnterior: null,
            notaActual: 93.5,
            notaAnterior: null,
            variacionNotaPp: null,
            variacionVolumenPct: null,
            atencionActualPct: 25,
            variacionAtencionPp: null,
            tendencia: 'SIN_DATOS'
          }
        };
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const query = {
      quiebre_id: '1',
      granularidad: 'month'
    };

    const handled =
      await handler({
        ruta:
          '/api/analytics/evolucion',

        metodo: 'GET',

        peticion: {},

        respuesta,

        query
      });

    assert.equal(
      handled,
      true
    );

    assert.deepEqual(
      receivedQuery,
      query
    );

    assert.equal(
      respuesta.statusCode,
      200
    );

    const body =
      JSON.parse(
        respuesta.body
      );

    assert.equal(
      body.granularidad,
      'month'
    );

    assert.equal(
      body.serie[0].notaPromedio,
      93.5
    );

    assert.equal(
      body.serie[0]
        .calidad.atencionPct,
      25
    );
  }
);

test(
  'ANAROUTE-A4-002 devuelve 400 para granularidad inválida',
  async () => {
    const controller = {
      async getEvolution() {
        const error =
          new Error(
            'granularidad debe ser day, week o month'
          );

        error.status = 400;
        error.code =
          'ANALYTICS_GRANULARITY_INVALID';

        throw error;
      }
    };

    const handler =
      createAnalyticsHandler({
        controller
      });

    const respuesta =
      createResponse();

    const handled =
      await handler({
        ruta:
          '/api/analytics/evolucion',

        metodo: 'GET',

        peticion: {},

        respuesta,

        query: {
          granularidad: 'quarter'
        }
      });

    assert.equal(
      handled,
      true
    );

    assert.equal(
      respuesta.statusCode,
      400
    );

    const body =
      JSON.parse(
        respuesta.body
      );

    assert.equal(
      body.code,
      'ANALYTICS_GRANULARITY_INVALID'
    );
  }
);