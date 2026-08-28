const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const routesPath = path.join(
  ROOT,
  'src',
  'modules',
  'domain',
  'domain.routes.js'
);
const serverPath = path.join(ROOT, 'server.js');

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('[F11.5.1.1] No existe:', filePath);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

let server = readRequired(serverPath);
const currentRoutes = readRequired(routesPath);

if (!/registerDomainRoutes/.test(currentRoutes)) {
  if (/createDomainHandler/.test(currentRoutes)) {
    console.log(
      '[F11.5.1.1] domain.routes.js ya está en patrón modular.'
    );
  } else {
    console.error(
      '[F11.5.1.1] domain.routes.js no coincide con el estado esperado.'
    );
    process.exit(1);
  }
} else {
  const modernRoutes = `const DomainService = require('./domain.service');
const DomainController = require('./domain.controller');

function createDomainHandler({
  service = new DomainService()
} = {}) {
  const controller = new DomainController(service);

  const routes = new Map([
    ['/api/domain/quiebres', controller.listBreaks.bind(controller)],
    ['/api/domain/campanas', controller.listCampaigns.bind(controller)],
    ['/api/domain/matrices', controller.listMatrices.bind(controller)],
    ['/api/domain/campana-matriz', controller.campaignMatrixHistory.bind(controller)],
    ['/api/domain/contexto-evaluacion', controller.resolveContext.bind(controller)],
    ['/api/domain/consistencia', controller.consistency.bind(controller)]
  ]);

  return async function handleDomainRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query
  }) {
    if (metodo !== 'GET') {
      return false;
    }

    const handler = routes.get(ruta);

    if (!handler) {
      return false;
    }

    await handler(
      peticion,
      respuesta,
      query || {}
    );

    return true;
  };
}

module.exports = {
  createDomainHandler
};
`;

  fs.writeFileSync(
    routesPath,
    modernRoutes,
    'utf8'
  );

  console.log(
    '[F11.5.1.1] domain.routes.js convertido a createDomainHandler.'
  );
}

// Import en server.js
const importLine =
  "const { createDomainHandler } = require('./src/modules/domain/domain.routes');";

if (!server.includes(importLine)) {
  const anchor =
    "const { createHealthHandler } = require('./src/modules/health');";

  if (!server.includes(anchor)) {
    console.error(
      '[F11.5.1.1] No se encontró anchor de imports en server.js.'
    );
    process.exit(1);
  }

  server = server.replace(
    anchor,
    anchor + '\n' + importLine
  );
}

// Instancia
const instanceLine =
  "const handleDomainRequest = createDomainHandler();";

if (!server.includes(instanceLine)) {
  const anchor =
    "const handleHealthRequest = createHealthHandler({ db: pool });";

  if (!server.includes(anchor)) {
    console.error(
      '[F11.5.1.1] No se encontró anchor de composición en server.js.'
    );
    process.exit(1);
  }

  server = server.replace(
    anchor,
    anchor + '\n' + instanceLine
  );
}

// Dispatch: inmediatamente después de Health.
if (!server.includes('await handleDomainRequest({')) {
  const healthBlockRegex =
    /(\s+if\s*\(\s*await\s+handleHealthRequest\s*\(\s*\{[\s\S]*?\}\s*\)\s*\)\s*\{\s*return;\s*\}\s*)/m;

  const match = server.match(healthBlockRegex);

  if (!match) {
    console.error(
      '[F11.5.1.1] No se encontró el dispatch de Health en server.js.'
    );
    process.exit(1);
  }

  const domainDispatch = `
    if (await handleDomainRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

`;

  server = server.replace(
    match[0],
    match[0] + domainDispatch
  );
}

// Guardrails.
const forbidden = [
  /registerDomainRoutes/,
  /const routes\s*=\s*\{\}/,
  /routes\[ruta\]/
];

for (const pattern of forbidden) {
  if (pattern.test(server)) {
    console.error(
      '[F11.5.1.1] ERROR: reapareció infraestructura legacy en server.js:',
      pattern
    );
    process.exit(1);
  }
}

const required = [
  /createDomainHandler/,
  /handleDomainRequest/,
  /query:\s*urlParseada\.query/
];

for (const pattern of required) {
  if (!pattern.test(server)) {
    console.error(
      '[F11.5.1.1] ERROR: falta integración Domain:',
      pattern
    );
    process.exit(1);
  }
}

fs.writeFileSync(
  serverPath,
  server,
  'utf8'
);

console.log(
  '[F11.5.1.1] OK - Domain conectado al HTTP shell.'
);
console.log(
  '[F11.5.1.1] OK - mini-router legacy NO reintroducido.'
);
