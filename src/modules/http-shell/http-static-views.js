const fs = require('fs');
const path = require('path');

function createHttpStaticViewsHandler({
  baseDir
} = {}) {
  if (!baseDir) {
    throw new Error(
      'HttpStaticViewsModule requiere baseDir'
    );
  }

  const contentTypes = {
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.html': 'text/html',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
  };

  function serveStatic(route, res) {
    const extension = path.extname(route);
    const fullPath = path.join(baseDir, 'public', route);
    const type = contentTypes[extension] || 'text/plain';

    fs.readFile(fullPath, (error, content) => {
      if (error) {
        res.writeHead(404);
        res.end(JSON.stringify({
          error: 'Archivo no encontrado'
        }));
        return;
      }

      res.writeHead(200, {
        'Content-Type': type
      });
      res.end(content);
    });
  }

  function serveView(viewName, res) {
    const viewPath = path.join(baseDir, 'views', viewName);

    console.log(`[VISTA] Buscando: ${viewPath}`);

    fs.readFile(viewPath, 'utf8', (error, content) => {
      if (error) {
        console.error(
          `[VISTA] Error cargando: ${viewName} - ${error.code}`
        );
        res.writeHead(500);
        res.end(
          `<h1>Error 500</h1><p>No se pudo cargar la vista: ${viewName}</p>`
        );
        return;
      }

      console.log(
        `[VISTA] Cargada: ${viewName} (${content.length} bytes)`
      );
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      res.end(content);
    });
  }

  return async function handleHttpStaticViewsRequest({
    ruta,
    respuesta
  }) {
    if (
      ruta.startsWith('/css/') ||
      ruta.startsWith('/js/') ||
      ruta.startsWith('/img/')
    ) {
      serveStatic(ruta, respuesta);
      return true;
    }

    if (ruta.startsWith('/partials/')) {
      const viewPath =
        ruta.replace(/^\/partials\//, 'partials/');

      console.log(
        `[PARTIAL] Reutilizando servirVista para: ${viewPath}`
      );

      serveView(viewPath, respuesta);
      return true;
    }

    if (
      ruta === '/' ||
      ruta === '/login' ||
      ruta === '/login.html'
    ) {
      serveView('login.html', respuesta);
      return true;
    }

    if (
      ruta === '/auditor' ||
      ruta === '/auditor.html'
    ) {
      serveView('auditor/dashboard.html', respuesta);
      return true;
    }

    if (
      ruta === '/supervisor' ||
      ruta === '/supervisor.html'
    ) {
      serveView('supervisor/dashboard.html', respuesta);
      return true;
    }

    return false;
  };
}

module.exports = {
  createHttpStaticViewsHandler
};
