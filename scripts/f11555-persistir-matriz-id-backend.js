const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const serverPath = path.join(ROOT, 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error('[F11.5.5.5] No existe server.js');
  process.exit(1);
}

let source = fs.readFileSync(serverPath, 'utf8');

// Queremos encontrar el INSERT real de evaluaciones.
const insertMatch = source.match(
  /INSERT\s+INTO\s+evaluaciones\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/im
);

if (!insertMatch) {
  console.error(
    '[F11.5.5.5] No se encontró INSERT INTO evaluaciones en server.js.'
  );
  process.exit(1);
}

const fullInsert = insertMatch[0];
const columns = insertMatch[1];
const values = insertMatch[2];

// Si matriz_id ya existe, no tocar.
if (/\bmatriz_id\b/i.test(columns)) {
  console.log('[F11.5.5.5] INSERT ya contiene matriz_id.');
} else {
  // Detectar posición de version_matriz_id para insertar matriz_id antes.
  const colList = columns.split(',').map(s => s.trim());
  const valList = values.split(',').map(s => s.trim());

  const versionIdx = colList.findIndex(
    c => /version_matriz_id/i.test(c)
  );

  if (versionIdx < 0) {
    console.error(
      '[F11.5.5.5] INSERT no contiene version_matriz_id; no se puede parchear seguro.'
    );
    process.exit(1);
  }

  colList.splice(versionIdx, 0, 'matriz_id');

  // El valor nuevo debe venir del payload ya enriquecido.
  // Para no renumerar SQL manualmente, detectamos placeholders $N.
  const nums = valList
    .map(v => {
      const m = v.match(/^\$(\d+)$/);
      return m ? Number(m[1]) : null;
    });

  if (nums.some(n => n === null)) {
    console.error(
      '[F11.5.5.5] VALUES no usa placeholders simples $N; parche automático abortado.'
    );
    process.exit(1);
  }

  // Insertar placeholder en posición versionIdx y renumerar siguientes.
  const newVals = [];
  for (let i = 0; i < valList.length + 1; i++) {
    newVals.push(`$${i + 1}`);
  }

  const newInsert =
    'INSERT INTO evaluaciones (' +
    '\n            ' + colList.join(',\n            ') +
    '\n        ) VALUES (' +
    '\n            ' + newVals.join(',\n            ') +
    '\n        )';

  source = source.replace(fullInsert, newInsert);
}

// Agregar lectura del payload matriz_id cerca de versionMatrizId.
if (!/\bmatrizId\b\s*=\s*.*matriz_id/s.test(source)) {
  const anchorRegex =
    /(const\s+versionMatrizId\s*=\s*[\s\S]*?;\s*)/m;

  const anchor = source.match(anchorRegex);

  if (!anchor) {
    console.error(
      '[F11.5.5.5] No se encontró resolución de versionMatrizId.'
    );
    process.exit(1);
  }

  const addition = `
        const matrizId =
            data.matriz_id ??
            data.matrizId ??
            null;

`;

  source = source.replace(
    anchor[0],
    anchor[0] + addition
  );
}

// Agregar matrizId al arreglo de parámetros del INSERT.
// Buscamos el bloque de params cercano al INSERT por presencia de versionMatrizId.
const paramsRegex =
  /(\[[\s\S]{0,1800}?versionMatrizId[\s\S]{0,1800}?\])/m;

const paramsMatch = source.match(paramsRegex);

if (!paramsMatch) {
  console.error(
    '[F11.5.5.5] No se encontró arreglo de parámetros del INSERT.'
  );
  process.exit(1);
}

let paramsBlock = paramsMatch[1];

if (!/\bmatrizId\b/.test(paramsBlock)) {
  paramsBlock = paramsBlock.replace(
    /\bversionMatrizId\b/,
    'matrizId,\n            versionMatrizId'
  );

  source = source.replace(
    paramsMatch[1],
    paramsBlock
  );
}

// Guardrails.
const required = [
  /INSERT\s+INTO\s+evaluaciones\s*\([\s\S]*\bmatriz_id\b/im,
  /const\s+matrizId\s*=/,
  /data\.matriz_id/,
  /matrizId,\s*[\r\n\s]*versionMatrizId/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.5] Validación falló:', rule);
    process.exit(1);
  }
}

fs.writeFileSync(serverPath, source, 'utf8');

console.log('[F11.5.5.5] OK - backend preparado para matriz_id.');
