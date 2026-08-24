MECA F10.12 - QUARTILE CRITERIA FINALIZATION / CLEANUP

OBJETIVO
Cerrar el dominio Criterios de Cuartiles después de F10.11.

CAMBIOS
- limpieza conservadora
- suite final de protección
- checklist funcional

REEMPLAZA
- server.js

AGREGA
- tests/quartile-criteria.finalization.f1012.test.js
- CHECKLIST_FUNCIONAL_F10.12.txt
- README_F10.12.txt

MANTIENE POR VÍNCULO FUNCIONAL
- requireToken y readJsonBody en routes
- fecha vigente en Service
- HTTP/mensajes/404 en Controller
- SQL y defaults legacy en Repository
- desactivación lógica

NO SE CONSERVA
- handlers inline
- código legacy ajeno al dominio

server.js: 1501 -> 1501
reducción por limpieza: 0

EJECUTAR
npm test

DESPUÉS
Completar CHECKLIST_FUNCIONAL_F10.12.txt.

Si todo está OK:
Criterios de Cuartiles queda cerrado dentro de F10.
