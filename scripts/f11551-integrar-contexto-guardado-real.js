const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5.1] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

if (
  !/async function enriquecerEvaluacionConContexto\s*\(/.test(source)
) {
  console.error(
    '[F11.5.5.1] Falta F11.5.5 aplicada.'
  );
  process.exit(1);
}

// Detectar construcción del payload de evaluación.
const payloadRegex =
  /(const|let)\s+evaluacion(?:Data|Nueva|Actualizada)?\s*=\s*\{[\s\S]*?\n\s*\};/m;

const match = source.match(payloadRegex);

if (!match) {
  console.error(
    '[F11.5.5.1] No se encontró construcción de payload de evaluación.'
  );
  process.exit(1);
}

const payloadBlock = match[0];
const varMatch = payloadBlock.match(
  /(const|let)\s+([A-Za-z_$][\w$]*)\s*=/
);

if (!varMatch) {
  console.error(
    '[F11.5.5.1] No se pudo identificar variable de payload.'
  );
  process.exit(1);
}

const payloadVar = varMatch[2];

// Evitar doble parche.
if (
  source.includes(
    `await enriquecerEvaluacionConContexto(${payloadVar}`
  )
) {
  console.log(
    '[F11.5.5.1] El payload ya está enriquecido.'
  );
} else {
  const insertion = `${payloadBlock}

        const ${payloadVar}ConContexto =
            await enriquecerEvaluacionConContexto(
                ${payloadVar}
            );

        const validacionContexto =
            validarContextoPersistenciaEvaluacion(
                ${payloadVar}ConContexto
            );

        if (!validacionContexto.ok) {
            throw new Error(
                'Contexto de evaluación inválido: ' +
                validacionContexto.error
            );
        }`;

  source = source.replace(
    payloadBlock,
    insertion
  );

  // Reemplazar uso directo del payload en fetch/body si existe.
  const bodyPatterns = [
    new RegExp(
      `JSON\\.stringify\\(\\s*${payloadVar}\\s*\\)`,
      'g'
    ),
    new RegExp(
      `body:\\s*${payloadVar}\\b`,
      'g'
    )
  ];

  source = source.replace(
    bodyPatterns[0],
    `JSON.stringify(${payloadVar}ConContexto)`
  );

  source = source.replace(
    bodyPatterns[1],
    `body: ${payloadVar}ConContexto`
  );
}

// Guardrails.
const required = [
  new RegExp(
    `await\\s+enriquecerEvaluacionConContexto\\(\\s*${payloadVar}`
  ),
  new RegExp(
    `validarContextoPersistenciaEvaluacion\\(\\s*${payloadVar}ConContexto`
  ),
  new RegExp(
    `JSON\\.stringify\\(\\s*${payloadVar}ConContexto\\s*\\)`
  )
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error(
      '[F11.5.5.1] Validación falló:',
      rule
    );
    process.exit(1);
  }
}

fs.writeFileSync(
  auditorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.5.1] OK - payload real enriquecido antes del guardado.'
);
console.log(
  '[F11.5.5.1] OK - contexto validado antes del POST/UPDATE.'
);
console.log(
  '[F11.5.5.1] Variable detectada:',
  payloadVar
);
