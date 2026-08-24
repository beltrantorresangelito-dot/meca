class MatrixRecalculationService {
  constructor(repository) {
    this.repository = repository;
  }

  async recalculate() {
    let actualizados = 0;
    let errores = 0;

    console.log(
      '📊 PASO 1: Actualizando pesos en detalles_evaluacion...'
    );

    const detalles =
      await this.repository.listDetailsWithSubreason();

    console.log(
      `   Total detalles a procesar: ${detalles.length}`
    );

    for (const detalle of detalles) {
      try {
        const nuevoPeso =
          await this.repository.findActiveWeightBySubreasonCode(
            detalle.submotivo
          );

        if (nuevoPeso !== null) {
          await this.repository.updateDetailWeight(
            detalle.id,
            nuevoPeso
          );

          actualizados++;

          if (actualizados % 1000 === 0) {
            console.log(
              `   Procesados ${actualizados} detalles...`
            );
          }
        } else {
          console.log(
            `   ⚠️ Submotivo no encontrado: ${detalle.submotivo}`
          );
        }
      } catch (error) {
        errores++;

        console.error(
          `   ❌ Error en detalle ${detalle.id}:`,
          error.message
        );
      }
    }

    console.log(
      `   ✅ ${actualizados} detalles actualizados, ${errores} errores`
    );

    console.log(
      '📊 PASO 2: Recalculando totales por evaluación...'
    );

    const evaluaciones =
      await this.repository.listDistinctEvaluationIds();

    console.log(
      `   Total evaluaciones a procesar: ${evaluaciones.length}`
    );

    let evaluacionesActualizadas = 0;

    for (const evaluacionId of evaluaciones) {
      try {
        const totals =
          await this.repository.calculateEvaluationTotals(
            evaluacionId
          );

        await this.repository.updateEvaluationTotals(
          evaluacionId,
          totals
        );

        evaluacionesActualizadas++;

        if (evaluacionesActualizadas % 100 === 0) {
          console.log(
            `   Procesadas ${evaluacionesActualizadas} evaluaciones...`
          );
        }
      } catch (error) {
        console.error(
          `   ❌ Error en evaluación ${evaluacionId}:`,
          error.message
        );
      }
    }

    console.log(
      `   ✅ ${evaluacionesActualizadas} evaluaciones actualizadas`
    );

    const resumen =
      await this.repository.getFinalSummary();

    console.log('📊 RESUMEN FINAL:');
    console.log(
      `   Total evaluaciones: ${resumen.total_evaluaciones}`
    );
    console.log(
      `   Promedio notas: ${resumen.promedio_notas}%`
    );
    console.log(
      `   Nota mínima: ${resumen.nota_min}%`
    );
    console.log(
      `   Nota máxima: ${resumen.nota_max}%`
    );

    return {
      success: true,
      detalles_actualizados: actualizados,
      evaluaciones_actualizadas:
        evaluacionesActualizadas,
      errores,
      resumen,
      message:
        `${evaluacionesActualizadas} evaluaciones y ` +
        `${actualizados} detalles actualizados`
    };
  }
}

module.exports = MatrixRecalculationService;
