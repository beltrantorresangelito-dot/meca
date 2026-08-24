MECA F10.53 - LEGACY ROUTER CHARACTERIZATION

Fase de caracterización: NO modifica producción.

Objetivo:
demostrar que el antiguo mini-router routes/registrarRuta
ya no tiene rutas registradas después de extraer /api/health.

Si la suite completa queda en 0 fail:
F10.54 eliminará:
- const routes = {};
- function registrarRuta(...);
- branch routes[ruta] del servidor.

El fallback 404 y los handlers modulares permanecen.
