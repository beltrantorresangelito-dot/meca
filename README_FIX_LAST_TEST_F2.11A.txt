MECA F2.11-A - FIX ÚLTIMO TEST

Reemplaza únicamente:
- tests/matrix-read-server.f210.test.js

Motivo:
El test anterior exigía que el POST /api/matriz/atributos apareciera
textualmente después del dispatcher Matrix. Esa relación de posición
no es parte del contrato funcional y quedó frágil ante cambios de
organización del server.js.

El nuevo test valida:
- los GET Matrix ya no están inline;
- Frentes POST ya no está inline;
- MatrixWriteHandler existe;
- Atributos/Submotivos siguen presentes para F2.11-B/C.

No modifica código productivo.

Después:
npm test

Esperado:
0 fail.
