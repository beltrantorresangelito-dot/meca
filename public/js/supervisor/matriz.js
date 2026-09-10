'use strict';


// ======================================================
// ESTADO - ADMINISTRACIÓN DE MATRIZ
// ======================================================

let clasificacionesPdaMatrizCache =
    null;


// ======================================================
// CARGAR CATÁLOGO DE CLASIFICACIONES PDA
// ======================================================

async function obtenerClasificacionesPdaMatriz(
    forzarRecarga = false
) {
    if (
        !forzarRecarga &&
        Array.isArray(
            clasificacionesPdaMatrizCache
        )
    ) {
        return clasificacionesPdaMatrizCache;
    }


    if (
        !window.API ||
        typeof API.getClasificacionesPda !==
            'function'
    ) {
        throw new Error(
            'API.getClasificacionesPda no está disponible'
        );
    }


    const clasificaciones =
        await API.getClasificacionesPda();


    clasificacionesPdaMatrizCache =
        Array.isArray(clasificaciones)
            ? clasificaciones
            : [];


    return clasificacionesPdaMatrizCache;
}


// ======================================================
// CARGAR SELECT DE CLASIFICACIÓN PDA
// ======================================================

async function cargarSelectClasificacionPdaMatriz(
    valorSeleccionado = null
) {
    const select =
        document.getElementById(
            'subMotivoClasificacionPda'
        );


    if (!select) {
        return;
    }


    select.disabled =
        true;


    select.innerHTML = `
        <option value="">
            Cargando clasificaciones...
        </option>
    `;


    try {
        const clasificaciones =
            await obtenerClasificacionesPdaMatriz();


        select.innerHTML = `
            <option value="">
                Seleccione clasificación
            </option>

            ${clasificaciones
                .map(
                    item => `
                        <option
                            value="${Number(item.id)}"
                        >
                            ${escapeHtmlMatriz(
                                item.nombre
                            )}
                        </option>
                    `
                )
                .join('')}
        `;


        if (
            valorSeleccionado !== null &&
            valorSeleccionado !== undefined &&
            valorSeleccionado !== ''
        ) {
            select.value =
                String(
                    valorSeleccionado
                );
        }


        select.disabled =
            false;


        actualizarDescripcionClasificacionPdaMatriz();

    } catch (error) {
        console.error(
            '❌ Error cargando clasificaciones PDA:',
            error
        );


        select.innerHTML = `
            <option value="">
                Error al cargar clasificaciones
            </option>
        `;


        throw error;
    }
}


// ======================================================
// DESCRIPCIÓN DE CLASIFICACIÓN SELECCIONADA
// ======================================================

function actualizarDescripcionClasificacionPdaMatriz() {
    const select =
        document.getElementById(
            'subMotivoClasificacionPda'
        );

    const descripcion =
        document.getElementById(
            'subMotivoClasificacionPdaDescripcion'
        );


    if (
        !select ||
        !descripcion
    ) {
        return;
    }


    const id =
        Number(
            select.value
        );


    const item =
        Array.isArray(
            clasificacionesPdaMatrizCache
        )
            ? clasificacionesPdaMatrizCache.find(
                clasificacion =>
                    Number(
                        clasificacion.id
                    ) === id
            )
            : null;


    descripcion.textContent =
        item?.descripcion ||
        'Define el tipo de tratamiento que utilizará el PDA.';
}


// ======================================================
// OBTENER ID SELECCIONADO
// ======================================================

function obtenerClasificacionPdaIdMatriz() {
    const select =
        document.getElementById(
            'subMotivoClasificacionPda'
        );


    const id =
        Number(
            select?.value
        );


    return (
        Number.isInteger(id) &&
        id > 0
    )
        ? id
        : null;
}


// ======================================================
// ESCAPE HTML LOCAL
// ======================================================

function escapeHtmlMatriz(value) {
    return String(
        value ?? ''
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        );
}


// ======================================================
// EVENTOS
// ======================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {
        const select =
            document.getElementById(
                'subMotivoClasificacionPda'
            );


        if (
            select &&
            select.dataset.initialized !==
                'true'
        ) {
            select.dataset.initialized =
                'true';

            select.addEventListener(
                'change',
                actualizarDescripcionClasificacionPdaMatriz
            );
        }
    }
);


// ======================================================
// PUENTE TEMPORAL CON LEGACY
// ======================================================

window.cargarSelectClasificacionPdaMatriz =
    cargarSelectClasificacionPdaMatriz;

window.obtenerClasificacionPdaIdMatriz =
    obtenerClasificacionPdaIdMatriz;