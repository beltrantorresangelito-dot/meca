MECA F10.50 - CHARACTERIZATION HTTP SHELL

OBJETIVO
Congelar el comportamiento residual de infraestructura HTTP antes de extraerlo.

SE PROTEGE

1. ARCHIVOS ESTÁTICOS
- helper servirArchivoEstatico
- public/
- MIME actuales:
  css, js, html, png, jpg, svg, json
- 404 Archivo no encontrado

2. VISTAS
- helper servirVista
- views/
- login.html
- auditor/dashboard.html
- supervisor/dashboard.html
- error 500 al fallar lectura

3. HEALTH
- GET /api/health
- SELECT NOW()
- status/message/version/database/timestamp

4. ROUTING HTML
Se detectó duplicación real:
- / y /login
- /supervisor
- /auditor
aparecen en dos bloques distintos.

5. FALLBACK 404
Permanece al final del callback HTTP.

HALLAZGOS
A) Las rutas HTML duplicadas son código redundante.
B) servirArchivoEstatico y servirVista son infraestructura, no negocio.
C) /api/health aún contiene pool.query directo.
D) registrarRuta/routes sigue siendo un mini-router legacy.

ESTA FASE NO MODIFICA PRODUCCIÓN.

SIGUIENTE PROPUESTO
F10.51 - HttpStaticViews module:
- extraer servirArchivoEstatico
- extraer servirVista
- consolidar rutas HTML duplicadas
sin tocar health todavía.

Después:
F10.52 - Health module.
