const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const DomainService =
  require('../src/modules/domain/domain.service');


function pgError(message) {
  const error =
    new Error(message);

  error.code = 'P0001';

  return error;
}


test(
  'F125-CTX-001 sin matriz vigente devuelve 404 funcional',
  async () => {
    const service =
      new DomainService({
        resolveEvaluationContext:
          async () => {
            throw pgError(
              'No existe matriz vigente para campaña 8 en fecha 2026-09-01.'
            );
          }
      });

    await assert.rejects(
      () =>
        service.resolveContext({
          campaignId: 8,
          date: '2026-09-01'
        }),
      error =>
        error.status === 404 &&
        error.code ===
          'CONTEXT_NOT_FOUND'
    );
  }
);


test(
  'F125-CTX-002 múltiples matrices vigentes devuelve 409',
  async () => {
    const service =
      new DomainService({
        resolveEvaluationContext:
          async () => {
            throw pgError(
              'Existe más de una matriz vigente para campaña 8 en fecha 2026-09-01.'
            );
          }
      });

    await assert.rejects(
      () =>
        service.resolveContext({
          campaignId: 8,
          date: '2026-09-01'
        }),
      error =>
        error.status === 409 &&
        error.code ===
          'CONTEXT_CONFLICT'
    );
  }
);


test(
  'F125-CTX-003 sin versión aplicable devuelve 404',
  async () => {
    const service =
      new DomainService({
        resolveEvaluationContext:
          async () => {
            throw pgError(
              'Existe matriz vigente para campaña 8 en fecha 2026-09-01, pero no existe una versión de matriz aplicable.'
            );
          }
      });

    await assert.rejects(
      () =>
        service.resolveContext({
          campaignId: 8,
          date: '2026-09-01'
        }),
      error =>
        error.status === 404 &&
        error.code ===
          'VERSION_NOT_FOUND'
    );
  }
);