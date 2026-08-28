const fs = require('fs');
const path = require('path');
const { pool } = require('../models/database');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const OBJETIVOS = {
    tablas: [
        'quiebres',
        'campanas',
        'matrices',
        'versiones_matriz',
        'campana_matriz'
    ],

    columnas: [
        ['campanas', 'quiebre_id'],
        ['matrices', 'quiebre_id'],
        ['asignaciones_escucha', 'campana_id'],
        ['evaluaciones', 'campana_id'],
        ['evaluaciones', 'matriz_id'],
        ['evaluaciones', 'version_matriz_id']
    ],

    vistas: [
        'vw_asignaciones_campana',
        'vw_evaluaciones_campana'
    ],

    funciones: [
        'resolver_contexto_evaluacion'
    ],

    indices: [
        'idx_evaluaciones_matriz_id'
    ]
};

function leerMigracionesUp() {
    return fs.readdirSync(MIGRATIONS_DIR)
        .filter(
            nombre =>
                /^\d{4}_.+\.up\.sql$/i.test(nombre)
        )
        .sort()
        .map(nombre => ({
            nombre,
            sql: fs.readFileSync(
                path.join(MIGRATIONS_DIR, nombre),
                'utf8'
            )
        }));
}

function buscarMigraciones(
    migraciones,
    textos
) {
    return migraciones
        .filter(m => {
            const sql =
                m.sql.toLowerCase();

            return textos.every(
                texto =>
                    sql.includes(
                        String(texto)
                            .toLowerCase()
                    )
            );
        })
        .map(m => m.nombre);
}

async function existeTabla(
    client,
    tabla
) {
    const result =
        await client.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = $1
            ) AS existe
            `,
            [tabla]
        );

    return result.rows[0].existe;
}

async function existeColumna(
    client,
    tabla,
    columna
) {
    const result =
        await client.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1
                  AND column_name = $2
            ) AS existe
            `,
            [tabla, columna]
        );

    return result.rows[0].existe;
}

async function existeVista(
    client,
    vista
) {
    const result =
        await client.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.views
                WHERE table_schema = 'public'
                  AND table_name = $1
            ) AS existe
            `,
            [vista]
        );

    return result.rows[0].existe;
}

async function existeFuncion(
    client,
    funcion
) {
    const result =
        await client.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM pg_proc p
                JOIN pg_namespace n
                  ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.proname = $1
            ) AS existe
            `,
            [funcion]
        );

    return result.rows[0].existe;
}

async function existeIndice(
    client,
    indice
) {
    const result =
        await client.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname = $1
            ) AS existe
            `,
            [indice]
        );

    return result.rows[0].existe;
}

async function main() {
    const migraciones =
        leerMigracionesUp();

    const client =
        await pool.connect();

    try {
        const faltantes = [];

        console.log(
            '=============================================='
        );

        console.log(
            'MECA F11.5.7.2 - RECONCILIACION DE ESQUEMA'
        );

        console.log(
            '==============================================\n'
        );

        // ==================================================
        // TABLAS
        // ==================================================
        console.log('--- TABLAS ---');

        for (
            const tabla of
            OBJETIVOS.tablas
        ) {
            const existe =
                await existeTabla(
                    client,
                    tabla
                );

            const migs =
                buscarMigraciones(
                    migraciones,
                    [tabla]
                );

            console.log(
                `${existe ? '✅' : '❌'} ` +
                `${tabla} | ` +
                `migracion=${
                    migs.length
                        ? migs.join(', ')
                        : 'NINGUNA'
                }`
            );

            if (
                existe &&
                migs.length === 0
            ) {
                faltantes.push(
                    `tabla:${tabla}`
                );
            }
        }

        // ==================================================
        // COLUMNAS
        // ==================================================
        console.log('\n--- COLUMNAS ---');

        for (
            const [tabla, columna] of
            OBJETIVOS.columnas
        ) {
            const existe =
                await existeColumna(
                    client,
                    tabla,
                    columna
                );

            const migs =
                buscarMigraciones(
                    migraciones,
                    [tabla, columna]
                );

            const objeto =
                `${tabla}.${columna}`;

            console.log(
                `${existe ? '✅' : '❌'} ` +
                `${objeto} | ` +
                `migracion=${
                    migs.length
                        ? migs.join(', ')
                        : 'NINGUNA'
                }`
            );

            if (
                existe &&
                migs.length === 0
            ) {
                faltantes.push(
                    `columna:${objeto}`
                );
            }
        }

        // ==================================================
        // VISTAS
        // ==================================================
        console.log('\n--- VISTAS ---');

        for (
            const vista of
            OBJETIVOS.vistas
        ) {
            const existe =
                await existeVista(
                    client,
                    vista
                );

            const migs =
                buscarMigraciones(
                    migraciones,
                    [vista]
                );

            console.log(
                `${existe ? '✅' : '❌'} ` +
                `${vista} | ` +
                `migracion=${
                    migs.length
                        ? migs.join(', ')
                        : 'NINGUNA'
                }`
            );

            if (
                existe &&
                migs.length === 0
            ) {
                faltantes.push(
                    `vista:${vista}`
                );
            }
        }

        // ==================================================
        // FUNCIONES
        // ==================================================
        console.log('\n--- FUNCIONES ---');

        for (
            const funcion of
            OBJETIVOS.funciones
        ) {
            const existe =
                await existeFuncion(
                    client,
                    funcion
                );

            const migs =
                buscarMigraciones(
                    migraciones,
                    [funcion]
                );

            console.log(
                `${existe ? '✅' : '❌'} ` +
                `${funcion} | ` +
                `migracion=${
                    migs.length
                        ? migs.join(', ')
                        : 'NINGUNA'
                }`
            );

            if (
                existe &&
                migs.length === 0
            ) {
                faltantes.push(
                    `funcion:${funcion}`
                );
            }
        }

        // ==================================================
        // ÍNDICES
        // ==================================================
        console.log('\n--- INDICES ---');

        for (
            const indice of
            OBJETIVOS.indices
        ) {
            const existe =
                await existeIndice(
                    client,
                    indice
                );

            const migs =
                buscarMigraciones(
                    migraciones,
                    [indice]
                );

            console.log(
                `${existe ? '✅' : '❌'} ` +
                `${indice} | ` +
                `migracion=${
                    migs.length
                        ? migs.join(', ')
                        : 'NINGUNA'
                }`
            );

            if (
                existe &&
                migs.length === 0
            ) {
                faltantes.push(
                    `indice:${indice}`
                );
            }
        }

        console.log(
            '\n--- EXISTEN EN BD PERO NO EN MIGRACIONES ---'
        );

        if (
            faltantes.length === 0
        ) {
            console.log(
                '✅ Ninguno'
            );
        } else {
            faltantes.forEach(
                item =>
                    console.log(
                        `⚠️ ${item}`
                    )
            );
        }

        console.log(
            `\nTotal faltantes: ${faltantes.length}`
        );

    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(error => {
    console.error(
        '❌ F11.5.7.2:',
        error
    );

    process.exitCode = 1;
});