const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const repoPath = path.join(
  ROOT,
  'src',
  'modules',
  'evaluations',
  'evaluations.repository.js'
);

if (!fs.existsSync(repoPath)) {
  console.error('[F11.5.5.5B] No existe evaluations.repository.js');
  process.exit(1);
}

let source = fs.readFileSync(repoPath, 'utf8');

const oldInsert = `      INSERT INTO evaluaciones (
        id,
        timestamp,
        fecha,
        fecha_formateada,
        ticket_psi,
        agente,
        evaluador,
        id_llamada,
        fecha_descarga,
        total_enc,
        total_ecuf,
        total_ecn,
        nota_final,
        rango,
        tiempo_auditoria,
        tiempo_auditoria_formateado,
        fecha_registro,
        version_matriz_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,$17,$18
      )
    `;

const newInsert = `      INSERT INTO evaluaciones (
        id,
        timestamp,
        fecha,
        fecha_formateada,
        ticket_psi,
        agente,
        evaluador,
        id_llamada,
        fecha_descarga,
        total_enc,
        total_ecuf,
        total_ecn,
        nota_final,
        rango,
        tiempo_auditoria,
        tiempo_auditoria_formateado,
        fecha_registro,
        campana_id,
        matriz_id,
        version_matriz_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
    `;

if (source.includes(oldInsert)) {
  source = source.replace(oldInsert, newInsert);
} else if (
  /INSERT INTO evaluaciones[\s\S]*campana_id[\s\S]*matriz_id[\s\S]*version_matriz_id/.test(source)
) {
  console.log('[F11.5.5.5B] Columnas ya estaban agregadas.');
} else {
  console.error(
    '[F11.5.5.5B] No se encontró el INSERT esperado.'
  );
  process.exit(1);
}

const oldTail = `      evaluacion.fechaRegistro,
      evaluacion.versionMatrizId || null
    ]);`;

const newTail = `      evaluacion.fechaRegistro,
      evaluacion.campana_id ??
        evaluacion.campanaId ??
        null,
      evaluacion.matriz_id ??
        evaluacion.matrizId ??
        null,
      evaluacion.version_matriz_id ??
        evaluacion.versionMatrizId ??
        null
    ]);`;

if (source.includes(oldTail)) {
  source = source.replace(oldTail, newTail);
} else if (
  /evaluacion\.campana_id[\s\S]*evaluacion\.matriz_id[\s\S]*evaluacion\.version_matriz_id/.test(source)
) {
  console.log('[F11.5.5.5B] Parámetros ya estaban agregados.');
} else {
  console.error(
    '[F11.5.5.5B] No se encontró cola de parámetros esperada.'
  );
  process.exit(1);
}

const required = [
  /campana_id/,
  /matriz_id/,
  /version_matriz_id/,
  /\$18,\$19,\$20/,
  /evaluacion\.campana_id/,
  /evaluacion\.matriz_id/,
  /evaluacion\.version_matriz_id/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.5B] Validación falló:', rule);
    process.exit(1);
  }
}

fs.writeFileSync(repoPath, source, 'utf8');

console.log(
  '[F11.5.5.5B] OK - repository persiste campana_id, matriz_id y version_matriz_id.'
);
