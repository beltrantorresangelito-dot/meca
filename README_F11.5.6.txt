MECA F11.5.6 - INVENTARIO CONTROLADO DEL CAMPO CAMPANA

OBJETIVO
Determinar dónde sigue existiendo el campo textual campana y separar:
- campana_id: clave de dominio/persistencia.
- campana: dato textual legacy o de presentación.

ESTA FASE NO ELIMINA NADA.

EJECUTAR DESDE C:\MECA_ML\meca-app

1)
node --check scripts\f1156-inventario-campana.js

2)
node scripts\f1156-inventario-campana.js

Se generan:
F11.5.6_INVENTARIO_CAMPANA.json
F11.5.6_INVENTARIO_CAMPANA.md

3) En PostgreSQL ejecutar:
scripts\F11.5.6_DIAGNOSTICO_BD.sql

ENTREGAR PARA LA SIGUIENTE DECISIÓN
- salida de consola del script;
- contenido de F11.5.6_INVENTARIO_CAMPANA.md;
- resultado de las consultas SQL.

No hacer DROP COLUMN ni eliminar propiedades todavía.
