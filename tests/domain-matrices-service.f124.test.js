const test = require('node:test');
const assert = require('node:assert/strict');

const DomainService =
  require('../src/modules/domain/domain.service');


function createRepository(overrides = {}) {
  return {
    getBreakById: async id => ({
      id,
      codigo: 'COBRANZAS',
      nombre: 'Cobranzas',
      activo: true
    }),

    getMatrixById: async id => ({
      id,
      codigo: 'MTEST',
      nombre: 'Matriz Test',
      descripcion: null,
      activa: true,
      quiebre_id: 1
    }),

    createMatrix: async data => ({
      id: 10,
      ...data,
      quiebre_id: data.quiebreId
    }),

    updateMatrix: async (id, data) => ({
      id,
      ...data,
      quiebre_id: data.quiebreId
    }),

    setMatrixActive: async (id, activa) => ({
      id,
      codigo: 'MTEST',
      nombre: 'Matriz Test',
      activa,
      quiebre_id: 1
    }),

    ...overrides
  };
}


test(
  'F124-SVC-001 create normaliza matriz',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service.createMatrix({
        codigo: ' mtest ',
        nombre: ' Matriz Test ',
        descripcion: ' Descripción ',
        quiebreId: 1
      });

    assert.equal(
      result.codigo,
      'MTEST'
    );

    assert.equal(
      result.nombre,
      'Matriz Test'
    );

    assert.equal(
      result.descripcion,
      'Descripción'
    );

    assert.equal(
      result.quiebre_id,
      1
    );

    assert.equal(
      result.activa,
      true
    );
  }
);


test(
  'F124-SVC-002 rechaza nombre vacío',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    await assert.rejects(
      () =>
        service.createMatrix({
          codigo: 'MTEST',
          nombre: '',
          quiebreId: 1
        }),
      error =>
        error.status === 400 &&
        error.code === 'VALIDATION_ERROR'
    );
  }
);


test(
  'F124-SVC-003 rechaza quiebre inexistente',
  async () => {
    const service =
      new DomainService(
        createRepository({
          getBreakById:
            async () => null
        })
      );

    await assert.rejects(
      () =>
        service.createMatrix({
          codigo: 'MTEST',
          nombre: 'Matriz Test',
          quiebreId: 999
        }),
      error =>
        error.status === 404 &&
        error.message ===
          'Quiebre no encontrado'
    );
  }
);


test(
  'F124-SVC-004 rechaza quiebre inactivo',
  async () => {
    const service =
      new DomainService(
        createRepository({
          getBreakById:
            async id => ({
              id,
              activo: false
            })
        })
      );

    await assert.rejects(
      () =>
        service.createMatrix({
          codigo: 'MTEST',
          nombre: 'Matriz Test',
          quiebreId: 1
        }),
      error =>
        error.status === 400
    );
  }
);


test(
  'F124-SVC-005 update valida existencia',
  async () => {
    const service =
      new DomainService(
        createRepository({
          getMatrixById:
            async () => null
        })
      );

    await assert.rejects(
      () =>
        service.updateMatrix(
          999,
          {
            codigo: 'MTEST',
            nombre: 'Matriz Test',
            quiebreId: 1
          }
        ),
      error =>
        error.status === 404 &&
        error.message ===
          'Matriz no encontrada'
    );
  }
);


test(
  'F124-SVC-006 traduce duplicado a 409',
  async () => {
    const duplicate =
      new Error('duplicate');

    duplicate.code = '23505';

    const service =
      new DomainService(
        createRepository({
          createMatrix:
            async () => {
              throw duplicate;
            }
        })
      );

    await assert.rejects(
      () =>
        service.createMatrix({
          codigo: 'MTEST',
          nombre: 'Matriz Test',
          quiebreId: 1
        }),
      error =>
        error.status === 409 &&
        error.code === 'DUPLICATE_ERROR'
    );
  }
);


test(
  'F124-SVC-007 permite desactivar matriz',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service.setMatrixActive(
        1,
        false
      );

    assert.equal(
      result.activa,
      false
    );
  }
);