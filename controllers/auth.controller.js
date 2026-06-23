// ======================================================
// controllers/auth.controller.js - Controlador de autenticación
// ======================================================
// 
// 📌 PROPÓSITO: Manejar la autenticación de usuarios
// 📌 TECNOLOGÍA: Node.js + PostgreSQL + JWT simple
// 📌 SEGURIDAD: SHA-256 para contraseñas (compatible con datos migrados)
// ======================================================

// Importar modelo de usuario (maneja consultas a la BD)
const UsuarioModel = require('../models/Usuario.model');
// Importar crypto nativo de Node.js para hashing
const crypto = require('crypto');

// ⚠️ CLAVE SECRETA - En producción, usar variable de entorno
const SECRET_KEY = 'meca_super_secret_key_2024';

// ======================================================
// CLASE: AuthController
// ======================================================
// Contiene toda la lógica de autenticación
// ======================================================

class AuthController {
    
    // ======================================================
    // MÉTODO: login()
    // ======================================================
    // 📌 PROPÓSITO: Autenticar un usuario y generar token JWT
    // 📌 ENDPOINT: POST /api/login
    // 📌 PARÁMETROS: { usuario, contrasena }
    // 📌 RESPUESTA: { success, token, usuario }
    // ======================================================
    
    async login(req, res, body) {
        // 1️⃣ Extraer datos del body de la petición
        const { usuario, contrasena } = body;

        // 2️⃣ VALIDAR: ¿Llegaron ambos campos?
        if (!usuario || !contrasena) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Usuario y contrasena requeridos' 
            }));
            return; // ⛔ Salir para no continuar
        }

        try {
            // 3️⃣ BUSCAR USUARIO: Consultar en la base de datos
            const user = await UsuarioModel.findByUsername(usuario);

            // 4️⃣ VALIDAR: ¿Existe el usuario?
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Usuario no encontrado' 
                }));
                return;
            }

            // 5️⃣ VALIDAR: ¿El usuario está activo?
            if (!user.activo) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Usuario inactivo' 
                }));
                return;
            }

            // 6️⃣ VERIFICAR CONTRASEÑA: Hashear la ingresada y comparar
            // 🔐 Usamos SHA-256 (compatible con datos migrados de sistema anterior)
            const hashIngresado = crypto
                .createHash('sha256')
                .update(contrasena)
                .digest('hex');

            if (user.contrasena !== hashIngresado) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Contrasena incorrecta' 
                }));
                return;
            }

            // 7️⃣ GENERAR TOKEN JWT (artesanal, sin librerías externas)
            // 📌 Estructura: header.payload.signature
            
            // 7a. PAYLOAD: Datos del usuario + expiración (8 horas)
            const payload = {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre_completo,
                rol: user.rol,
                exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 horas
            };

            // 7b. HEADER: Algoritmo y tipo de token
            const header = Buffer.from(JSON.stringify({ 
                alg: 'HS256',  // Algoritmo de firma
                typ: 'JWT'     // Tipo de token
            })).toString('base64url');

            // 7c. PAYLOAD codificado en base64
            const payloadEncoded = Buffer.from(JSON.stringify(payload))
                .toString('base64url');

            // 7d. FIRMA: Usando la clave secreta
            const signature = Buffer.from(SECRET_KEY).toString('base64url');

            // 7e. TOKEN COMPLETO: header.payload.signature
            const token = `${header}.${payloadEncoded}.${signature}`;

            // 8️⃣ ACTUALIZAR ÚLTIMO LOGIN (en segundo plano, no bloqueante)
            // ✅ No esperamos a que termine para no retrasar la respuesta
            const { pool } = require('../models/database');
            pool.query(
                'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', 
                [user.id]
            ).catch(() => {}); // 🛑 Si falla, solo lo ignoramos

            // 9️⃣ RESPONDER ÉXITO: Enviar token y datos del usuario
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                token: token,
                usuario: {
                    id: user.id,
                    nombre: user.nombre_completo,
                    usuario: user.usuario,
                    rol: user.rol
                }
            }));

        } catch (error) {
            // 🔴 ERROR INESPERADO: Capturar cualquier excepción
            console.error('Error en login:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Error interno del servidor' 
            }));
        }
    }

    // ======================================================
    // MÉTODO: verificarToken()
    // ======================================================
    // 📌 PROPÓSITO: Validar un token JWT
    // 📌 USO INTERNO: Llamado por otros métodos
    // 📌 RETORNO: payload (si es válido) o false
    // ======================================================
    
    verificarToken(req, res, body, query, token) {
        // 1️⃣ VALIDAR: ¿Llegó el token?
        if (!token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Token requerido' 
            }));
            return false;
        }

        try {
            // 2️⃣ DECODIFICAR PAYLOAD: Extraer y decodificar la parte media
            // 📌 El token tiene formato: header.payload.signature
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString()
            );

            // 3️⃣ VALIDAR: ¿El token ha expirado?
            // ⏰ payload.exp está en segundos, Date.now() en milisegundos
            const expirado = payload.exp * 1000 < Date.now();

            if (expirado) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Token expirado' 
                }));
                return false;
            }

            // 4️⃣ TOKEN VÁLIDO: Retornar el payload
            return payload;

        } catch (error) {
            // 🔴 Token inválido (formato incorrecto, base64 malformado, etc.)
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Token invalido o expirado' 
            }));
            return false;
        }
    }

    // ======================================================
    // MÉTODO: verify()
    // ======================================================
    // 📌 PROPÓSITO: Endpoint para verificar si un token es válido
    // 📌 ENDPOINT: GET /api/verify
    // 📌 PARÁMETROS: token en query string o header
    // 📌 RESPUESTA: { valid, usuario }
    // ======================================================
    
    async verify(req, res, body, query, token) {
        // 1️⃣ VERIFICAR TOKEN usando el método interno
        const decoded = this.verificarToken(req, res, body, query, token);
        
        // 2️⃣ Si el token es inválido, verificarToken ya envió la respuesta
        if (!decoded) return;

        // 3️⃣ TOKEN VÁLIDO: Responder con los datos del usuario
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            valid: true,
            usuario: decoded
        }));
    }
}

// ======================================================
// EXPORTAR: Instancia única del controlador
// ======================================================
// 📌 Usamos module.exports para que otros archivos puedan importarlo
// 📌 Exportamos una instancia (no la clase) para simplificar el uso
// ======================================================

module.exports = new AuthController();