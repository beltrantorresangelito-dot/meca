MECA F11.5.3 - CONTEXTO -> CARGA EFECTIVA DE MATRIZ/VERSIÓN

OBJETIVO
Tomar el contexto ya resuelto por backend y usar:

matriz_id
matriz_version_id

como fuente de verdad para la carga de matriz.

NUEVOS HELPERS

cargarMatrizDesdeContexto(contexto)

resolverYCargarMatrizDeCampana(campanaId, fecha)

FLUJO

campanaId
  -> resolverContextoEvaluacionActual()
  -> contexto
  -> matriz_id
  -> matriz_version_id
  -> loader de matriz existente

COMPATIBILIDAD

El helper intenta reutilizar loaders existentes expuestos en window:

cargarMatrizVersion
cargarMatrizPorVersion
cargarMatriz

Si ninguno existe, no inventa una carga nueva:
devuelve un objeto indicando que no hay loader compatible.

APLICACIÓN

Copiar:
scripts/f1153-contexto-carga-matriz.js
tests/contexto-carga-matriz.f1153.test.js

Ejecutar:

node --check scripts\f1153-contexto-carga-matriz.js
node scripts\f1153-contexto-carga-matriz.js

node --test tests\contexto-carga-matriz.f1153.test.js
npm test

PRUEBA FUNCIONAL EN SUPERVISOR

const r = await resolverYCargarMatrizDeCampana(1)
r

Luego:

console.log(window.matrizActualId)
console.log(window.versionMatrizActualId)

ESPERADO
matrizActualId = 1
versionMatrizActualId = 7

Si resultado.cargada = false, compartir el objeto.
Eso significará que debemos identificar y conectar el loader real
en F11.5.3.1, sin inventar uno nuevo.
