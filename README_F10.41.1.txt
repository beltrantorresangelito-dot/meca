MECA F10.41.1 - SERVER BOOT / AUDIO RESIDUAL FIX

PROBLEMA REAL
Al reiniciar MECA:
ReferenceError: ON_API_URL is not defined
server.js:244

CAUSA
Quedó un fragmento legacy duplicado dentro del callback del servidor:

ON_API_URL ||
  (process.env.NODE_ENV === 'production' ...)

La configuración correcta ya existe al inicio como:
const PYTHON_API_URL = ...

CORRECCIÓN
Se elimina exclusivamente el bloque residual/duplicado.
No se cambia la configuración efectiva del Audio Proxy.
No se cambia Generic Query.

VALIDACIONES
- node --check server.js
- ON_API_URL ya no existe como expresión huérfana.
- PYTHON_API_URL se declara una sola vez.
- configuración precede createAudioProxyHandler.
- no queda configuración Python duplicada dentro del request.

APLICAR
Reemplazar server.js.
Copiar el nuevo test.

Luego:
node --check server.js
npm test
node server.js

Después repetir pruebas manuales de Generic Query.
