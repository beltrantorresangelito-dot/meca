const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const PUBLIC_DIR = path.join(__dirname, 'public');
const EXCEL_PATH = path.join(PUBLIC_DIR, 'flujo.xlsx');
const HTML_PATH = path.join(PUBLIC_DIR, 'index.html');

const server = http.createServer((req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = req.url;

    // ============================================================
    //  RUTAS DE LA API
    // ============================================================

    // 1. Servir el HTML (página principal)
    if (url === '/' || url === '/index.html') {
        if (!fs.existsSync(HTML_PATH)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - index.html no encontrado');
            return;
        }
        fs.readFile(HTML_PATH, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error al leer index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // ============================================================
    //  🆕 SERVIR ARCHIVOS ESTÁTICOS (CSS, JS, etc.)
    // ============================================================
    // Si la URL pide un archivo con extensión (.css, .js, .png, etc.)
    const ext = path.extname(url);
    if (ext && url !== '/') {
        const filePath = path.join(PUBLIC_DIR, url);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Archivo no encontrado: ' + url);
            return;
        }

        // Determinar el Content-Type según la extensión
        const contentTypes = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.txt': 'text/plain'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error al leer el archivo');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    // 2. /b2b-api/status
    if (url === '/b2b-api/status') {
        const exists = fs.existsSync(EXCEL_PATH);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            server: 'b2b-arbol',
            version: '1.0.0',
            excelExists: exists,
            excelPath: EXCEL_PATH,
            port: PORT,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // 3. /b2b-api/flujo (descarga el Excel)
    if (url === '/b2b-api/flujo') {
        if (!fs.existsSync(EXCEL_PATH)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Archivo no encontrado' }));
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="flujo.xlsx"'
        });
        fs.createReadStream(EXCEL_PATH).pipe(res);
        return;
    }

    // 4. /b2b-api/test
    if (url === '/b2b-api/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: '✅ B2B API funcionando',
            endpoints: {
                home: '/',
                status: '/b2b-api/status',
                flujo: '/b2b-api/flujo',
                test: '/b2b-api/test'
            }
        }));
        return;
    }

    // 5. /b2b-api/health
    if (url === '/b2b-api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // 404 - Ruta no encontrada
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        error: 'Ruta no encontrada',
        available: ['/', '/index.html', '/style.css', '/app.js', '/b2b-api/status', '/b2b-api/flujo', '/b2b-api/test', '/b2b-api/health']
    }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  🌳 ÁRBOL B2B - SERVIDOR COMPLETO');
    console.log('========================================');
    console.log(`  ✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log('');
    console.log('  📌 ACCESO PARA EL AGENTE:');
    console.log(`     🌐 http://localhost:${PORT}/`);
    console.log('');
    console.log('  📌 ARCHIVOS ESTÁTICOS:');
    console.log(`     📄 http://localhost:${PORT}/style.css`);
    console.log(`     📄 http://localhost:${PORT}/app.js`);
    console.log(`     📄 http://localhost:${PORT}/flujo.xlsx`);
    console.log('');
    console.log('  📌 ENDPOINTS API:');
    console.log(`     GET  /b2b-api/test     - Probar conexión`);
    console.log(`     GET  /b2b-api/status   - Estado del servidor`);
    console.log(`     GET  /b2b-api/flujo    - Descargar Excel`);
    console.log(`     GET  /b2b-api/health   - Health check`);
    console.log('');
    console.log(`  📂 Archivo Excel: ${EXCEL_PATH}`);
    console.log(`  📄 Archivo HTML: ${HTML_PATH}`);
    console.log(`  📄 Archivo CSS:  ${path.join(PUBLIC_DIR, 'style.css')}`);
    console.log(`  📄 Archivo JS:   ${path.join(PUBLIC_DIR, 'app.js')}`);
    console.log('  🔒 SIN dependencias externas');
    console.log('========================================');
});