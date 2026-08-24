MECA F10.42 - CHARACTERIZATION GENERIC RPC

OBJETIVO
Congelar el comportamiento actual de:
POST /api/rpc/:functionName

ESTA FASE NO MODIFICA PRODUCCIÓN.

CONTRATOS DETECTADOS

A) cerrar_mes
- acepta anio/mes o p_anio/p_mes.
- usuario fallback actual: 'admin'.
- ejecuta SELECT cerrar_mes($1,$2,$3) as resultado.
- devuelve directamente result.rows[0].resultado.

B) limpiar_sesiones_expiradas
- no llama una función PostgreSQL.
- ejecuta UPDATE sesiones_activas.
- cierra sesiones activas con más de 30 minutos.
- devuelve {data:{limpiadas:rowCount},error:null}.

C) fallback RPC genérico
- sanitiza functionName a [a-zA-Z0-9_].
- params desde JSON body o {}.
- genera $1,$2,...
- SELECT * FROM functionName(params)
- o SELECT * FROM functionName()
- devuelve {data:rows,error:null}.

ERROR
- HTTP 500.
- {error,code}.

RIESGOS REGISTRADOS
1. RPC genérico permite invocar cualquier nombre compatible con \w+
   que exista en PostgreSQL; no hay allowlist funcional.
2. limpiar_sesiones_expiradas es en realidad SQL especial, no RPC real.
3. cerrar_mes conserva fallback de usuario 'admin'; debe revisarse en hardening.

RESIDUO TRANSVERSAL
nodemailer/createTransport sigue dentro del callback de request.
No se toca en F10.42.

SIGUIENTE
F10.43 - GenericRpcRepository.
