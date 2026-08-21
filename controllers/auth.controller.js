const UsuarioModel = require('../models/Usuario.model');
const { pool } = require('../models/database');
const { hashPassword, verifyPassword } = require('../security/passwords');
const { signToken, verifyToken } = require('../security/tokens');

class AuthController {
    async login(req, res, body) {
        const { usuario, contrasena } = body;

        if (!usuario || !contrasena) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Usuario y contrasena requeridos' }));
            return;
        }

        try {
            const user = await UsuarioModel.findByUsername(usuario);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Usuario no encontrado' }));
                return;
            }
            if (!user.activo) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Usuario inactivo' }));
                return;
            }

            const passwordCheck = await verifyPassword(contrasena, user.contrasena);
            if (!passwordCheck.valid) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Contrasena incorrecta' }));
                return;
            }

            if (passwordCheck.needsRehash) {
                const migratedHash = await hashPassword(contrasena);
                await pool.query('UPDATE usuarios SET contrasena = $1, updated_at = NOW() WHERE id = $2', [migratedHash, user.id]);
            }

            const token = signToken({
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre_completo,
                rol: user.rol,
            });

            pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [user.id]).catch(() => {});

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                token,
                usuario: {
                    id: user.id,
                    nombre: user.nombre_completo,
                    usuario: user.usuario,
                    rol: user.rol,
                },
            }));
        } catch (error) {
            console.error('Error en login:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error interno del servidor' }));
        }
    }

    verificarToken(req, res, body, query, token) {
        const result = verifyToken(token);
        if (!result.valid) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: result.error || 'Token invalido o expirado' }));
            return false;
        }
        return result.payload;
    }

    async verify(req, res, body, query, token) {
        const decoded = this.verificarToken(req, res, body, query, token);
        if (!decoded) return;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: true, usuario: decoded }));
    }
}

module.exports = new AuthController();
