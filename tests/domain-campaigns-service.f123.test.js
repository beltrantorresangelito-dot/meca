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

    getCampaignById: async id => ({
      id,
      codigo: 'T',
      descripcion: 'Tempranas',
      activa: true,
      quiebre_id: 1
    }),

    createCampaign: async data => ({
      id: 10,
      ...data,
      quiebre_id: data.quiebreId
    }),

    updateCampaign: async (id, data) => ({
      id,
      ...data,
      quiebre_id: data.quiebreId
    }),

    setCampaignActive: async (id, activa) => ({
      id,
      codigo: 'T',
      descripcion: 'Tempranas',
      activa,
      quiebre_id: 1
    }),

    ...overrides
  };
}


test(
  'F123-SVC-001 create normaliza campaña',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service.createCampaign({
        codigo: ' tst ',
        descripcion: ' Campaña Test ',
        quiebreId: 1
      });

    assert.equal(
      result.codigo,
      'TST'
    );

    assert.equal(
      result.descripcion,
      'Campaña Test'
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
  'F123-SVC-002 rechaza código mayor a 5',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    await assert.rejects(
      () =>
        service.createCampaign({
          codigo: 'ABCDEF',
          descripcion: 'Test',
          quiebreId: 1
        }),
      error =>
        error.status === 400 &&
        error.code === 'VALIDATION_ERROR'
    );
  }
);


test(
  'F123-SVC-003 rechaza quiebre inexistente',
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
        service.createCampaign({
          codigo: 'TST',
          descripcion: 'Test',
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
  'F123-SVC-004 rechaza quiebre inactivo',
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
        service.createCampaign({
          codigo: 'TST',
          descripcion: 'Test',
          quiebreId: 1
        }),
      error =>
        error.status === 400
    );
  }
);


test(
  'F123-SVC-005 update valida campaña existente',
  async () => {
    const service =
      new DomainService(
        createRepository({
          getCampaignById:
            async () => null
        })
      );

    await assert.rejects(
      () =>
        service.updateCampaign(
          999,
          {
            codigo: 'TST',
            descripcion: 'Test',
            quiebreId: 1
          }
        ),
      error =>
        error.status === 404 &&
        error.message ===
          'Campaña no encontrada'
    );
  }
);


test(
  'F123-SVC-006 traduce duplicado a 409',
  async () => {
    const duplicate =
      new Error('duplicate');

    duplicate.code = '23505';

    const service =
      new DomainService(
        createRepository({
          createCampaign:
            async () => {
              throw duplicate;
            }
        })
      );

    await assert.rejects(
      () =>
        service.createCampaign({
          codigo: 'TST',
          descripcion: 'Test',
          quiebreId: 1
        }),
      error =>
        error.status === 409 &&
        error.code === 'DUPLICATE_ERROR'
    );
  }
);


test(
  'F123-SVC-007 permite desactivar campaña',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service.setCampaignActive(
        1,
        false
      );

    assert.equal(
      result.activa,
      false
    );
  }
);