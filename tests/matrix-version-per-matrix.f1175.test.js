const test = require('node:test');
const assert = require('node:assert/strict');

const MatrixRepository =
  require('../src/modules/matrix/matrix.repository');


// ============================================================
// F11.7.5
// Protección de aislamiento de versiones activas por matriz.
//
// Regla:
//
// Matriz A puede tener una versión activa.
// Matriz B puede tener otra versión activa simultáneamente.
//
// Activar una versión de Matriz A NO debe desactivar
// la versión activa de Matriz B.
// ============================================================


test(
  'VERPERMAT-001 activación desactiva únicamente versiones de la misma matriz',
  async () => {

    const queries = [];

    const fakeDb = {
      async query(sql, params = []) {
        const normalized = String(sql)
          .replace(/\s+/g, ' ')
          .trim();

        queries.push({
          sql: normalized,
          params
        });

        // ----------------------------------------------------
        // getVersionById()
        // Simulamos que la versión 20 pertenece a matriz 2.
        // ----------------------------------------------------
        if (
          /SELECT id, matriz_id, version, descripcion, fecha_vigencia, activa/i
            .test(normalized)
          &&
          /FROM versiones_matriz/i.test(normalized)
          &&
          /WHERE id = \$1/i.test(normalized)
        ) {
          return {
            rows: [
              {
                id: 20,
                matriz_id: 2,
                version: 'v2.0.0',
                descripcion: 'Versión matriz 2',
                fecha_vigencia: new Date('2026-08-26'),
                activa: false
              }
            ]
          };
        }

        // ----------------------------------------------------
        // Desactivación dentro de la misma matriz.
        // ----------------------------------------------------
        if (
          /UPDATE versiones_matriz/i.test(normalized)
          &&
          /SET activa = FALSE/i.test(normalized)
        ) {
          return {
            rows: [],
            rowCount: 1
          };
        }

        // ----------------------------------------------------
        // Activación de versión objetivo.
        // ----------------------------------------------------
        if (
          /UPDATE versiones_matriz/i.test(normalized)
          &&
          /SET activa = TRUE/i.test(normalized)
        ) {
          return {
            rows: [
              {
                id: 20,
                matriz_id: 2,
                version: 'v2.0.0',
                activa: true
              }
            ],
            rowCount: 1
          };
        }

        return {
          rows: [],
          rowCount: 0
        };
      }
    };


    const repository =
      new MatrixRepository(fakeDb);


    const result =
      await repository.activateVersion(
        fakeDb,
        20
      );


    // ========================================================
    // 1. Resultado funcional
    // ========================================================
    assert.ok(result);

    assert.equal(
      result.id,
      20
    );

    assert.equal(
      result.matriz_id,
      2
    );

    assert.equal(
      result.activa,
      true
    );


    // ========================================================
    // 2. Encontrar UPDATE de desactivación
    // ========================================================
    const deactivateQuery =
      queries.find(q =>
        /UPDATE versiones_matriz/i.test(q.sql)
        &&
        /SET activa = FALSE/i.test(q.sql)
      );


    assert.ok(
      deactivateQuery,
      'Debe existir UPDATE para desactivar versión anterior'
    );


    // ========================================================
    // 3. La desactivación DEBE estar limitada por matriz_id
    // ========================================================
    assert.match(
      deactivateQuery.sql,
      /WHERE matriz_id = \$1/i
    );


    // ========================================================
    // 4. Debe recibir matriz 2 como primer parámetro
    // ========================================================
    assert.equal(
      deactivateQuery.params[0],
      2
    );


    // ========================================================
    // 5. Debe excluir la propia versión objetivo
    // ========================================================
    assert.match(
      deactivateQuery.sql,
      /id <> \$2/i
    );

    assert.equal(
      deactivateQuery.params[1],
      20
    );
  }
);


test(
  'VERPERMAT-002 activación no contiene desactivación global',
  () => {

    const source =
      MatrixRepository.prototype.activateVersion
        .toString();


    // Debe existir filtro por matriz.
    assert.match(
      source,
      /matriz_id/
    );


    // Protección contra regresión:
    // no queremos volver a algo conceptualmente equivalente a:
    //
    // UPDATE versiones_matriz
    // SET activa = FALSE
    // WHERE activa = TRUE
    //
    // sin matriz_id.
    const globalDeactivate =
      /SET\s+activa\s*=\s*FALSE\s+WHERE\s+activa\s*=\s*TRUE/i;


    assert.doesNotMatch(
      source,
      globalDeactivate
    );
  }
);


test(
  'VERPERMAT-003 versión objetivo determina su propia matriz',
  async () => {

    let selectCalled = false;

    const fakeDb = {
      async query(sql, params = []) {
        const normalized = String(sql)
          .replace(/\s+/g, ' ')
          .trim();

        if (
          /FROM versiones_matriz/i.test(normalized)
          &&
          /WHERE id = \$1/i.test(normalized)
          &&
          /SELECT/i.test(normalized)
        ) {
          selectCalled = true;

          assert.equal(
            params[0],
            30
          );

          return {
            rows: [
              {
                id: 30,
                matriz_id: 5,
                version: 'v1.0.0',
                descripcion: null,
                fecha_vigencia: null,
                activa: false
              }
            ]
          };
        }

        if (
          /SET activa = FALSE/i.test(normalized)
        ) {
          assert.equal(
            params[0],
            5,
            'Debe desactivar solamente dentro de matriz 5'
          );

          return {
            rows: []
          };
        }

        if (
          /SET activa = TRUE/i.test(normalized)
        ) {
          return {
            rows: [
              {
                id: 30,
                matriz_id: 5,
                version: 'v1.0.0',
                activa: true
              }
            ]
          };
        }

        return {
          rows: []
        };
      }
    };


    const repository =
      new MatrixRepository(fakeDb);


    await repository.activateVersion(
      fakeDb,
      30
    );


    assert.equal(
      selectCalled,
      true,
      'Debe resolver matriz_id a partir de versionId'
    );
  }
);