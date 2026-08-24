# MECA — Guardrails del composition root

## Propósito

`server.js` queda formalmente definido como **composition root + HTTP shell + bootstrap**.

No debe volver a asumir responsabilidades de negocio.

## Reglas permanentes

1. No agregar SQL directo a `server.js`.
2. No declarar funciones de negocio inline.
3. No recrear `routes`, `registrarRuta()` ni `registerDomainRoutes`.
4. Toda nueva funcionalidad debe entrar mediante un módulo/handler.
5. CORS, validación Bearer y autorización central deben mantenerse.
6. El fallback `404` debe permanecer.
7. `server.js` no debe superar 450 líneas sin una revisión arquitectónica explícita.
8. No volver a agregar residuos como `nodemailer` sin una funcionalidad real modular.
9. No agregar dependencias muertas al composition root.
10. Los handlers deben componerse fuera del callback HTTP.

## Flujo recomendado para nuevas funcionalidades

Nueva capacidad
→ módulo propio
→ repository/service/controller/routes cuando corresponda
→ factory `createXHandler`
→ composición en bootstrap
→ dispatcher en `server.js`
→ tests de contrato + regresión

## Regla de revisión

Si una nueva capacidad requiere más de un pequeño bloque de composición
en `server.js`, su implementación está en el lugar equivocado.

## Objetivo

Evitar que MECA vuelva al patrón original de monolito técnico.
