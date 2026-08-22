MECA - RESTAURACIÓN src/modules/domain/index.js

Problema:
El test backend-domain-module.smoke.f21.test.js ejecuta:

require('../src/modules/domain')

Para que Node resuelva una carpeta como módulo debe existir:
src/modules/domain/index.js

El log demuestra que domain.routes.js sí existe y server.js lo carga, por lo que
no corresponde modificar el test ni reemplazar todo el módulo Domain.

Este paquete agrega/restaura únicamente:
- src/modules/domain/index.js

Exports:
- DomainRepository
- DomainService
- registerDomainRoutes

NO reemplaza:
- domain.repository.js
- domain.service.js
- domain.routes.js
- tests
- server.js
- MatrixModule
- BD

Después:
npm test
