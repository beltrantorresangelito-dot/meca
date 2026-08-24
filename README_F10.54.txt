MECA F10.54 - LEGACY ROUTER REMOVAL

ELIMINADO DE server.js
- const routes = {}
- registerDomainRoutes(routes)
- function registrarRuta(...)
- branch routes[ruta] && routes[ruta][metodo]

MOTIVO
F10.53 confirmó 0 llamadas activas a registrarRuta.

SE MANTIENE
- autorización central
- handlers modulares
- Health Module
- HttpStaticViews
- fallback 404

NOTA
registerDomainRoutes(routes) dependía del mapa legacy.
Al retirar ese mapa, esas rutas deben estar ya cubiertas por sus
módulos actuales; la suite completa es el criterio de seguridad.

server.js: 462 -> 436
reducción: 26
