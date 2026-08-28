const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5.2] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

if (!/async function enriquecerEvaluacionConContexto\s*\(/.test(source)) {
  console.error('[F11.5.5.2] Falta F11.5.5 aplicada.');
  process.exit(1);
}

const oldCall = `        await API.guardarEvaluacion(evaluacion);`;

const newBlock = `        const evaluacionConContexto =
            await enriquecerEvaluacionConContexto(
                evaluacion
            );

        const validacionContexto =
            validarContextoPersistenciaEvaluacion(
                evaluacionConContexto
            );

        if (!validacionContexto.ok) {
            throw new Error(
                'Contexto de evaluación inválido: ' +
                validacionContexto.error
            );
        }

        await API.guardarEvaluacion(
            evaluacionConContexto
        );`;

if (source.includes(oldCall)) {
  source = source.replace(oldCall, newBlock);
} else if (
  /await API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/m.test(source)
) {
  console.log('[F11.5.5.2] El guardado real ya estaba corregido.');
} else {
  console.error(
    '[F11.5.5.2] No se encontró API.guardarEvaluacion(evaluacion).'
  );
  process.exit(1);
}

const required = [
  /const\s+evaluacionConContexto\s*=/,
  /await\s+enriquecerEvaluacionConContexto\s*\(\s*evaluacion\s*\)/m,
  /validarContextoPersistenciaEvaluacion\s*\(\s*evaluacionConContexto\s*\)/m,
  /Contexto de evaluación inválido/,
  /await\s+API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/m
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.2] Validación falló:', rule);
    process.exit(1);
  }
}

// Guardrail: el guardado real ya no debe enviar el payload sin enriquecer.
if (
  /await\s+API\.guardarEvaluacion\s*\(\s*evaluacion\s*\)/m.test(source)
) {
  console.error(
    '[F11.5.5.2] ERROR: todavía existe guardado directo de evaluacion.'
  );
  process.exit(1);
}

fs.writeFileSync(auditorPath, source, 'utf8');

console.log('[F11.5.5.2] OK - guardado real usa evaluacionConContexto.');
console.log('[F11.5.5.2] OK - contexto validado antes de API.guardarEvaluacion.');
console.log('[F11.5.5.2] OK - wrapper API preservado.');
