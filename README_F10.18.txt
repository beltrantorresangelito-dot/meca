MECA F10.18 - VERSIONS FINALIZATION / CLEANUP

OBJETIVO
Cerrar el dominio Versiones del Sistema después de F10.17.

CAMBIOS
- limpieza conservadora
- suite final de protección
- checklist funcional

REEMPLAZA
- server.js

AGREGA
- tests/versions.finalization.f1018.test.js
- CHECKLIST_FUNCIONAL_F10.18.txt
- README_F10.18.txt

MANTIENE POR VÍNCULO FUNCIONAL
- requireToken/readJsonBody/query tipo en routes
- HTTP y 404 en Controller
- activación exclusiva en Service
- SQL y legacy vigente en Repository
- DELETE físico actual

NO SE CONSERVA
- handlers inline
- código legacy ajeno al dominio

server.js: 1360 -> 1360
reducción por limpieza: 0

EJECUTAR
npm test

DESPUÉS
Completar CHECKLIST_FUNCIONAL_F10.18.txt.

Si todo está OK:
Versiones del Sistema queda cerrado dentro de F10.
