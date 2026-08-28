const fs = require('fs');
const { execFileSync } = require('child_process');

const archivo = 'public/js/supervisor.js';

// ======================================================
// 1. LEER supervisor.js ACTUAL
// ======================================================
const actual = fs.readFileSync(
    archivo,
    'utf8'
);

// ======================================================
// 2. OBTENER supervisor.js DESDE HEAD
// ======================================================
const head = execFileSync(
    'git',
    [
        'show',
        'HEAD:public/js/supervisor.js'
    ],
    {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
    }
);

// ======================================================
// 3. EXTRAER UNA FUNCIÓN COMPLETA POR BALANCE DE LLAVES
// ======================================================
function extraerFuncion(source, firma) {

    const inicio = source.indexOf(firma);

    if (inicio < 0) {
        throw new Error(
            `No se encontró en HEAD: ${firma}`
        );
    }

    const primeraLlave =
        source.indexOf('{', inicio);

    if (primeraLlave < 0) {
        throw new Error(
            `No se encontró apertura de función: ${firma}`
        );
    }

    let nivel = 0;

    let enStringSimple = false;
    let enStringDoble = false;
    let enTemplate = false;

    let enComentarioLinea = false;
    let enComentarioBloque = false;

    let escape = false;

    for (
        let i = primeraLlave;
        i < source.length;
        i++
    ) {
        const c = source[i];
        const next = source[i + 1];

        // ==============================================
        // COMENTARIO DE LÍNEA
        // ==============================================
        if (enComentarioLinea) {
            if (c === '\n') {
                enComentarioLinea = false;
            }
            continue;
        }

        // ==============================================
        // COMENTARIO DE BLOQUE
        // ==============================================
        if (enComentarioBloque) {
            if (
                c === '*' &&
                next === '/'
            ) {
                enComentarioBloque = false;
                i++;
            }
            continue;
        }

        // ==============================================
        // STRINGS
        // ==============================================
        if (
            enStringSimple ||
            enStringDoble ||
            enTemplate
        ) {
            if (escape) {
                escape = false;
                continue;
            }

            if (c === '\\') {
                escape = true;
                continue;
            }

            if (
                enStringSimple &&
                c === "'"
            ) {
                enStringSimple = false;
                continue;
            }

            if (
                enStringDoble &&
                c === '"'
            ) {
                enStringDoble = false;
                continue;
            }

            if (
                enTemplate &&
                c === '`'
            ) {
                enTemplate = false;
                continue;
            }

            continue;
        }

        // ==============================================
        // INICIO COMENTARIOS
        // ==============================================
        if (
            c === '/' &&
            next === '/'
        ) {
            enComentarioLinea = true;
            i++;
            continue;
        }

        if (
            c === '/' &&
            next === '*'
        ) {
            enComentarioBloque = true;
            i++;
            continue;
        }

        // ==============================================
        // INICIO STRINGS
        // ==============================================
        if (c === "'") {
            enStringSimple = true;
            continue;
        }

        if (c === '"') {
            enStringDoble = true;
            continue;
        }

        if (c === '`') {
            enTemplate = true;
            continue;
        }

        // ==============================================
        // BALANCE DE LLAVES
        // ==============================================
        if (c === '{') {
            nivel++;
        }

        if (c === '}') {
            nivel--;

            if (nivel === 0) {
                return source.slice(
                    inicio,
                    i + 1
                );
            }
        }
    }

    throw new Error(
        `No se pudo encontrar cierre de: ${firma}`
    );
}

// ======================================================
// 4. EXTRAER FUNCIÓN ORIGINAL
// ======================================================
const funcionGP =
    extraerFuncion(
        head,
        'async function cargarGestionPersonasGP()'
    );

console.log(
    '✅ Función extraída desde HEAD'
);

console.log(
    'Bytes:',
    Buffer.byteLength(
        funcionGP,
        'utf8'
    )
);

// ======================================================
// 5. LOCALIZAR ZONA CORRUPTA ACTUAL
// ======================================================
const marcaInicio =
    '// =============================CIERRE BLOQUE 13';

const marcaFin =
    '// RECALCULAR PROMEDIO POR MES FILTRADO';

const indiceInicioMarca =
    actual.indexOf(
        marcaInicio
    );

if (indiceInicioMarca < 0) {
    throw new Error(
        'No se encontró CIERRE BLOQUE 13'
    );
}

// Mantener completa la línea CIERRE BLOQUE 13
const finLineaInicio =
    actual.indexOf(
        '\n',
        indiceInicioMarca
    );

const indiceFin =
    actual.indexOf(
        marcaFin,
        finLineaInicio
    );

if (indiceFin < 0) {
    throw new Error(
        'No se encontró RECALCULAR PROMEDIO POR MES FILTRADO'
    );
}

// ======================================================
// 6. RECONSTRUIR supervisor.js
// ======================================================
const nuevo =
    actual.slice(
        0,
        finLineaInicio + 1
    ) +

    '\n' +

    '// ======================================================\n' +
    '// FUNCIÓN COMPLETA: cargarGestionPersonasGP (RESTAURADA)\n' +
    '// ======================================================\n\n' +

    funcionGP +

    '\n\n' +

    '// ======================================================\n' +

    actual.slice(
        indiceFin
    );

// ======================================================
// 7. GUARDAR
// ======================================================
fs.writeFileSync(
    archivo,
    nuevo,
    'utf8'
);

console.log(
    '✅ cargarGestionPersonasGP restaurada'
);
console.log(
    '✅ Zona corrupta reemplazada'
);
console.log(
    '✅ Resto de supervisor.js conservado'
);
