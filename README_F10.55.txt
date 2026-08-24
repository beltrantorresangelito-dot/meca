MECA F10.55 - SERVER SHELL CHARACTERIZATION

No modifica producción.

Hallazgo principal:
server.js ya no es un monolito de negocio.
Ahora es principalmente bootstrap y orquestación.

Antes de seguir reduciendo se congelan:
- CORS
- OPTIONS
- parseo URL
- Bearer token
- autorización
- orden de handlers
- 404
- listen

También se registran imports muertos:
fs, path y registerDomainRoutes.

Si npm test completo queda en 0 fail:
F10.56 hará cleanup conservador.
