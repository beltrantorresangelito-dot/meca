MECA F2.10 - FIX LECTURAS VERSIONADAS

Problema detectado en prueba real:
GET /api/matriz/frentes       -> 500 relación "frentes" no existe
GET /api/matriz/atributos     -> 500 relación "atributos" no existe
GET /api/matriz/sub-motivos   -> 500 relación "sub_motivos" no existe

Causa:
Los handlers legacy que se extrajeron en F2.10 ya estaban desalineados con
la BD actual. Las escrituras trabajan sobre:

- version_frentes
- version_atributos
- version_sub_motivos

pero los GET antiguos aún consultaban tablas no versionadas.

Solución:
Las tres lecturas ahora consultan exclusivamente la estructura de la
versión marcada como activa.

Compatibilidad externa:
- version_atributos.version_frente_id se devuelve como frente_id
- version_sub_motivos.version_atributo_id se devuelve como atributo_id

Así supervisor.js no requiere cambios.

Reemplaza:
- src/modules/matrix/matrix.repository.js
- tests/matrix-read-block.f210.test.js

Agrega:
- tests/matrix-versioned-reads.f210fix.test.js

No modifica:
- server.js
- BD
- frontend
- escrituras Matrix

Después:
1. npm test
2. reiniciar servidor
3. repetir los cuatro fetch de F2.10
4. validar edición/eliminación en Administrador de Matriz
