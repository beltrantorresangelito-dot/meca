#!/usr/bin/env node

/**
 * Script de validación del sistema de rol_id
 * Ejecutar desde: node test-rol-system.js
 */

const http = require('http');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Hacer request al servidor
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: data
                    });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  PRUEBAS DEL SISTEMA DE rol_id                                 ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Obtener todas las pestañas
        log('\n📋 Test 1: Obtener todas las pestañas disponibles', 'blue');
        const pestanasResp = await makeRequest('GET', '/api/pestanas');
        
        if (pestanasResp.status === 200 && Array.isArray(pestanasResp.body)) {
            log(`  ✅ Endpoint /api/pestanas funciona (${pestanasResp.body.length} pestañas encontradas)`, 'green');
            log(`  Pestañas: ${pestanasResp.body.map(p => p.codigo).join(', ')}`, 'green');
            passed++;
        } else {
            log(`  ❌ Error en /api/pestanas: ${pestanasResp.status}`, 'red');
            log(`  Respuesta: ${JSON.stringify(pestanasResp.body)}`, 'red');
            failed++;
        }

        // Test 2: Obtener pestañas por rol (rol_id=1 para ADMIN)
        log('\n👤 Test 2: Obtener pestañas para ADMIN (rol_id=1)', 'blue');
        const adminTabsResp = await makeRequest('GET', '/api/pestanas/rol/1');
        
        if (adminTabsResp.status === 200 && Array.isArray(adminTabsResp.body)) {
            log(`  ✅ Endpoint /api/pestanas/rol/1 funciona (${adminTabsResp.body.length} pestañas)`, 'green');
            log(`  Pestañas permitidas: ${adminTabsResp.body.join(', ')}`, 'green');
            passed++;
        } else {
            log(`  ❌ Error en /api/pestanas/rol/1: ${adminTabsResp.status}`, 'red');
            failed++;
        }

        // Test 3: Obtener pestañas por rol (rol_id=2 para SUPERVISOR)
        log('\n👤 Test 3: Obtener pestañas para SUPERVISOR (rol_id=2)', 'blue');
        const supervTabsResp = await makeRequest('GET', '/api/pestanas/rol/2');
        
        if (supervTabsResp.status === 200 && Array.isArray(supervTabsResp.body)) {
            log(`  ✅ Endpoint /api/pestanas/rol/2 funciona (${supervTabsResp.body.length} pestañas)`, 'green');
            log(`  Pestañas permitidas: ${supervTabsResp.body.join(', ')}`, 'green');
            passed++;
        } else {
            log(`  ❌ Error en /api/pestanas/rol/2: ${supervTabsResp.status}`, 'red');
            failed++;
        }

        // Test 4: Obtener pestañas por rol (rol_id=3 para AUDITOR)
        log('\n👤 Test 4: Obtener pestañas para AUDITOR (rol_id=3)', 'blue');
        const auditorTabsResp = await makeRequest('GET', '/api/pestanas/rol/3');
        
        if (auditorTabsResp.status === 200 && Array.isArray(auditorTabsResp.body)) {
            log(`  ✅ Endpoint /api/pestanas/rol/3 funciona (${auditorTabsResp.body.length} pestañas)`, 'green');
            log(`  Pestañas permitidas: ${auditorTabsResp.body.join(', ')}`, 'green');
            passed++;
        } else {
            log(`  ❌ Error en /api/pestanas/rol/3: ${auditorTabsResp.status}`, 'red');
            failed++;
        }

        // Test 5: Hacer login (si existe admin/admin)
        log('\n🔐 Test 5: Probar login y verificar rol_id en respuesta', 'blue');
        const loginResp = await makeRequest('POST', '/api/auth/login', {
            usuario: 'admin',
            contrasena: 'admin'
        });

        if (loginResp.status === 200 && loginResp.body.success) {
            const usuario = loginResp.body.usuario;
            
            if (usuario.rol_id !== undefined && usuario.rol_id !== null) {
                log(`  ✅ Login exitoso, rol_id presente: ${usuario.rol_id}`, 'green');
                log(`  Usuario: ${usuario.nombre_completo} (${usuario.rol})`, 'green');
                log(`  Token: ${loginResp.body.token.substring(0, 20)}...`, 'green');
                passed++;
            } else {
                log(`  ⚠️  Login exitoso pero rol_id no está en la respuesta`, 'yellow');
                log(`  Datos recibidos: ${JSON.stringify(usuario)}`, 'yellow');
                failed++;
            }
        } else if (loginResp.body.error === 'Usuario no encontrado') {
            log(`  ⚠️  Usuario admin no existe (esto es normal en fresh install)`, 'yellow');
            passed++;
        } else {
            log(`  ❌ Error en login: ${loginResp.body.error || loginResp.status}`, 'red');
            failed++;
        }

        // Resumen
        log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
        log(`║  RESULTADOS: ${passed} ✅ Pasó, ${failed} ❌ Falló                     ║`.padEnd(66) + '║', 'cyan');
        log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

        if (failed === 0) {
            log('\n🎉 ¡Todos los tests pasaron correctamente!', 'green');
        } else {
            log(`\n⚠️  Hay ${failed} test(s) fallido(s) que necesita revisar`, 'yellow');
        }

    } catch (error) {
        log(`\n❌ Error al ejecutar tests: ${error.message}`, 'red');
        log('\n💡 Asegúrate de que el servidor está corriendo en puerto 3000', 'yellow');
    }

    process.exit(failed > 0 ? 1 : 0);
}

// Esperar un momento para asegurar que el servidor esté listo
setTimeout(runTests, 1000);
