const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const supervisorPath = path.join(
  ROOT,
  'public',
  'js',
  'supervisor.js'
);

if (!fs.existsSync(supervisorPath)) {
  console.error('[F11.5.2.1] No existe supervisor.js');
  process.exit(1);
}

let source = fs.readFileSync(
  supervisorPath,
  'utf8'
);

const helperBase = `
async function resolverContextoEvaluacion(
    campanaId,
    fecha = null
) {
    if (!campanaId) {
        throw new Error(
            'campanaId es obligatorio para resolver el contexto'
        );
    }

    const params = new URLSearchParams();

    params.set(
        'campanaId',
        String(campanaId)
    );

    if (fecha) {
        params.set(
            'fecha',
            String(fecha)
        );
    }

    const token =
        localStorage.getItem('meca_token');

    const response = await fetch(
        '/api/domain/contexto-evaluacion?' +
        params.toString(),
        {
            headers: token
                ? {
                    Authorization:
                        'Bearer ' + token
                }
                : {}
        }
    );

    const raw = await response.text();

    let payload = null;

    try {
        payload =
            raw
                ? JSON.parse(raw)
                : null;
    } catch (_) {
        payload = raw;
    }

    if (!response.ok) {
        const message =
            payload &&
            typeof payload === 'object' &&
            payload.error
                ? payload.error
                : raw ||
                  'No se pudo resolver el contexto de evaluación';

        const error = new Error(message);

        error.status = response.status;
        error.payload = payload;

        throw error;
    }

    if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload
    ) {
        return payload.data;
    }

    return payload;
}
`;

const helperActual = `
async function resolverContextoEvaluacionActual(
    campanaId,
    fecha = null
) {
    const contexto =
        await resolverContextoEvaluacion(
            campanaId,
            fecha
        );

    window.contextoEvaluacionActual =
        contexto || null;

    if (contexto) {
        window.matrizActualId =
            contexto.matriz_id ??
            contexto.matrizId ??
            null;

        window.versionMatrizActualId =
            contexto.matriz_version_id ??
            contexto.version_matriz_id ??
            contexto.matrizVersionId ??
            null;
    } else {
        window.matrizActualId = null;
        window.versionMatrizActualId = null;
    }

    return contexto;
}
`;

if (
  !/async function resolverContextoEvaluacion\s*\(/.test(source)
) {
  source += '\n\n' + helperBase;
}

if (
  !/async function resolverContextoEvaluacionActual\s*\(/.test(source)
) {
  source += '\n\n' + helperActual;
}

// Exposición global, una sola vez.
if (
  !/window\.resolverContextoEvaluacion\s*=/.test(source)
) {
  source += `
window.resolverContextoEvaluacion =
    resolverContextoEvaluacion;
`;
}

if (
  !/window\.resolverContextoEvaluacionActual\s*=/.test(source)
) {
  source += `
window.resolverContextoEvaluacionActual =
    resolverContextoEvaluacionActual;
`;
}

// Validaciones estructurales.
const required = [
  /async function resolverContextoEvaluacion\s*\(/,
  /async function resolverContextoEvaluacionActual\s*\(/,
  /\/api\/domain\/contexto-evaluacion\?/,
  /params\.set\(\s*'campanaId'/,
  /window\.contextoEvaluacionActual/,
  /window\.matrizActualId/,
  /window\.versionMatrizActualId/,
  /window\.resolverContextoEvaluacion\s*=/,
  /window\.resolverContextoEvaluacionActual\s*=/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error(
      '[F11.5.2.1] Validación falló:',
      rule
    );
    process.exit(1);
  }
}

if (
  /contexto-evaluacion\?campana_id=/.test(source)
) {
  console.error(
    '[F11.5.2.1] ERROR: contrato campana_id detectado.'
  );
  process.exit(1);
}

fs.writeFileSync(
  supervisorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.2.1] OK - resolverContextoEvaluacion presente.'
);
console.log(
  '[F11.5.2.1] OK - resolverContextoEvaluacionActual presente.'
);
console.log(
  '[F11.5.2.1] OK - contexto/matriz/version globales presentes.'
);
console.log(
  '[F11.5.2.1] OK - helpers expuestos en window.'
);
