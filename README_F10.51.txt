MECA F10.51 - HTTP STATIC VIEWS MODULE

MOVIDO FUERA DE server.js
- servirArchivoEstatico
- servirVista
- MIME mapping
- /css/*
- /js/*
- /img/*
- /partials/*
- /
- /login
- /login.html
- /auditor
- /auditor.html
- /supervisor
- /supervisor.html

LIMPIEZA
Se eliminó la duplicación de rutas HTML.

TEST LEGACY ACTUALIZADO
MAILREMOVE-006 ya no exige rutas HTML inline.
Ahora valida el nuevo HttpStaticViews handler.

PERMANECE EN server.js
- /api/health
- routes/registrarRuta legacy
- fallback 404
- orquestación de handlers negocio

server.js: 576 -> 473
reducción: 103

SIGUIENTE
F10.52 - Health module.
