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
  console.error('[F11.5.1] No existe supervisor.js');
  process.exit(1);
}

let source = fs.readFileSync(
  supervisorPath,
  'utf8'
);

// ------------------------------------------------------
// 1. Inyectar helper centralizado de campañas por quiebre.
// ------------------------------------------------------
const anchor =
  'window.obtenerCampanas = obtenerCampanas;';

if (!source.includes(anchor)) {
  console.error(
    '[F11.5.1] No se encontró el anchor window.obtenerCampanas'
  );
  process.exit(1);
}

if (!source.includes('async function obtenerCampanasPorQuiebre')) {
  const helper = `
async function obtenerCampanasPorQuiebre(quiebreId) {
    if (!quiebreId) {
        return [];
    }

    try {
        const token = localStorage.getItem('meca_token');

        const response = await fetch(
            '/api/domain/campanas?quiebre_id=' +
            encodeURIComponent(quiebreId),
            {
                headers: token
                    ? { Authorization: 'Bearer ' + token }
                    : {}
            }
        );

        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                'No se pudieron obtener campañas del quiebre: ' +
                response.status +
                ' ' +
                body
            );
        }

        const payload = await response.json();

        if (Array.isArray(payload)) {
            return payload;
        }

        if (Array.isArray(payload.data)) {
            return payload.data;
        }

        return [];
    } catch (error) {
        console.error(
            '❌ Error obteniendo campañas por quiebre:',
            error
        );
        return [];
    }
}

async function cargarCampanasPorQuiebreEnSelect(
    quiebreId,
    selectId,
    {
        incluirTodos = false,
        placeholder = 'Seleccione campaña'
    } = {}
) {
    const select = document.getElementById(selectId);

    if (!select) {
        return [];
    }

    const campanas =
        await obtenerCampanasPorQuiebre(quiebreId);

    select.innerHTML = '';

    const optionInicial =
        document.createElement('option');

    optionInicial.value = '';
    optionInicial.textContent =
        incluirTodos
            ? 'Todas las campañas'
            : placeholder;

    select.appendChild(optionInicial);

    for (const campana of campanas) {
        const option =
            document.createElement('option');

        option.value = String(campana.id);

        option.textContent =
            campana.descripcion
                ? campana.codigo +
                  ' - ' +
                  campana.descripcion
                : campana.codigo;

        option.dataset.codigo =
            campana.codigo || '';

        option.dataset.quiebreId =
            campana.quiebre_id || quiebreId;

        select.appendChild(option);
    }

    return campanas;
}

`;

  source = source.replace(
    anchor,
    helper + anchor
  );
}

// ------------------------------------------------------
// 2. Exposición global explícita.
// ------------------------------------------------------
if (
  !source.includes(
    'window.obtenerCampanasPorQuiebre = obtenerCampanasPorQuiebre;'
  )
) {
  source = source.replace(
    'window.obtenerCampanas = obtenerCampanas;',
    `window.obtenerCampanas = obtenerCampanas;
window.obtenerCampanasPorQuiebre =
    obtenerCampanasPorQuiebre;
window.cargarCampanasPorQuiebreEnSelect =
    cargarCampanasPorQuiebreEnSelect;`
  );
}

// ------------------------------------------------------
// 3. Guardrail: no se toca la función legacy obtenerCampanas.
// ------------------------------------------------------
if (!/async function obtenerCampanas\s*\(/.test(source)) {
  console.error(
    '[F11.5.1] obtenerCampanas legacy no encontrada; abortando.'
  );
  process.exit(1);
}

// ------------------------------------------------------
// 4. Validaciones antes de escribir.
// ------------------------------------------------------
const required = [
  /\/api\/domain\/campanas\?quiebre_id=/,
  /obtenerCampanasPorQuiebre/,
  /cargarCampanasPorQuiebreEnSelect/,
  /dataset\.quiebreId/,
  /window\.obtenerCampanasPorQuiebre/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error(
      '[F11.5.1] Validación falló:',
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
  '[F11.5.1] OK - helper Quiebre -> Campañas agregado.'
);
console.log(
  '[F11.5.1] OK - obtenerCampanas legacy preservado.'
);
console.log(
  '[F11.5.1] OK - backend /api/domain/campanas es fuente de verdad.'
);
