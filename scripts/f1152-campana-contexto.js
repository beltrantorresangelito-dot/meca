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
  console.error('[F11.5.2] No existe supervisor.js');
  process.exit(1);
}

let source = fs.readFileSync(
  supervisorPath,
  'utf8'
);

const anchor =
  'window.obtenerCampanasPorQuiebre =';

if (!source.includes(anchor)) {
  console.error(
    '[F11.5.2] No se encontró F11.5.1 aplicada.'
  );
  process.exit(1);
}

if (!source.includes('async function resolverContextoEvaluacion')) {
  const helper = `
async function resolverContextoEvaluacion(
    campanaId,
    fecha = null
) {
    if (!campanaId) {
        throw new Error(
            'campanaId es obligatorio para resolver el contexto'
        );
    }

    const params =
        new URLSearchParams();

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

    const raw =
        await response.text();

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

        const error =
            new Error(message);

        error.status =
            response.status;

        error.payload =
            payload;

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
            contexto.matriz_id ||
            contexto.matrizId ||
            null;

        window.versionMatrizActualId =
            contexto.matriz_version_id ||
            contexto.version_matriz_id ||
            contexto.matrizVersionId ||
            null;
    } else {
        window.matrizActualId = null;
        window.versionMatrizActualId = null;
    }

    return contexto;
}

`;

  const insertBefore =
    'window.obtenerCampanasPorQuiebre =';

  source = source.replace(
    insertBefore,
    helper + insertBefore
  );
}

if (
  !source.includes(
    'window.resolverContextoEvaluacion = resolverContextoEvaluacion;'
  )
) {
  const exposureAnchor =
    'window.cargarCampanasPorQuiebreEnSelect =';

  if (!source.includes(exposureAnchor)) {
    console.error(
      '[F11.5.2] No se encontró anchor de exposición global.'
    );
    process.exit(1);
  }

  source = source.replace(
    exposureAnchor,
    `window.resolverContextoEvaluacion =
    resolverContextoEvaluacion;
window.resolverContextoEvaluacionActual =
    resolverContextoEvaluacionActual;
` + exposureAnchor
  );
}

const required = [
  /\/api\/domain\/contexto-evaluacion\?/,
  /params\.set\(\s*'campanaId'/,
  /params\.set\(\s*'fecha'/,
  /window\.contextoEvaluacionActual/,
  /window\.versionMatrizActualId/,
  /window\.matrizActualId/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error(
      '[F11.5.2] Validación falló:',
      rule
    );
    process.exit(1);
  }
}

if (
  /contexto-evaluacion\?campana_id=/.test(source)
) {
  console.error(
    '[F11.5.2] ERROR: se detectó campana_id en el contrato Domain.'
  );
  process.exit(1);
}

fs.writeFileSync(
  supervisorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.2] OK - resolverContextoEvaluacion agregado.'
);
console.log(
  '[F11.5.2] OK - usa campanaId y fecha.'
);
console.log(
  '[F11.5.2] OK - matriz/version se derivan del backend.'
);
