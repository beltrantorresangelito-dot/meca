// ======================================================
// models/database.js - Configuración de conexión PostgreSQL
// ======================================================
// 
// 📌 PROPÓSITO: Establecer y gestionar la conexión con PostgreSQL
// 📌 TECNOLOGÍA: node-postgres (pg) con Pool de conexiones
// 📌 VARIABLES DE ENTORNO: Usa dotenv para configuración
// ======================================================

// 1️⃣ IMPORTAR: Librería pg para PostgreSQL
// Pool = Manejador de conexiones (reutiliza conexiones)
const { Pool } = require('pg');

// 2️⃣ CARGAR VARIABLES DE ENTORNO: Desde archivo .env
// 📌 process.env contiene las variables del sistema
require('dotenv').config();

// 3️⃣ CONFIGURAR POOL DE CONEXIONES
// 📌 Un "Pool" mantiene un conjunto de conexiones abiertas
// 📌 Reutiliza conexiones en lugar de abrir/cerrar cada vez
const pool = new Pool({
    // 🔌 CONFIGURACIÓN DE CONEXIÓN
    host: process.env.DB_HOST || 'localhost',      // Dirección del servidor
    port: parseInt(process.env.DB_PORT) || 5433,   // Puerto (5433 por defecto)
    user: process.env.DB_USER || 'postgres',       // Usuario de BD
    password: process.env.DB_PASSWORD || 'integratelgic', // Contraseña
    database: process.env.DB_NAME || 'postgres',   // Nombre de la BD

    // ⚙️ CONFIGURACIÓN DEL POOL
    max: 30,                    // Máximo de conexiones simultáneas
    idleTimeoutMillis: 60000,   // Tiempo máximo de inactividad (30s)
    connectionTimeoutMillis: 10000, // Tiempo máximo para conectar (5s)
});

// ======================================================
// 4️⃣ MANEJO DE ERRORES DEL POOL
// ======================================================
// 📌 Escucha eventos de error a nivel de pool
// 📌 Útil para detectar problemas de conexión
// ======================================================

pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

// ======================================================
// 5️⃣ VERIFICAR CONEXIÓN AL INICIAR
// ======================================================
// 📌 Ejecuta una consulta simple al arrancar
// 📌 Confirma que la conexión funciona
// ======================================================

pool.query('SELECT NOW()')
    .then(res => console.log('✅ PostgreSQL conectado:', res.rows[0].now))
    .catch(err => console.error('❌ Error conectando PostgreSQL:', err.message));

// ======================================================
// 6️⃣ EXPORTAR: Funciones para usar en otros archivos
// ======================================================
// 📌 query(): Función para ejecutar consultas SQL
// 📌 pool: Objeto pool completo (para casos avanzados)
// ======================================================

module.exports = {
    // Función wrapper: Ejecuta consultas con parámetros
    // Uso: query('SELECT * FROM usuarios WHERE id = $1', [id])
    query: (text, params) => pool.query(text, params),
    
    // Exportar el pool completo (para operaciones avanzadas)
    pool: pool,
};