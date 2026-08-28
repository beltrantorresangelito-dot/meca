const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5.4] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

if (!/async function enriquecerEvaluacionConContexto\s*\(/.test(source)) {
  console.error('[F11.5.5.4] Falta enriquecedor de F11.5.5.');
  process.exit(1);
}

// 1. Helper que obtiene la asignación real por ticket.
if (!/async function resolverCampanaDesdeAsignacion\s*\(/.test(source)) {
  const helper = `
async function resolverCampanaDesdeAsignacion(
    ticketPSI
) {
    if (!ticketPSI) {
        return null;
    }

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

    const ticketBuscado =
        String(ticketPSI).trim();

    const escucha =
        asignaciones.find(item => {
            const ticketItem =
                item?.ticket ??
                item?.ticket_psi ??
                item?.ticketPSI ??
                null;

            return ticketItem !== null &&
                String(ticketItem).trim() === ticketBuscado;
        }) || null;

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

// 2. Sustituir cabecera de resolución de campaña dentro del enriquecedor.
const start = source.indexOf(
  'async function enriquecerEvaluacionConContexto('
);
const end = source.indexOf(
  'function validarContextoPersistenciaEvaluacion(',
  start
);

if (start < 0 || end < 0) {
  console.error('[F11.5.5.4] No se pudo aislar el enriquecedor.');
  process.exit(1);
}

let block = source.slice(start, end);

const campanaStart = block.indexOf(
  '    const campanaId ='
);

const fechaStart = block.indexOf(
  '    const fecha ='
);

if (campanaStart < 0 || fechaStart < 0 || fechaStart <= campanaStart) {
  console.error('[F11.5.5.4] No se encontró resolución actual de campanaId.');
  process.exit(1);
}

const newCampaignLogic = `    let campanaId =
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

`;

block = (
  block.slice(0, campanaStart) +
  newCampaignLogic +
  block.slice(fechaStart)
);

// 3. Asegurar normalización.
if (!/const campanaIdNormalizado\s*=/.test(block)) {
  const contextMarker =
    '    if (!contexto && campanaId) {';

  if (block.includes(contextMarker)) {
    block = block.replace(
      contextMarker,
`    const campanaIdNormalizado =
        campanaId !== null &&
        campanaId !== undefined &&
        String(campanaId).trim() !== ''
            ? Number(campanaId)
            : null;

    if (!contexto && campanaIdNormalizado) {`
    );

    block = block.replace(
      /aplicarContextoAuditoria\(\s*campanaId,\s*fecha\s*\)/m,
      `aplicarContextoAuditoria(
                campanaIdNormalizado,
                fecha
            )`
    );
  }
}

// If previous F11.5.5.3 already normalized, make sure it no longer uses DOM as source.
block = block.replace(
  /\s*\?\?\s*document\.getElementById\('evalCampanaId'\)\?\.value/g,
  ''
);
block = block.replace(
  /\s*\?\?\s*document\.getElementById\('campanaId'\)\?\.value/g,
  ''
);

// 4. Ensure guard and payload use normalized value.
block = block.replace(
  /if\s*\(!campanaId\)\s*\{\s*throw new Error\(\s*'No se puede guardar la evaluación sin campana_id'\s*\);\s*\}/m,
  `if (!campanaIdNormalizado) {
        throw new Error(
            'No se puede guardar la evaluación sin campana_id'
        );
    }`
);

block = block.replace(
  /campana_id:\s*campanaId\b/g,
  'campana_id: campanaIdNormalizado'
);

source =
  source.slice(0, start) +
  block +
  source.slice(end);

// 5. Exponer helper para prueba funcional.
if (!/window\.resolverCampanaDesdeAsignacion\s*=/.test(source)) {
  source += `
window.resolverCampanaDesdeAsignacion =
    resolverCampanaDesdeAsignacion;
`;
}

const required = [
  /async function resolverCampanaDesdeAsignacion\s*\(/,
  /\/api\/escuchas\/asignaciones/,
  /item\?\.campana_id/,
  /await\s+resolverCampanaDesdeAsignacion\s*\(\s*ticketPSI\s*\)/m,
  /campana_id:\s*campanaIdNormalizado/,
  /API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/m
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.4] Validación falló:', rule);
    process.exit(1);
  }
}

fs.writeFileSync(auditorPath, source, 'utf8');

console.log('[F11.5.5.4] OK - campaña resuelta desde asignación por ticket.');
console.log('[F11.5.5.4] OK - ya no depende de #evalCampanaId.');
