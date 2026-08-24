MECA F10.28.1 - CORRECCIÓN TEST LEGACY ESCUCHAS

MOTIVO
F10.28 modularizó Audio Proxy.
El test legacy LISTCHAR-F55-006 todavía exigía que
/api/audio/reproducir apareciera inline en server.js.

Eso ya no representa la arquitectura correcta.

ESTA CORRECCIÓN:
- NO modifica server.js.
- NO modifica producción.
- NO modifica Listenings.
- Solo actualiza:
  tests/escuchas.characterization.f52.test.js

NUEVO CONTRATO
1. server.js delega en createAudioProxyHandler / handleAudioProxyRequest.
2. Listenings NO contiene /api/audio/reproducir ni /api/audio/verificar.
3. AudioProxyRoutes SÍ contiene ambas rutas.
4. Los handlers de audio NO vuelven a estar inline en server.js.

APLICACIÓN
Desde C:\MECA_ML\meca-app:

node scripts\fix-f1028-listenings-characterization.js

Luego:

npm test

ESPERADO
703 tests
703 pass
0 fail

Después de confirmar 0 fail se puede continuar con F10.29.
