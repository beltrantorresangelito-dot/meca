// ======================================================
// models/Usuario.model.js - Modelo de Usuarios
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar operaciones CRUD de usuarios en PostgreSQL
// 📌 TECNOLOGÍA: PostgreSQL con pool de conexiones
// 📌 PATRÓN: Modelo con métodos estáticos (no necesita instanciación)
// ======================================================

// 1️⃣ IMPORTAR: Conexión a la base de datos
// 📌 pool.query() ejecuta consultas SQL
const { pool } = require('./database');

// ======================================================
// CLASE: UsuarioModel
// ======================================================
// 📌 Todos los métodos son estáticos (no requieren new UsuarioModel())
// 📌 Cada método retorna Promesas (async/await)
// ======================================================

class UsuarioModel {
    
    // ======================================================
    // MÉTODO: findByUsername()
    // ======================================================
    // 📌 PROPÓSITO: Buscar un usuario por su nombre de usuario
    // 📌 PARÁMETROS: usuario (string) - nombre de usuario
    // 📌 RETORNO: Objeto usuario o undefined
    // 📌 USO: Login, verificación de existencia
    // ======================================================
    static async findByUsername(usuario) {
        const result = await pool.query(
            `SELECT 
                id, 
                usuario, 
                nombre_completo, 
                contrasena, 
                rol, 
                rol_id, 
                activo, 
                primer_login 
             FROM usuarios 
             WHERE usuario = $1`,
            [usuario]
        );
        return result.rows[0];
    }
    
    // ======================================================
    // MÉTODO: existe()
    // ======================================================
    // 📌 PROPÓSITO: Verificar si un usuario existe
    // 📌 PARÁMETROS: usuario (string) - nombre de usuario
    // 📌 RETORNO: true/false
    // 📌 USO: Validar antes de crear (evitar duplicados)
    // ======================================================
    static async existe(usuario) {
        const result = await pool.query(
            `SELECT id FROM usuarios WHERE usuario = $1`,
            [usuario]
        );
        return result.rows.length > 0;
    }
    
    // ======================================================
    // MÉTODO: crear()
    // ======================================================
    // 📌 PROPÓSITO: Crear un nuevo usuario en la base de datos
    // 📌 PARÁMETROS: usuarioData { id, usuario, nombre_completo, contrasena, rol, activo }
    // 📌 RETORNO: { id } del usuario creado
    // 📌 USO: Registro de nuevos usuarios
    // 📌 NOTA: ID usa DEFAULT (autoincremental o secuencia)
    // ======================================================
    static async crear(usuarioData) {
        const { id, usuario, nombre_completo, contrasena, rol, activo } = usuarioData;
        const result = await pool.query(
            `INSERT INTO usuarios (
                id, 
                usuario, 
                nombre_completo, 
                contrasena, 
                rol, 
                activo, 
                created_at
            ) VALUES (
                DEFAULT,           -- ID automático (secuencia)
                $1,                -- usuario
                $2,                -- nombre_completo
                $3,                -- contrasena (hash)
                $4,                -- rol
                $5,                -- activo (boolean)
                CURRENT_TIMESTAMP  -- created_at
            ) RETURNING id`,       -- Devuelve el ID generado
            [usuario, nombre_completo, contrasena, rol, activo]
        );
        return result.rows[0];
    }
    
    // ======================================================
    // MÉTODO: cambiarPassword()
    // ======================================================
    // 📌 PROPÓSITO: Actualizar la contraseña de un usuario
    // 📌 PARÁMETROS: 
    //    - usuarioId: ID del usuario
    //    - nuevaPasswordHash: Hash SHA-256 de la nueva contraseña
    // 📌 RETORNO: void (no retorna datos)
    // 📌 USO: Cambio de contraseña (primer login o voluntario)
    // 📌 NOTA: También marca primer_login = false
    // ======================================================
    static async cambiarPassword(usuarioId, nuevaPasswordHash) {
        await pool.query(
            `UPDATE usuarios 
             SET contrasena = $1, 
                 primer_login = false,      -- ✅ Ya no es primer login
                 updated_at = CURRENT_TIMESTAMP  -- 📅 Fecha de actualización
             WHERE id = $2`,
            [nuevaPasswordHash, usuarioId]
        );
    }
    
    // ======================================================
    // MÉTODO: listar()
    // ======================================================
    // 📌 PROPÓSITO: Obtener todos los usuarios con su rol
    // 📌 PARÁMETROS: Ninguno
    // 📌 RETORNO: Array de objetos usuario
    // 📌 USO: Tabla de administración de usuarios
    // 📌 JOIN: Incluye datos del rol (código y nombre)
    // ======================================================
    static async listar() {
        const result = await pool.query(
            `SELECT 
                u.*,                    -- Todos los campos de usuarios
                r.codigo as rol_codigo, -- Código del rol (ej: ADMIN)
                r.nombre as rol_nombre  -- Nombre del rol (ej: Administrador)
             FROM usuarios u 
             LEFT JOIN roles r ON u.rol_id = r.id   -- LEFT JOIN = incluye usuarios sin rol
             ORDER BY u.id`
        );
        return result.rows;
    }
    
    // ======================================================
    // MÉTODO: eliminar()
    // ======================================================
    // 📌 PROPÓSITO: Eliminar un usuario por ID
    // 📌 PARÁMETROS: id (number) - ID del usuario
    // 📌 RETORNO: void (no retorna datos)
    // 📌 USO: Eliminar usuarios del sistema
    // 📌 ADVERTENCIA: No verifica dependencias (cascada)
    // ======================================================
    static async eliminar(id) {
        await pool.query(
            'DELETE FROM usuarios WHERE id = $1',
            [id]
        );
    }
    
    // ======================================================
    // MÉTODO: actualizar()
    // ======================================================
    // 📌 PROPÓSITO: Actualizar campos de un usuario (excepto contraseña)
    // 📌 PARÁMETROS: 
    //    - id: ID del usuario
    //    - datos: Objeto con campos a actualizar
    // 📌 RETORNO: void (no retorna datos)
    // 📌 USO: Edición de usuarios (nombre, rol, estado, etc.)
    // 📌 NOTA: 
    //    - Ignora 'contrasena' (usa cambiarPassword para eso)
    //    - Construye dinámicamente la consulta SQL
    //    - Solo actualiza campos presentes en 'datos'
    // ======================================================
    static async actualizar(id, datos) {
        // 1️⃣ FILTRAR: Solo campos que no sean undefined y no sea 'contrasena'
        const campos = Object.keys(datos)
            .filter(k => datos[k] !== undefined && k !== 'contrasena');
        
        // 2️⃣ VALIDAR: Si no hay campos, salir
        if (campos.length === 0) return;
        
        // 3️⃣ CONSTRUIR SQL: Generar la cláusula SET dinámicamente
        // Ejemplo: campos = ['nombre', 'rol', 'activo']
        //          → "nombre = $1, rol = $2, activo = $3"
        const setClause = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
        
        // 4️⃣ PREPARAR VALORES: Extraer valores en el orden de los campos
        const values = campos.map(c => datos[c]);
        values.push(id); // ← Último parámetro para WHERE
        
        // 5️⃣ EJECUTAR: UPDATE dinámico con updated_at
        await pool.query(
            `UPDATE usuarios 
             SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${values.length}`,
            values
        );
    }
}

// ======================================================
// EXPORTAR: La clase completa (con métodos estáticos)
// ======================================================
// 📌 Uso en otros archivos:
//    const UsuarioModel = require('./Usuario.model');
//    const user = await UsuarioModel.findByUsername('admin');
// ======================================================

module.exports = UsuarioModel;