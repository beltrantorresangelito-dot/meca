MECA F10.58 - SERVER COMPOSITION GUARDRAILS

OBJETIVO
Convertir en reglas automáticas la arquitectura lograda hasta F10.57.

NO MODIFICA PRODUCCIÓN.

AGREGA
tests/server-composition.guardrails.f1058.test.js
ARCHITECTURE_GUARDRAILS.md

PROTEGE
- sin SQL directo;
- sin funciones de negocio inline;
- sin mini-router legacy;
- handlers compuestos fuera del request;
- seguridad transversal;
- fallback 404;
- límite <450 líneas;
- sin nodemailer residual;
- sin imports muertos conocidos.

CRITERIO
npm test completo = 0 fail.

SIGUIENTE
Con F10.58 cerrado, Fase 10 puede considerarse técnicamente madura
en cuanto a saneamiento del server shell. El siguiente trabajo debe
volver al roadmap funcional/arquitectónico global, no seguir reduciendo
server.js por tamaño.
