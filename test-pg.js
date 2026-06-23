// test-pg.js - Probar conexión a PostgreSQL local
// Estructura: D:\MECA_ML\{meca-app, nodejs, postgresql}
// Puerto: 5433 (sin permisos admin)

const { Client } = require('pg');

const client = new Client({
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    password: 'integratelgic',
    database: 'postgres'
});

client.connect()
    .then(() => {
        console.log('Conectado a PostgreSQL local (puerto 5433)');
        return client.query('SELECT version()');
    })
    .then(res => {
        console.log('Version:', res.rows[0].version);
        return client.query('SELECT current_database()');
    })
    .then(res => {
        console.log('Base de datos:', res.rows[0].current_database);
        return client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `);
    })
    .then(res => {
        console.log('Tablas (' + res.rows.length + '):', res.rows.map(r => r.table_name).join(', '));
        client.end();
    })
    .catch(err => {
        console.error('Error de conexion:', err.message);
        console.error('Verifique que PostgreSQL este ejecutandose en puerto 5433');
        client.end();
    });
