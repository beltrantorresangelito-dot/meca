const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

if (!/window\.versionMatrizActualId/.test(source)) {
  console.error('[F11.5.5] Falta F11.5.4 aplicada.');
  process.exit(1);
}

if (!/async function enriquecerEvaluacionConContexto\s*\(/.test(source)) {
  source += `

async function enriquecerEvaluacionConContexto(
    evaluacion,
    escucha = null
) {
    if (!evaluacion || typeof evaluacion !== 'object') {
        throw new Error(
            'La evaluación es obligatoria'
        );
    }

    let contexto =
        window.contextoAuditoriaActual ||
        null;

    const campanaId =
        evaluacion.campana_id ??
        evaluacion.campanaId ??
        escucha?.campana_id ??
        escucha?.campanaId ??
        contexto?.campana_id ??
        contexto?.campanaId ??
        null;

    const fecha =
        evaluacion.fecha ??
        escucha?.fecha ??
        escucha?.fecha_escucha ??
        escucha?.fecha_gestion ??
        null;

    if (!contexto && campanaId) {
        contexto =
            await aplicarContextoAuditoria(
                campanaId,
                fecha
            );
    }

    const matrizId =
        contexto?.matriz_id ??
        contexto?.matrizId ??
        window.matrizActualId ??
        null;

    const versionMatrizId =
        contexto?.matriz_version_id ??
        contexto?.version_matriz_id ??
        contexto?.matrizVersionId ??
        window.versionMatrizActualId ??
        null;

    if (!campanaId) {
        throw new Error(
            'No se puede guardar la evaluación sin campana_id'
        );
    }

    if (!matrizId) {
        throw new Error(
            'No se puede guardar la evaluación sin matriz_id'
        );
    }

    if (!versionMatrizId) {
        throw new Error(
            'No se puede guardar la evaluación sin version_matriz_id'
        );
    }

    return {
        ...evaluacion,

        // Persistencia histórica del contexto.
        campana_id: campanaId,
        matriz_id: matrizId,

        // Contrato backend existente.
        versionMatrizId: versionMatrizId,

        // Alias explícito para capas nuevas.
        version_matriz_id: versionMatrizId
    };
}

function validarContextoPersistenciaEvaluacion(
    evaluacion
) {
    if (!evaluacion) {
        return {
            ok: false,
            error: 'evaluacion requerida'
        };
    }

    const campanaId =
        evaluacion.campana_id ??
        evaluacion.campanaId ??
        null;

    const matrizId =
        evaluacion.matriz_id ??
        evaluacion.matrizId ??
        null;

    const versionMatrizId =
        evaluacion.version_matriz_id ??
        evaluacion.versionMatrizId ??
        null;

    if (!campanaId) {
        return {
            ok: false,
            error: 'campana_id requerido'
        };
    }

    if (!matrizId) {
        return {
            ok: false,
            error: 'matriz_id requerido'
        };
    }

    if (!versionMatrizId) {
        return {
            ok: false,
            error: 'version_matriz_id requerido'
        };
    }

    return {
        ok: true,
        campana_id: campanaId,
        matriz_id: matrizId,
        version_matriz_id: versionMatrizId
    };
}
`;
}

if (!/window\.enriquecerEvaluacionConContexto\s*=/.test(source)) {
  source += `
window.enriquecerEvaluacionConContexto =
    enriquecerEvaluacionConContexto;
`;
}

if (!/window\.validarContextoPersistenciaEvaluacion\s*=/.test(source)) {
  source += `
window.validarContextoPersistenciaEvaluacion =
    validarContextoPersistenciaEvaluacion;
`;
}

const required = [
  /campana_id:\s*campanaId/,
  /matriz_id:\s*matrizId/,
  /versionMatrizId:\s*versionMatrizId/,
  /version_matriz_id:\s*versionMatrizId/,
  /window\.enriquecerEvaluacionConContexto\s*=/,
  /window\.validarContextoPersistenciaEvaluacion\s*=/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5] Validación falló:', rule);
    process.exit(1);
  }
}

fs.writeFileSync(auditorPath, source, 'utf8');

console.log('[F11.5.5] OK - contexto persistible agregado a evaluación.');
console.log('[F11.5.5] OK - campana/matriz/version obligatorias.');
