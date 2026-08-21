MECA F1.4 - Seguridad P0 (tramo compatible)

REQUISITO: aplicar sobre el proyecto que ya contiene F1.3.

1. Copiar los archivos respetando sus rutas.
2. NO reemplazar tu archivo .env con .env.example.
3. Generar AUTH_SECRET:
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
4. Agregar el resultado a tu .env:
   AUTH_SECRET=...
5. Ejecutar:
   npm test
6. Iniciar MECA y probar:
   - login usuario existente
   - logout/login nuevamente
   - primer login/cambio obligatorio de password si tienes usuario de prueba
   - creación/edición de usuario con password
7. Revisar en BD (opcional) que después de login el campo contrasena del usuario migrado comience con: scrypt$

IMPORTANTE:
- Los tokens emitidos antes de F1.4 quedan inválidos; basta volver a iniciar sesión.
- No subir .env a Git.
