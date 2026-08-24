MECA F10.6 - PDA FINALIZATION / CLEANUP

OBJETIVO
Cerrar el dominio PDA después de F10.5.

CAMBIOS
- limpieza conservadora de residuos PDA
- suite final de protección
- checklist funcional

REEMPLAZA
- server.js

AGREGA
- tests/pda.finalization.f106.test.js
- CHECKLIST_FUNCIONAL_F10.6.txt
- README_F10.6.txt

MANTIENE POR VÍNCULO FUNCIONAL
- requireToken en pda.routes.js
- tolerancia legacy de listas vacías en Controller
- cálculo de progreso en Service
- SQL PDA en Repository

NO SE CONSERVA
- handlers PDA inline
- código legacy ajeno al módulo

server.js: 1744 -> 1744
reducción por limpieza: 0

EJECUTAR
npm test

DESPUÉS
Completar CHECKLIST_FUNCIONAL_F10.6.txt.

Si todo está OK:
PDA queda cerrado dentro de F10.
