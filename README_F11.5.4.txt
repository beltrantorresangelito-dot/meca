MECA F11.5.4 - AUDITOR USA MATRIZ RESUELTA POR CONTEXTO

OBJETIVO
Permitir que Auditor derive matriz y versión desde:
- campana_id de la escucha
- fecha de la escucha/evaluación

NUEVOS HELPERS

resolverContextoAuditoria(campanaId, fecha)

aplicarContextoAuditoria(campanaId, fecha)

resolverContextoDesdeEscucha(escucha)

FLUJO

escucha.campana_id
  -> /api/domain/contexto-evaluacion
  -> contexto
  -> matriz_id
  -> matriz_version_id
  -> window.matrizActualId
  -> window.versionMatrizActualId

NO SE TOCA
obtenerCuartil()
97 / 90 / 85 permanecen iguales.

APLICACIÓN

Copiar:
scripts/f1154-auditor-contexto-matriz.js
tests/auditor-contexto-matriz.f1154.test.js

Ejecutar:

node --check scripts\f1154-auditor-contexto-matriz.js
node scripts\f1154-auditor-contexto-matriz.js

node --test tests\auditor-contexto-matriz.f1154.test.js
npm test

PRUEBA FUNCIONAL EN AUDITOR

Con una escucha real cargada, ejecutar:

const e = {
  campana_id: 1,
  fecha: '2026-08-24'
}

const ctx = await resolverContextoDesdeEscucha(e)
ctx

Luego:

console.log(window.contextoAuditoriaActual)
console.log(window.matrizActualId)
console.log(window.versionMatrizActualId)

ESPERADO PARA EL CASO VALIDADO
matrizActualId = 1
versionMatrizActualId = 7

SIGUIENTE
F11.5.5 integrará este contexto con la persistencia de la evaluación.
