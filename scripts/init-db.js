// ======================================================
// scripts/init-db.js - Inicializar base de datos PostgreSQL local
// ======================================================
// 
// 📌 PROPÓSITO: Conectar y verificar el estado de la base de datos PostgreSQL
// 📌 BASE DE DATOS: meca_db en PostgreSQL local (puerto 5432)
// 📌 TECNOLOGÍA: node-postgres (pg) con Client
// 📌 USO: node scripts/init-db.js
// ======================================================

// ======================================================
// 1. IMPORTAR DEPENDENCIAS
// ======================================================
// 📌 Client: Cliente de conexión a PostgreSQL
// ======================================================

const { Client } = require('pg');

// ======================================================
// 2. CONFIGURACIÓN DE CONEXIÓN
// ======================================================
// 📌 host: Dirección del servidor (localhost)
// 📌 port: Puerto de PostgreSQL (5432 estándar)
// 📌 user: Usuario administrador
// 📌 password: Contraseña del usuario
// 📌 database: Nombre de la base de datos a conectar
// ======================================================

const config = {
    host: '127.0.0.1',      // Servidor local
    port: 5432,              // Puerto estándar de PostgreSQL
    user: 'postgres',        // Usuario administrador
    password: 'postgres',    // Contraseña del usuario
    database: 'meca_db'      // Base de datos del sistema
};

// ======================================================
// 3. FUNCIÓN PRINCIPAL: initDatabase()
// ======================================================
// 📌 PROPÓSITO: Conectar a la BD y mostrar información de estado
// 📌 ACCIONES:
//    1. Conectar a PostgreSQL
//    2. Mostrar base de datos activa
//    3. Listar tablas existentes
//    4. Manejar errores de conexión
// ======================================================

async function initDatabase() {
    // Crear una nueva instancia del cliente
    const client = new Client(config);

    try {
        // ======================================================
        // 3a. CONECTAR A POSTGRESQL
        // ======================================================
        console.log('Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado exitosamente');

        // ======================================================
        // 3b. VERIFICAR BASE DE DATOS ACTIVA
        // ======================================================
        // 📌 current_database() devuelve el nombre de la BD actual
        // ======================================================
        const res = await client.query('SELECT current_database()');
        console.log('📊 Base de datos activa:', res.rows[0].current_database);

        // ======================================================
        // 3c. LISTAR TABLAS EXISTENTES
        // ======================================================
        // 📌 information_schema.tables contiene metadatos de todas las tablas
        // 📌 Filtramos por schema 'public' (schema por defecto)
        // ======================================================
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        // Mostrar lista de tablas
        console.log('📋 Tablas existentes:', tables.rows.map(r => r.table_name).join(', '));
        
        // Mostrar conteo de tablas
        console.log(`✅ ${tables.rows.length} tablas encontradas`);

        // ======================================================
        // 3d. INFORMACIÓN ADICIONAL (OPCIONAL)
        // ======================================================
        // Mostrar versión de PostgreSQL
        const versionRes = await client.query('SELECT version()');
        console.log('🐘 PostgreSQL:', versionRes.rows[0].version.split(',')[0]);

        // Mostrar tamaño de la base de datos
        const sizeRes = await client.query(`
            SELECT pg_database_size(current_database()) / 1024 / 1024 as size_mb
        `);
        console.log('💾 Tamaño de la BD:', sizeRes.rows[0].size_mb, 'MB');

    } catch (err) {
        // ======================================================
        // 3e. MANEJO DE ERRORES
        // ======================================================
        console.error('❌ Error:', err.message);
        
        // Mostrar información adicional según el tipo de error
        if (err.code === 'ECONNREFUSED') {
            console.log('💡 PostgreSQL no está corriendo. Inicie el servicio primero.');
        } else if (err.code === '28P01') {
            console.log('💡 Contraseña incorrecta. Verifique las credenciales.');
        } else if (err.code === '3D000') {
            console.log('💡 La base de datos "meca_db" no existe. Cree la base de datos primero.');
        }
    } finally {
        // ======================================================
        // 3f. CERRAR CONEXIÓN
        // ======================================================
        // 📌 Siempre cerrar la conexión, incluso si hay error
        // ======================================================
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

// ======================================================
// 4. EJECUTAR LA FUNCIÓN
// ======================================================
// 📌 Solo se ejecuta si el archivo se llama directamente
// 📌 Si se importa como módulo, no se ejecuta automáticamente
// ======================================================

initDatabase();