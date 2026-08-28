const test = require('node:test');
const assert = require('node:assert/strict');

const DomainService =
  require('../src/modules/domain/domain.service');


function createRepository(overrides = {}) {
  return {
    createBreak: async data => ({
      id: 2,
      ...data
    }),

    getBreakById: async id => ({
      id,
      codigo: 'TEST',
      nombre: 'Test',
      descripcion: null,
      activo: true
    }),

    updateBreak: async (id, data) => ({
      id,
      ...data
    }),

    setBreakActive: async (id, activo) => ({
      id,
      codigo: 'TEST',
      nombre: 'Test',
      activo
    }),

    ...overrides
  };
}


test(
  'F122-SVC-001 create normaliza código y textos',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service.createBreak({
        codigo: ' fraude ',
        nombre: ' Fraude ',
        descripcion: ' Prueba '
      });

    assert.equal(
      result.codigo,
      'FRAUDE'
    );

    assert.equal(
      result.nombre,
      'Fraude'
    );

    assert.equal(
      result.descripcion,
      'Prueba'
    );

    assert.equal(
      result.activo,
      true
    );
  }
);


test(
  'F122-SVC-002 create rechaza código vacío',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    await assert.rejects(
      () =>
        service.createBreak({
          codigo: '   ',
          nombre: 'Prueba'
        }),
      error =>
        error.status === 400 &&
        error.code === 'VALIDATION_ERROR'
    );
  }
);


test(
  'F122-SVC-003 create rechaza nombre vacío',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    await assert.rejects(
      () =>
        service.createBreak({
          codigo: 'TEST',
          nombre: ''
        }),
      error =>
        error.status === 400 &&
        error.code === 'VALIDATION_ERROR'
    );
  }
);


test(
  'F122-SVC-004 update valida existencia',
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
        service.updateBreak(
          999,
          {
            codigo: 'TEST',
            nombre: 'Test'
          }
        ),
      error =>
        error.status === 404 &&
        error.message ===
          'Quiebre no encontrado'
    );
  }
);


test(
  'F122-SVC-005 traduce código duplicado',
  async () => {
    const duplicate =
      new Error('duplicate');

    duplicate.code = '23505';

    const service =
      new DomainService(
        createRepository({
          createBreak:
            async () => {
              throw duplicate;
            }
        })
      );

    await assert.rejects(
      () =>
        service.createBreak({
          codigo: 'TEST',
          nombre: 'Test'
        }),
      error =>
        error.status === 409 &&
        error.code === 'DUPLICATE_ERROR'
    );
  }
);


test(
  'F122-SVC-006 activar/desactivar valida id',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service.setBreakActive(
        2,
        false
      );

    assert.equal(
      result.activo,
      false
    );
  }
);