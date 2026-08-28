const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5.3] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

const oldBlock = `    const campanaId =
        evaluacion.campana_id ??
        evaluacion.campanaId ??
        escucha?.campana_id ??
        escucha?.campanaId ??
        contexto?.campana_id ??
        contexto?.campanaId ??
        null;`;

const newBlock = `    const campanaId =
        evaluacion.campana_id ??
        evaluacion.campanaId ??
        escucha?.campana_id ??
        escucha?.campanaId ??
        contexto?.campana_id ??
        contexto?.campanaId ??
        document.getElementById('evalCampanaId')?.value ??
        document.getElementById('campanaId')?.value ??
        null;`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
} else if (source.includes("document.getElementById('evalCampanaId')?.value")) {
  console.log('[F11.5.5.3] Resolución DOM de campana_id ya aplicada.');
} else {
  console.error(
    '[F11.5.5.3] No se encontró bloque campanaId esperado en enriquecedor.'
  );
  process.exit(1);
}

const oldFecha = `    const fecha =
        evaluacion.fecha ??
        escucha?.fecha ??
        escucha?.fecha_escucha ??
        escucha?.fecha_gestion ??
        null;`;

const newFecha = `    const fecha =
        evaluacion.fecha ??
        escucha?.fecha ??
        escucha?.fecha_escucha ??
        escucha?.fecha_gestion ??
        document.getElementById('evalFecha')?.value ??
        null;`;

if (source.includes(oldFecha)) {
  source = source.replace(oldFecha, newFecha);
}

// Normalizar el id numérico para evitar strings vacíos.
const marker = `    if (!contexto && campanaId) {
        contexto =
            await aplicarContextoAuditoria(
                campanaId,
                fecha
            );
    }`;

const replacement = `    const campanaIdNormalizado =
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
    }`;

if (source.includes(marker)) {
  source = source.replace(marker, replacement);
}

source = source.replace(
  `    if (!campanaId) {
        throw new Error(
            'No se puede guardar la evaluación sin campana_id'
        );
    }`,
  `    if (!campanaIdNormalizado) {
        throw new Error(
            'No se puede guardar la evaluación sin campana_id'
        );
    }`
);

source = source.replace(
  `        campana_id: campanaId,`,
  `        campana_id: campanaIdNormalizado,`
);

const required = [
  /document\.getElementById\('evalCampanaId'\)\?\.value/,
  /const campanaIdNormalizado\s*=/,
  /aplicarContextoAuditoria\(\s*campanaIdNormalizado/m,
  /campana_id:\s*campanaIdNormalizado/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.3] Validación falló:', rule);
    process.exit(1);
  }
}

fs.writeFileSync(auditorPath, source, 'utf8');

console.log('[F11.5.5.3] OK - campana_id puede provenir de evalCampanaId.');
console.log('[F11.5.5.3] OK - contexto se resuelve antes del guardado.');
