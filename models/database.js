const { Pool } = require('pg');
require('dotenv').config();

function buildPoolConfig() {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            max: 30,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 10000,
        };
    }

    const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Faltan variables de entorno de PostgreSQL: ${missing.join(', ')}`);
    }

    return {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 30,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

pool.query('SELECT NOW()')
    .then(res => console.log('✅ PostgreSQL conectado:', res.rows[0].now))
    .catch(err => console.error('❌ Error conectando PostgreSQL:', err.message));

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    buildPoolConfig,
};
