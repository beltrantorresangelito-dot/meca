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

const serverPath = path.join(
  ROOT,
  'server.js'
);

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('[F11.5.1.2] No existe:', filePath);
    process.exit(1);
  }

  return fs.readFileSync(filePath, 'utf8');
}

let routes = readRequired(routesPath);
const server = readRequired(serverPath);

// Producción debe seguir usando createDomainHandler.
if (!/createDomainHandler/.test(routes)) {
  console.error(
    '[F11.5.1.2] domain.routes.js no contiene createDomainHandler.'
  );
  process.exit(1);
}

// Agregar adaptador legacy SOLO en el módulo.
if (!/function registerDomainRoutes\s*\(/.test(routes)) {
  const moduleExportRegex =
    /module\.exports\s*=\s*\{\s*createDomainHandler\s*\};?\s*$/m;

  if (!moduleExportRegex.test(routes)) {
    console.error(
      '[F11.5.1.2] No se encontró export esperado de createDomainHandler.'
    );
    process.exit(1);
  }

  const compatibilityAdapter = `
function registerDomainRoutes(
  targetRoutes,
  {
    service = new DomainService()
  } = {}
) {
  if (!targetRoutes || typeof targetRoutes !== 'object') {
    throw new Error('routes es obligatorio');
  }

  const controller =
    new DomainController(service);

  const definitions = [
    [
      '/api/domain/quiebres',
      controller.listBreaks.bind(controller)
    ],
    [
      '/api/domain/campanas',
      controller.listCampaigns.bind(controller)
    ],
    [
      '/api/domain/matrices',
      controller.listMatrices.bind(controller)
    ],
    [
      '/api/domain/campana-matriz',
      controller.campaignMatrixHistory.bind(controller)
    ],
    [
      '/api/domain/contexto-evaluacion',
      controller.resolveContext.bind(controller)
    ],
    [
      '/api/domain/consistencia',
      controller.consistency.bind(controller)
    ]
  ];

  for (const [routePath, handler] of definitions) {
    targetRoutes[routePath] =
      targetRoutes[routePath] || {};

    targetRoutes[routePath].GET =
      handler;
  }

  return definitions.map(
    ([routePath]) => routePath
  );
}

`;

  routes = routes.replace(
    moduleExportRegex,
    compatibilityAdapter +
    `module.exports = {
  createDomainHandler,
  registerDomainRoutes
};`
  );
}

// Validaciones.
if (!/function registerDomainRoutes\s*\(/.test(routes)) {
  console.error(
    '[F11.5.1.2] No quedó registerDomainRoutes.'
  );
  process.exit(1);
}

if (
  !/module\.exports\s*=\s*\{[\s\S]*createDomainHandler[\s\S]*registerDomainRoutes[\s\S]*\}/m.test(routes)
) {
  console.error(
    '[F11.5.1.2] Export dual inválido.'
  );
  process.exit(1);
}

// MUY IMPORTANTE: server.js no debe usar el adapter legacy.
if (/registerDomainRoutes/.test(server)) {
  console.error(
    '[F11.5.1.2] ERROR: server.js volvió a depender de registerDomainRoutes.'
  );
  process.exit(1);
}

if (!/createDomainHandler/.test(server)) {
  console.error(
    '[F11.5.1.2] ERROR: server.js no usa createDomainHandler.'
  );
  process.exit(1);
}

fs.writeFileSync(
  routesPath,
  routes,
  'utf8'
);

console.log(
  '[F11.5.1.2] OK - registerDomainRoutes restaurado como adapter de compatibilidad.'
);
console.log(
  '[F11.5.1.2] OK - createDomainHandler sigue siendo el contrato de producción.'
);
console.log(
  '[F11.5.1.2] OK - server.js no usa mini-router legacy.'
);
