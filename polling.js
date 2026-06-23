// polling.js - Script para actualizar automáticamente desde GitHub
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURACIÓN =====
const REPO = 'beltrantorresangelito-dot/meca';  // 🔥 CAMBIA ESTO
const BRANCH = 'main';              // o 'master' si usas master
const INTERVAL = 60000;             // 60000ms = 1 minuto
const PROJECT_PATH = __dirname;     // Usa la carpeta actual

// Archivo para guardar el último commit (persistente)
const STATE_FILE = path.join(__dirname, '.last_commit');

// ===== FUNCIONES =====

// Leer último commit guardado
function getLastCommit() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return fs.readFileSync(STATE_FILE, 'utf8').trim();
        }
    } catch (e) {}
    return '';
}

// Guardar último commit
function saveLastCommit(sha) {
    try {
        fs.writeFileSync(STATE_FILE, sha);
    } catch (e) {}
}

// Verificar si hay cambios en GitHub
function checkForUpdates() {
    console.log(`🔍 [${new Date().toLocaleString()}] Verificando cambios...`);
    
    const options = {
        hostname: 'api.github.com',
        path: `/repos/${REPO}/commits/${BRANCH}`,
        method: 'GET',
        headers: {
            'User-Agent': 'Node.js Polling Script',
            // Si el repo es privado, necesitas un token:
            
        }
    };

    const req = https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const commit = JSON.parse(data);
                
                // Verificar si la respuesta es válida
                if (!commit.sha) {
                    console.error('❌ Error: Respuesta inválida de GitHub');
                    return;
                }

                const currentCommit = commit.sha;
                const lastCommit = getLastCommit();

                // Si es el primer commit o hay cambios
                if (!lastCommit) {
                    console.log(`📌 Primer commit detectado: ${currentCommit.substring(0,7)}`);
                    saveLastCommit(currentCommit);
                } else if (lastCommit !== currentCommit) {
                    console.log(`🆕 Nuevo commit detectado: ${currentCommit.substring(0,7)}`);
                    console.log(`   Anterior: ${lastCommit.substring(0,7)}`);
                    
                    // Actualizar el repositorio
                    updateProject();
                    
                    // Guardar el nuevo commit
                    saveLastCommit(currentCommit);
                } else {
                    console.log(`✅ Sin cambios (${currentCommit.substring(0,7)})`);
                }
            } catch (error) {
                console.error('❌ Error al procesar respuesta:', error.message);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error al consultar GitHub:', error.message);
    });

    req.end();
}

// Actualizar el proyecto con git pull
function updateProject() {
    console.log('📥 Actualizando repositorio...');
    
    exec(`cd "${PROJECT_PATH}" && git pull`, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error en git pull:', error.message);
            console.error('   Stderr:', stderr);
            return;
        }
        
        console.log('✅ Repositorio actualizado:');
        console.log(stdout);
        
        // Opcional: Reiniciar tu aplicación Node.js
        // restartApp();
    });
}

// (Opcional) Función para reiniciar tu app Node.js
function restartApp() {
    console.log('🔄 Reiniciando aplicación...');
    // Si usas PM2:
    // exec('pm2 restart app');
    // Si usas nodemon:
    // exec('npx nodemon --signal SIGTERM');
    // Si es simple, no necesitas reiniciar (Node.js recarga archivos)
}

// ===== INICIAR =====

console.log('🚀 Iniciando Polling para GitHub');
console.log(`📁 Repositorio: ${REPO}`);
console.log(`🌿 Rama: ${BRANCH}`);
console.log(`⏱️  Intervalo: ${INTERVAL/1000} segundos`);
console.log(`📂 Proyecto: ${PROJECT_PATH}`);
console.log('----------------------------------------');

// Verificar inmediatamente al iniciar
checkForUpdates();

// Y luego cada X segundos
setInterval(checkForUpdates, INTERVAL);

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n👋 Deteniendo polling...');
    process.exit(0);
});