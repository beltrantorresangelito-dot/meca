const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const fs =
  require('node:fs');

const path =
  require('node:path');


// ==========================================================
// FUENTES
// ==========================================================

const pdaJs =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../public/js/supervisor/pda.js'
    ),
    'utf8'
  );


const matrixRepository =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/modules/matrix/matrix.repository.js'
    ),
    'utf8'
  );


const supervisorJs =
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../public/js/supervisor.js'
    ),
    'utf8'
  );


// ==========================================================
// PDA-F107-001
// Documento inicial permanece dentro del módulo PDA
// ==========================================================

test(
  'PDA-F107-001 documento inicial vive en pda.js y no en supervisor.js',
  () => {

    assert.match(
      pdaJs,
      /function\s+generarDocumentoHtmlPda\s*\(/
    );


    assert.match(
      pdaJs,
      /function\s+generarDocumentoTextoPda\s*\(/
    );


    assert.doesNotMatch(
      supervisorJs,
      /function\s+generarDocumentoHtmlPda\s*\(/
    );


    assert.doesNotMatch(
      supervisorJs,
      /function\s+generarDocumentoTextoPda\s*\(/
    );
  }
);


// ==========================================================
// PDA-F107-002
// Formato de fechas del documento
// ==========================================================

test(
  'PDA-F107-002 documento utiliza formateador de fecha dd/mm/yyyy',
  () => {

    assert.match(
      pdaJs,
      /function\s+formatearFechaDocumentoPda\s*\(/
    );


    assert.match(
      pdaJs,
      /formatearPeriodoDocumentoPda/
    );


    assert.match(
      pdaJs,
      /day\s*:\s*['"]2-digit['"]/
    );


    assert.match(
      pdaJs,
      /month\s*:\s*['"]2-digit['"]/
    );


    assert.match(
      pdaJs,
      /year\s*:\s*['"]numeric['"]/
    );
  }
);


// ==========================================================
// PDA-F107-003
// Trazabilidad de llamadas
// ==========================================================

test(
  'PDA-F107-003 documento conserva código llamada ticket fecha y nota',
  () => {

    assert.match(
      pdaJs,
      /codigo_llamada/
    );


    assert.match(
      pdaJs,
      /ticketPSI|ticket_psi|ticket/
    );


    assert.match(
      pdaJs,
      /fecha_auditoria|fechaOriginal/
    );


    assert.match(
      pdaJs,
      /notaFinal|nota_final|nota/
    );


    assert.match(
      pdaJs,
      /`L\$\{index\s*\+\s*1\}`/
    );
  }
);


// ==========================================================
// PDA-F107-004
// Matriz submotivo x llamada
// ==========================================================

test(
  'PDA-F107-004 documento construye matriz de submotivos por llamada',
  () => {

    assert.match(
      pdaJs,
      /function\s+construirMatrizHallazgosDocumentoPda\s*\(/
    );


    assert.match(
      pdaJs,
      /total_evaluaciones/
    );


    assert.match(
      pdaJs,
      /total_llamadas/
    );


    assert.match(
      pdaJs,
      /recurrencia_pct/
    );


    assert.match(
      pdaJs,
      /llamadas/
    );
  }
);


// ==========================================================
// PDA-F107-005
// Clasificación PDA
// ==========================================================

test(
  'PDA-F107-005 documento conserva clasificación PROCESO HABILIDADES FEEDBACK',
  () => {

    assert.match(
      pdaJs,
      /clasificacion_pda_codigo/
    );


    assert.match(
      pdaJs,
      /['"]proceso['"]/
    );


    assert.match(
      pdaJs,
      /['"]habilidades['"]/
    );


    assert.match(
      pdaJs,
      /['"]feedback['"]/
    );


    assert.match(
      pdaJs,
      /HABILIDADES BLANDAS/
    );


    assert.match(
      pdaJs,
      /FEEDBACK/
    );
  }
);


// ==========================================================
// PDA-F107-006
// Resumen semántico
// ==========================================================

test(
  'PDA-F107-006 documento usa incumplimientos frentes atributos y submotivos',
  () => {

    assert.match(
      pdaJs,
      /Incumplimientos/
    );


    assert.match(
      pdaJs,
      /Frentes/
    );


    assert.match(
      pdaJs,
      /Atributos/
    );


    assert.match(
      pdaJs,
      /Submotivos/
    );


    /*
     * Evitamos que la tarjeta principal vuelva
     * conceptualmente a "Hallazgos".
     */
    assert.doesNotMatch(
      pdaJs,
      /['"]Hallazgos['"]\s*\]/
    );
  }
);


// ==========================================================
// PDA-F107-007
// Multicampaña
// ==========================================================

test(
  'PDA-F107-007 documento soporta múltiples campañas del mismo ciclo',
  () => {

    assert.match(
      pdaJs,
      /function\s+obtenerCampanasDocumentoPda\s*\(/
    );


    assert.match(
      pdaJs,
      /Campaña\(s\)/
    );


    assert.match(
      pdaJs,
      /\.join\(\s*['"]\s*\/\s*['"]\s*\)/
    );
  }
);


// ==========================================================
// PDA-F107-008
// Contexto real de matriz y quiebre desde backend
// ==========================================================

test(
  'PDA-F107-008 estructura de matriz resuelve matriz y quiebre desde backend',
  () => {

    assert.match(
      matrixRepository,
      /FROM\s+matrices\s+m/i
    );


    assert.match(
      matrixRepository,
      /JOIN\s+quiebres\s+q/i
    );


    assert.match(
      matrixRepository,
      /ON\s+q\.id\s*=\s*m\.quiebre_id/i
    );


    assert.match(
      matrixRepository,
      /m\.codigo\s+AS\s+matriz_codigo/i
    );


    assert.match(
      matrixRepository,
      /m\.nombre\s+AS\s+matriz_nombre/i
    );


    assert.match(
      matrixRepository,
      /q\.codigo\s+AS\s+quiebre_codigo/i
    );


    assert.match(
      matrixRepository,
      /q\.nombre\s+AS\s+quiebre_nombre/i
    );
  }
);


// ==========================================================
// PDA-F107-009
// Snapshot consume contexto enriquecido
// ==========================================================

test(
  'PDA-F107-009 snapshot PDA consume estructura matriz y quiebre',
  () => {

    assert.match(
      pdaJs,
      /estructura\?\.quiebre/
    );


    assert.match(
      pdaJs,
      /estructura\?\.matriz/
    );


    assert.match(
      pdaJs,
      /versionMatriz/
    );


    /*
     * No debería depender exclusivamente del
     * fallback visual "Quiebre 1".
     */
    assert.doesNotMatch(
      pdaJs,
      /`Quiebre\s+\$\{contexto\.quiebre_id\}`/
    );
  }
);


// ==========================================================
// PDA-F107-010
// Impresión profesional A4
// ==========================================================

test(
  'PDA-F107-010 documento está preparado para impresión A4 con colores',
  () => {

    assert.match(
      pdaJs,
      /@page/
    );


    assert.match(
      pdaJs,
      /A4/
    );


    assert.match(
      pdaJs,
      /landscape/
    );


    assert.match(
      pdaJs,
      /portrait/
    );


    assert.match(
      pdaJs,
      /print-color-adjust\s*:\s*exact/
    );


    assert.match(
      pdaJs,
      /-webkit-print-color-adjust\s*:\s*exact/
    );


    assert.match(
      pdaJs,
      /MOVISTAR/
    );


    assert.match(
      pdaJs,
      /MECA/
    );
  }
);


// ==========================================================
// PDA-F107-011
// Documento de texto alineado
// ==========================================================

test(
  'PDA-F107-011 documento texto contiene contexto evaluaciones y submotivos',
  () => {

    assert.match(
      pdaJs,
      /1\.\s*CONTEXTO DE EVALUACIÓN/
    );


    assert.match(
      pdaJs,
      /2\.\s*RESUMEN DEL DIAGNÓSTICO/
    );


    assert.match(
      pdaJs,
      /3\.\s*EVALUACIONES CONSIDERADAS/
    );


    assert.match(
      pdaJs,
      /4\.\s*MATRIZ DE SUBMOTIVOS IDENTIFICADOS/
    );


    assert.match(
      pdaJs,
      /Incumplimientos detectados/
    );


    assert.match(
      pdaJs,
      /Submotivos afectados/
    );
  }
);


// ==========================================================
// PDA-F107-012
// Documento inicial no muestra gestión futura
// ==========================================================

test(
  'PDA-F107-012 documento inicial termina en diagnóstico y plan de desarrollo',
  () => {

    assert.match(
      pdaJs,
      /5\.\s*Plan de desarrollo/i
    );


    /*
     * No buscamos prohibir esas palabras en todo pda.js,
     * porque existen en la pestaña de gestión.
     *
     * La regla importante es que el HTML inicial se
     * identifique como diagnóstico inicial.
     */
    assert.match(
      pdaJs,
      /diagnóstico inicial\s+del ciclo basal/i
    );
  }
);