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
  console.error('[F11.5.3] No existe supervisor.js');
  process.exit(1);
}

let source = fs.readFileSync(
  supervisorPath,
  'utf8'
);

// Requisito: F11.5.2 debe estar aplicada.
if (
  !/async function resolverContextoEvaluacionActual\s*\(/.test(source)
) {
  console.error(
    '[F11.5.3] Falta resolverContextoEvaluacionActual.'
  );
  process.exit(1);
}

if (
  !/window\.versionMatrizActualId/.test(source)
) {
  console.error(
    '[F11.5.3] Falta versionMatrizActualId.'
  );
  process.exit(1);
}

// ------------------------------------------------------
// 1. Helper de carga efectiva según contexto.
// ------------------------------------------------------
if (
  !/async function cargarMatrizDesdeContexto\s*\(/.test(source)
) {
  const helper = `
async function cargarMatrizDesdeContexto(
    contexto
) {
    if (!contexto) {
        throw new Error(
            'El contexto de evaluación es obligatorio'
        );
    }

    const matrizId =
        contexto.matriz_id ??
        contexto.matrizId ??
        window.matrizActualId ??
        null;

    const versionMatrizId =
        contexto.matriz_version_id ??
        contexto.version_matriz_id ??
        contexto.matrizVersionId ??
        window.versionMatrizActualId ??
        null;

    if (!matrizId) {
        throw new Error(
            'El contexto no contiene matriz_id'
        );
    }

    if (!versionMatrizId) {
        throw new Error(
            'El contexto no contiene matriz_version_id'
        );
    }

    window.matrizActualId =
        matrizId;

    window.versionMatrizActualId =
        versionMatrizId;

    // Reutilizar loader existente si está disponible.
    if (
        typeof window.cargarMatrizVersion === 'function'
    ) {
        return await window.cargarMatrizVersion(
            matrizId,
            versionMatrizId
        );
    }

    if (
        typeof window.cargarMatrizPorVersion === 'function'
    ) {
        return await window.cargarMatrizPorVersion(
            versionMatrizId,
            matrizId
        );
    }

    if (
        typeof window.cargarMatriz === 'function'
    ) {
        return await window.cargarMatriz(
            versionMatrizId,
            matrizId
        );
    }

    // Si no existe loader compatible, devolver contrato explícito.
    return {
        matriz_id: matrizId,
        matriz_version_id: versionMatrizId,
        cargada: false,
        motivo:
            'No existe un loader de matriz compatible expuesto en window'
    };
}

async function resolverYCargarMatrizDeCampana(
    campanaId,
    fecha = null
) {
    const contexto =
        await resolverContextoEvaluacionActual(
            campanaId,
            fecha
        );

    const resultado =
        await cargarMatrizDesdeContexto(
            contexto
        );

    return {
        contexto,
        resultado
    };
}
`;

  source += '\n\n' + helper;
}

// ------------------------------------------------------
// 2. Exposición global.
// ------------------------------------------------------
if (
  !/window\.cargarMatrizDesdeContexto\s*=/.test(source)
) {
  source += `
window.cargarMatrizDesdeContexto =
    cargarMatrizDesdeContexto;
`;
}

if (
  !/window\.resolverYCargarMatrizDeCampana\s*=/.test(source)
) {
  source += `
window.resolverYCargarMatrizDeCampana =
    resolverYCargarMatrizDeCampana;
`;
}

// ------------------------------------------------------
// 3. Guardrails.
// ------------------------------------------------------
const required = [
  /async function cargarMatrizDesdeContexto\s*\(/,
  /async function resolverYCargarMatrizDeCampana\s*\(/,
  /window\.matrizActualId\s*=/,
  /window\.versionMatrizActualId\s*=/,
  /resolverContextoEvaluacionActual/,
  /window\.cargarMatrizDesdeContexto\s*=/,
  /window\.resolverYCargarMatrizDeCampana\s*=/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error(
      '[F11.5.3] Validación falló:',
      rule
    );
    process.exit(1);
  }
}

fs.writeFileSync(
  supervisorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.3] OK - carga de matriz conectada al contexto.'
);
console.log(
  '[F11.5.3] OK - matriz/version derivadas del backend.'
);
