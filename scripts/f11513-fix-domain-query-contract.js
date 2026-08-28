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
  console.error('[F11.5.1.3] No existe supervisor.js');
  process.exit(1);
}

let source = fs.readFileSync(
  supervisorPath,
  'utf8'
);

const oldContract =
  "'/api/domain/campanas?quiebre_id=' +";

const newContract =
  "'/api/domain/campanas?quiebreId=' +";

if (!source.includes(oldContract)) {
  if (source.includes(newContract)) {
    console.log(
      '[F11.5.1.3] El contrato quiebreId ya estaba corregido.'
    );
  } else {
    console.error(
      '[F11.5.1.3] No se encontró el helper esperado de campañas.'
    );
    process.exit(1);
  }
} else {
  source = source.replace(
    oldContract,
    newContract
  );
}

if (
  /\/api\/domain\/campanas\?quiebre_id=/.test(source)
) {
  console.error(
    '[F11.5.1.3] ERROR: todavía queda quiebre_id en la URL del endpoint Domain.'
  );
  process.exit(1);
}

if (
  !/\/api\/domain\/campanas\?quiebreId=/.test(source)
) {
  console.error(
    '[F11.5.1.3] ERROR: no quedó el contrato quiebreId.'
  );
  process.exit(1);
}

fs.writeFileSync(
  supervisorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.1.3] OK - /api/domain/campanas usa quiebreId.'
);
console.log(
  '[F11.5.1.3] OK - no se modificó el backend.'
);
