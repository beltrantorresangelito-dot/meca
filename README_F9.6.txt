MECA F9.6 - REQUESTS FINALIZATION / CLEANUP

OBJETIVO
Cerrar el dominio Requests después de F9.5.

CAMBIOS
- Limpieza conservadora de residuos/comentarios legacy de Requests.
- Suite final de protección.
- Checklist funcional.

REEMPLAZA
- server.js

AGREGA
- tests/requests.finalization.f96.test.js
- CHECKLIST_FUNCIONAL_F9.6.txt
- README_F9.6.txt

MANTIENE POR VÍNCULO FUNCIONAL
- requireToken en requests.routes.js.
- readJsonBody en requests.routes.js.
- createDynamic en requests.repository.js mientras siga siendo contrato vigente.

NO SE CONSERVA
- código legacy ajeno al módulo Requests.

server.js:
1948 -> 1948
reducción por limpieza: 0

EJECUTAR
npm test

DESPUÉS
Completar CHECKLIST_FUNCIONAL_F9.6.txt.

Si todo está OK:
F9 Requests queda cerrado.
