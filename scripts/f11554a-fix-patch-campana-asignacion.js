const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5.4A] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

if (!/async function enriquecerEvaluacionConContexto\s*\(/.test(source)) {
  console.error('[F11.5.5.4A] Falta enriquecerEvaluacionConContexto.');
  process.exit(1);
}

// ------------------------------------------------------
// 1. Agregar helper de resolución por asignación si falta.
// ------------------------------------------------------
if (!/async function resolverCampanaDesdeAsignacion\s*\(/.test(source)) {
  const helper = `
async function resolverCampanaDesdeAsignacion(
    ticketPSI
) {
    if (!ticketPSI) {
        return null;
    }

    const ticketBuscado =
        String(ticketPSI).trim();

    // 1) Primero intentar con la colección ya cargada en Auditor.
    const locales =
        Array.isArray(misEscuchasData)
            ? misEscuchasData
            : [];

    let escucha =
        locales.find(item => {
            const ticketItem =
                item?.ticket ??
                item?.ticket_psi ??
                item?.ticketPSI ??
                null;

            return ticketItem !== null &&
                String(ticketItem).trim() === ticketBuscado;
        }) || null;

    // 2) Fallback: consultar asignaciones reales.
    if (!escucha) {
        const token =
            localStorage.getItem('meca_token');

        const response = await fetch(
            '/api/escuchas/asignaciones',
            {
                headers: token
                    ? {
                        Authorization:
                            'Bearer ' + token
                    }
                    : {}
            }
        );

        if (!response.ok) {
            throw new Error(
                'No se pudieron consultar las asignaciones para resolver la campaña'
            );
        }

        const payload = await response.json();

        const asignaciones =
            Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                    ? payload.data
                    : [];

        escucha =
            asignaciones.find(item => {
                const ticketItem =
                    item?.ticket ??
                    item?.ticket_psi ??
                    item?.ticketPSI ??
                    null;

                return ticketItem !== null &&
                    String(ticketItem).trim() === ticketBuscado;
            }) || null;
    }

    if (!escucha) {
        return null;
    }

    const campanaId =
        escucha.campana_id ??
        escucha.campanaId ??
        null;

    return campanaId
        ? {
            campana_id: Number(campanaId),
            escucha
        }
        : null;
}
`;

  const anchor =
    'async function enriquecerEvaluacionConContexto(';

  source = source.replace(
    anchor,
    helper + '\n' + anchor
  );
}

// ------------------------------------------------------
// 2. Reemplazar la función enriquecedora completa.
// ------------------------------------------------------
const start = source.indexOf(
  'async function enriquecerEvaluacionConContexto('
);
const end = source.indexOf(
  'function validarContextoPersistenciaEvaluacion(',
  start
);

if (start < 0 || end < 0) {
  console.error('[F11.5.5.4A] No se pudo aislar enriquecedor.');
  process.exit(1);
}

const newEnricher = `async function enriquecerEvaluacionConContexto(
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

    let campanaId =
        evaluacion.campana_id ??
        evaluacion.campanaId ??
        escucha?.campana_id ??
        escucha?.campanaId ??
        contexto?.campana_id ??
        contexto?.campanaId ??
        null;

    const ticketPSI =
        evaluacion.ticketPSI ??
        evaluacion.ticket_psi ??
        escucha?.ticket ??
        escucha?.ticket_psi ??
        escucha?.ticketPSI ??
        null;

    if (!campanaId && ticketPSI) {
        const resuelta =
            await resolverCampanaDesdeAsignacion(
                ticketPSI
            );

        if (resuelta?.campana_id) {
            campanaId =
                resuelta.campana_id;

            if (!escucha) {
                escucha =
                    resuelta.escucha;
            }
        }
    }

    const fecha =
        evaluacion.fecha ??
        escucha?.fecha ??
        escucha?.fecha_escucha ??
        escucha?.fecha_gestion ??
        null;

    const campanaIdNormalizado =
        campanaId !== null &&
        campanaId !== undefined &&
        String(campanaId).trim() !== ''
            ? Number(campanaId)
            : null;

    if (!contexto && campanaIdNormalizado) {
        contexto =
            await aplicarContextoAuditoria(
                campanaIdNormalizado,
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

    if (!campanaIdNormalizado) {
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
        campana_id: campanaIdNormalizado,
        matriz_id: matrizId,
        versionMatrizId: versionMatrizId,
        version_matriz_id: versionMatrizId
    };
}

`;

source =
  source.slice(0, start) +
  newEnricher +
  source.slice(end);

// ------------------------------------------------------
// 3. Exponer helper para prueba manual.
// ------------------------------------------------------
if (!/window\.resolverCampanaDesdeAsignacion\s*=/.test(source)) {
  source += `
window.resolverCampanaDesdeAsignacion =
    resolverCampanaDesdeAsignacion;
`;
}

// ------------------------------------------------------
// 4. Guardrails corregidos.
// ------------------------------------------------------
const required = [
  /async function resolverCampanaDesdeAsignacion\s*\(/,
  /\/api\/escuchas\/asignaciones/,
  /escucha\.campana_id/,
  /await\s+resolverCampanaDesdeAsignacion\s*\(\s*ticketPSI\s*\)/m,
  /campana_id:\s*campanaIdNormalizado/,
  /API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/m
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.4A] Validación falló:', rule);
    process.exit(1);
  }
}

// El enriquecedor ya no debe depender de DOM para campaña.
const enricherStart = source.indexOf(
  'async function enriquecerEvaluacionConContexto('
);
const enricherEnd = source.indexOf(
  'function validarContextoPersistenciaEvaluacion(',
  enricherStart
);
const enricherBlock = source.slice(
  enricherStart,
  enricherEnd
);

if (/evalCampanaId|document\.getElementById\('campanaId'\)/.test(enricherBlock)) {
  console.error(
    '[F11.5.5.4A] ERROR: el enriquecedor todavía depende del DOM para campaña.'
  );
  process.exit(1);
}

fs.writeFileSync(auditorPath, source, 'utf8');

console.log('[F11.5.5.4A] OK - helper de campaña por asignación presente.');
console.log('[F11.5.5.4A] OK - enriquecedor ya no usa evalCampanaId.');
console.log('[F11.5.5.4A] OK - validación corregida a escucha.campana_id.');
