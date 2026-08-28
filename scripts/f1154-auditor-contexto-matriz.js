const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const auditorPath = path.join(
  ROOT,
  'public',
  'js',
  'auditor.js'
);

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.4] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(
  auditorPath,
  'utf8'
);

// ------------------------------------------------------
// 1. Agregar helpers de contexto en Auditor.
// ------------------------------------------------------
if (
  !/async function resolverContextoAuditoria\s*\(/.test(source)
) {
  source += `

async function resolverContextoAuditoria(
    campanaId,
    fecha = null
) {
    if (!campanaId) {
        throw new Error(
            'campanaId es obligatorio para resolver el contexto de auditoría'
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
                  'No se pudo resolver el contexto de auditoría';

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

async function aplicarContextoAuditoria(
    campanaId,
    fecha = null
) {
    const contexto =
        await resolverContextoAuditoria(
            campanaId,
            fecha
        );

    window.contextoAuditoriaActual =
        contexto || null;

    window.matrizActualId =
        contexto?.matriz_id ??
        contexto?.matrizId ??
        null;

    window.versionMatrizActualId =
        contexto?.matriz_version_id ??
        contexto?.version_matriz_id ??
        contexto?.matrizVersionId ??
        null;

    return contexto;
}

async function resolverContextoDesdeEscucha(
    escucha
) {
    if (!escucha) {
        throw new Error(
            'La escucha es obligatoria'
        );
    }

    const campanaId =
        escucha.campana_id ??
        escucha.campanaId ??
        null;

    const fecha =
        escucha.fecha ??
        escucha.fecha_escucha ??
        escucha.fecha_gestion ??
        escucha.fecha_asignacion ??
        null;

    return aplicarContextoAuditoria(
        campanaId,
        fecha
    );
}
`;
}

// ------------------------------------------------------
// 2. Exponer helpers globales.
// ------------------------------------------------------
if (
  !/window\.resolverContextoAuditoria\s*=/.test(source)
) {
  source += `
window.resolverContextoAuditoria =
    resolverContextoAuditoria;
`;
}

if (
  !/window\.aplicarContextoAuditoria\s*=/.test(source)
) {
  source += `
window.aplicarContextoAuditoria =
    aplicarContextoAuditoria;
`;
}

if (
  !/window\.resolverContextoDesdeEscucha\s*=/.test(source)
) {
  source += `
window.resolverContextoDesdeEscucha =
    resolverContextoDesdeEscucha;
`;
}

// ------------------------------------------------------
// 3. Guardrails de integración.
// ------------------------------------------------------
const required = [
  /\/api\/domain\/contexto-evaluacion\?/,
  /params\.set\(\s*'campanaId'/,
  /window\.contextoAuditoriaActual/,
  /window\.matrizActualId/,
  /window\.versionMatrizActualId/,
  /async function resolverContextoDesdeEscucha\s*\(/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error(
      '[F11.5.4] Validación falló:',
      rule
    );
    process.exit(1);
  }
}

// No tocar aún la función de cuartiles.
if (
  !/if\s*\(\s*nota\s*>=\s*97\s*\)\s*return\s*['"]Q1['"]/.test(source) ||
  !/if\s*\(\s*nota\s*>=\s*90\s*\)\s*return\s*['"]Q2['"]/.test(source) ||
  !/if\s*\(\s*nota\s*>=\s*85\s*\)\s*return\s*['"]Q3['"]/.test(source)
) {
  console.error(
    '[F11.5.4] ERROR: los umbrales de cuartiles ya no están intactos.'
  );
  process.exit(1);
}

fs.writeFileSync(
  auditorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.4] OK - Auditor puede resolver contexto por campana/fecha.'
);
console.log(
  '[F11.5.4] OK - matriz/version quedan derivadas del backend.'
);
console.log(
  '[F11.5.4] OK - cuartiles 97/90/85 intactos.'
);
