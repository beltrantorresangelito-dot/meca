// =============================================
// MÓDULO: UTILIDADES - utils.js
// =============================================
// Funciones reutilizables: HTML, números, fechas, gráficos
// =============================================

(function() {
    'use strict';

    // =============================================
    // 1. HTML Y TEXTO
    // =============================================

    /**
     * Escapa caracteres HTML para prevenir XSS
     */
    window.escapeHtml = function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    /**
     * Convierte un valor a número de forma segura
     */
    window.numeroSeguro = function(valor) {
        const n = Number(valor);
        return isNaN(n) ? 0 : n;
    };

    // =============================================
    // 2. FECHAS - CONVERSIÓN Y FORMATEO
    // =============================================

    /**
     * Formatea una fecha ISO a DD/MM/YYYY (hora Perú)
     */
    window.formatearFechaPeru = function(fechaIso) {
        if (!fechaIso) return 'N/A';
        try {
            // Caso 1: String ISO con T
            if (typeof fechaIso === 'string' && fechaIso.includes('T')) {
                const fecha = new Date(fechaIso);
                if (isNaN(fecha.getTime())) return fechaIso;
                return `${String(fecha.getUTCDate()).padStart(2, '0')}/${String(fecha.getUTCMonth() + 1).padStart(2, '0')}/${fecha.getUTCFullYear()}`;
            }
            // Caso 2: Objeto Date
            if (fechaIso instanceof Date) {
                if (isNaN(fechaIso.getTime())) return 'N/A';
                return `${String(fechaIso.getDate()).padStart(2, '0')}/${String(fechaIso.getMonth() + 1).padStart(2, '0')}/${fechaIso.getFullYear()}`;
            }
            // Caso 3: Ya está en DD/MM/YYYY
            if (typeof fechaIso === 'string' && fechaIso.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                return fechaIso;
            }
            // Caso 4: YYYY-MM-DD
            if (typeof fechaIso === 'string' && fechaIso.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [anio, mes, dia] = fechaIso.split('-');
                return `${dia}/${mes}/${anio}`;
            }
            return fechaIso || 'N/A';
        } catch (e) {
            return fechaIso || 'N/A';
        }
    };

    /**
     * Obtiene la fecha de una evaluación desde diferentes formatos
     */
    window.obtenerFechaEvaluacion = function(evaluacion) {
        let fechaStr = evaluacion.fechaOriginal || evaluacion.fecha || '';
        if (!fechaStr || fechaStr === 'Sin fecha') return null;

        // Formato DD/MM/YYYY
        if (fechaStr.includes('/')) {
            const partes = fechaStr.split(' ')[0].split('/');
            if (partes.length === 3) {
                return new Date(partes[2], partes[1] - 1, partes[0]);
            }
        }
        // Formato ISO YYYY-MM-DD
        if (fechaStr.includes('-')) {
            const partes = fechaStr.split('T')[0].split('-');
            if (partes.length === 3) {
                return new Date(partes[0], partes[1] - 1, partes[2]);
            }
        }
        return null;
    };

    /**
     * Formatea una fecha para input type="date"
     */
    window.formatDateForInput = function(date) {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Obtiene el número de semana del año
     */
    window.getWeekNumber = function(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    /**
     * Muestra fecha sin la T del formato ISO
     */
    window.mostrarFechaSinT = function(fechaStr) {
        if (!fechaStr) return '';
        if (fechaStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)) return fechaStr;
        if (fechaStr.includes('T')) {
            const partes = fechaStr.split('T')[0];
            const [anio, mes, dia] = partes.split('-');
            const horaParte = fechaStr.split('T')[1]?.split('.')[0] || '00:00';
            return `${dia}/${mes}/${anio} ${horaParte}`;
        }
        return fechaStr;
    };

    /**
     * Formatea fecha para documentos (DD/MM/YYYY)
     */
    window.formatearFechaParaDocumento = function(fecha) {
        if (!fecha) return 'N/A';
        if (fecha instanceof Date) {
            if (isNaN(fecha.getTime())) return 'N/A';
            return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
        }
        if (typeof fecha === 'string') {
            if (fecha.includes('/')) {
                const partes = fecha.split(' ')[0].split('/');
                if (partes.length === 3) return `${partes[0].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[2]}`;
            }
            if (fecha.includes('-')) {
                const partes = fecha.split('T')[0].split('-');
                if (partes.length === 3) return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
            }
            return fecha;
        }
        return String(fecha);
    };

    /**
     * Formatea duración entre dos fechas
     */
    window.formatearDuracion = function(fechaInicio, fechaFin) {
        if (!fechaInicio) return '-';
        try {
            const inicio = new Date(fechaInicio);
            const fin = fechaFin ? new Date(fechaFin) : new Date();
            const diffMs = fin - inicio;
            const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (diffHoras > 0) return `${diffHoras}h ${diffMinutos}m`;
            return `${diffMinutos}m`;
        } catch(e) {
            return '-';
        }
    };

    /**
     * Convierte DD/MM/YYYY a YYYY-MM-DD
     */
    window.convertirFechaDDMMYYYYaISO = function(fechaDDMMYYYY) {
        if (!fechaDDMMYYYY || fechaDDMMYYYY === 'N/A') return null;
        const partes = fechaDDMMYYYY.split('/');
        if (partes.length !== 3) return null;
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    };

    /**
     * Convierte serial de Excel a fecha ISO
     */
    window.excelSerialToDate = function(serial) {
        if (!serial) return '';
        if (typeof serial === 'string') return serial;
        const excelEpoch = new Date(1900, 0, 1);
        const daysOffset = serial - 2;
        const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    };

    // =============================================
    // 3. GRÁFICOS
    // =============================================

    /**
     * Destruye un gráfico Chart.js por ID del canvas
     */
    window.destruirGraficoPorCanvas = function(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return false;

        // Buscar en Chart.instances
        if (Chart && Chart.instances) {
            for (const [id, instance] of Object.entries(Chart.instances)) {
                if (instance.canvas && instance.canvas.id === canvasId) {
                    try {
                        instance.destroy();
                        return true;
                    } catch(e) {}
                }
            }
        }

        // Limpiar canvas manualmente
        try {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = canvas.clientWidth || 1;
                canvas.height = canvas.clientHeight || 1;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return true;
            }
        } catch(e) {}
        return false;
    };

    /**
     * Destruye todos los gráficos comunes
     */
    window.destruirTodosLosGraficosCompleto = function() {
        const canvasIds = [
            'chartEvolutivoAudios', 'chartDistribucionRangos', 'chartEvolutivoAtributos',
            'chartEvolutivoQuiebres', 'chartComparativa', 'chartEvolutivo',
            'chartEvolutivoFrentes', 'chartResultados', 'chartTendencias',
            'chartAuditoriasPorAuditor', 'chartEvolutivoAuditorias', 'chartTablasSize',
            'chartGestionLlamadas', 'chartEvolutivoCuartiles'
        ];
        canvasIds.forEach(id => window.destruirGraficoPorCanvas(id));
    };

    // =============================================
    // 4. GENERAL
    // =============================================

    /**
     * Genera ID único para documentos PDA
     */
    window.generarDocumentoId = function() {
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const dia = String(ahora.getDate()).padStart(2, '0');
        const aleatorio = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PDA-${anio}${mes}${dia}-${aleatorio}`;
    };

    /**
     * Parsea una línea CSV respetando comillas
     */
    window.parseCSVLine = function(linea) {
        const resultados = [];
        let enComillas = false;
        let valorActual = '';
        let i = 0;
        while (i < linea.length) {
            const char = linea[i];
            if (char === '"') {
                if (i + 1 < linea.length && linea[i + 1] === '"') {
                    valorActual += '"';
                    i += 2;
                    continue;
                }
                enComillas = !enComillas;
            } else if (char === ',' && !enComillas) {
                resultados.push(valorActual);
                valorActual = '';
            } else {
                valorActual += char;
            }
            i++;
        }
        resultados.push(valorActual);
        return resultados.map(val => {
            if (val.startsWith('"') && val.endsWith('"')) {
                return val.slice(1, -1).replace(/""/g, '"');
            }
            return val;
        });
    };

    console.log('✅ Módulo utils.js cargado');

})();