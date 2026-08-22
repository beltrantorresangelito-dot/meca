F2.1 FIX - API ASÍNCRONA CONSISTENTE

Reemplaza:
- src/modules/domain/domain.service.js
- tests/backend-domain-module.f21.test.js

No toca BD, server.js ni frontend.

Motivo:
listCampaigns/listMatrices/getCampaignMatrixHistory podían lanzar VALIDATION_ERROR
sincrónicamente, mientras otros métodos devolvían Promise rechazada.

Después:
npm test

DOMMOD-001 debe pasar.
