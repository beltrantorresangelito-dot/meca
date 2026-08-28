const test = require('node:test');
const assert = require('node:assert/strict');

const DomainService =
  require('../src/modules/domain/domain.service');


function createRepository(
  overrides = {}
) {
  return {
    getCampaignById:
      async id => ({
        id,
        codigo: 'T',
        activa: true,
        quiebre_id: 1
      }),

    getMatrixById:
      async id => ({
        id,
        codigo: 'MTEST',
        activa: true,
        quiebre_id: 2
      }),

    getCampaignMatrixAssignmentById:
      async id => ({
        id,
        campana_id: 1,
        matriz_id: 2,
        vigente_desde: '2026-09-01',
        vigente_hasta: null,
        activa: true
      }),

    findCampaignMatrixOverlaps:
      async () => [],

    createCampaignMatrixAssignment:
      async data => ({
        id: 10,
        campana_id: data.campanaId,
        matriz_id: data.matrizId,
        vigente_desde:
          data.vigenteDesde,
        vigente_hasta:
          data.vigenteHasta,
        activa: data.activa
      }),

    updateCampaignMatrixAssignment:
      async (id, data) => ({
        id,
        campana_id: data.campanaId,
        matriz_id: data.matrizId,
        vigente_desde:
          data.vigenteDesde,
        vigente_hasta:
          data.vigenteHasta,
        activa: data.activa
      }),

    setCampaignMatrixAssignmentActive:
      async (id, activa) => ({
        id,
        activa
      }),

    ...overrides
  };
}


test(
  'F125-SVC-001 crea asignación válida',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service
        .createCampaignMatrixAssignment({
          campanaId: 1,
          matrizId: 2,
          vigenteDesde:
            '2026-09-01'
        });

    assert.equal(
      result.campana_id,
      1
    );

    assert.equal(
      result.matriz_id,
      2
    );

    assert.equal(
      result.vigente_desde,
      '2026-09-01'
    );

    assert.equal(
      result.activa,
      true
    );
  }
);


test(
  'F125-SVC-002 permite matriz de otro quiebre',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    const result =
      await service
        .createCampaignMatrixAssignment({
          campanaId: 1,
          matrizId: 2,
          vigenteDesde:
            '2026-09-01'
        });

    assert.equal(
      result.matriz_id,
      2
    );
  }
);


test(
  'F125-SVC-003 rechaza fecha final anterior',
  async () => {
    const service =
      new DomainService(
        createRepository()
      );

    await assert.rejects(
      () =>
        service
          .createCampaignMatrixAssignment({
            campanaId: 1,
            matrizId: 2,
            vigenteDesde:
              '2026-09-10',
            vigenteHasta:
              '2026-09-01'
          }),
      error =>
        error.status === 400 &&
        error.code ===
          'VALIDATION_ERROR'
    );
  }
);


test(
  'F125-SVC-004 rechaza campaña inactiva',
  async () => {
    const service =
      new DomainService(
        createRepository({
          getCampaignById:
            async id => ({
              id,
              activa: false,
              quiebre_id: 1
            })
        })
      );

    await assert.rejects(
      () =>
        service
          .createCampaignMatrixAssignment({
            campanaId: 1,
            matrizId: 2,
            vigenteDesde:
              '2026-09-01'
          }),
      error =>
        error.status === 400
    );
  }
);


test(
  'F125-SVC-005 rechaza matriz inactiva',
  async () => {
    const service =
      new DomainService(
        createRepository({
          getMatrixById:
            async id => ({
              id,
              activa: false,
              quiebre_id: 2
            })
        })
      );

    await assert.rejects(
      () =>
        service
          .createCampaignMatrixAssignment({
            campanaId: 1,
            matrizId: 2,
            vigenteDesde:
              '2026-09-01'
          }),
      error =>
        error.status === 400
    );
  }
);


test(
  'F125-SVC-006 rechaza solapamiento',
  async () => {
    const service =
      new DomainService(
        createRepository({
          findCampaignMatrixOverlaps:
            async () => [
              {
                id: 5
              }
            ]
        })
      );

    await assert.rejects(
      () =>
        service
          .createCampaignMatrixAssignment({
            campanaId: 1,
            matrizId: 2,
            vigenteDesde:
              '2026-09-01'
          }),
      error =>
        error.status === 409 &&
        error.code ===
          'ASSIGNMENT_OVERLAP'
    );
  }
);


test(
  'F125-SVC-007 update excluye asignación actual',
  async () => {
    let received = null;

    const service =
      new DomainService(
        createRepository({
          findCampaignMatrixOverlaps:
            async input => {
              received = input;
              return [];
            }
        })
      );

    await service
      .updateCampaignMatrixAssignment(
        10,
        {
          vigenteDesde:
            '2026-09-01'
        }
      );

    assert.equal(
      received.excludeId,
      10
    );
  }
);


test(
  'F125-SVC-008 reactivación valida solapamiento',
  async () => {
    const service =
      new DomainService(
        createRepository({
          findCampaignMatrixOverlaps:
            async () => [
              {
                id: 20
              }
            ]
        })
      );

    await assert.rejects(
      () =>
        service
          .setCampaignMatrixAssignmentActive(
            10,
            true
          ),
      error =>
        error.status === 409 &&
        error.code ===
          'ASSIGNMENT_OVERLAP'
    );
  }
);