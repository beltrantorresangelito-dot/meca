class GestoresRepository {
    constructor(db) {
        this.db = db;
    }


    async listEvaluations({
        quiebreId = null,
        campanaId = null,
        sinCampana = false
    } = {}) {

        const condiciones = [];
        const parametros = [];


        if (quiebreId) {
            parametros.push(
                Number(quiebreId)
            );

            condiciones.push(`
            COALESCE(
                e.quiebre_id,
                c.quiebre_id
            ) = $${parametros.length}
        `);
        }


        if (sinCampana) {
            condiciones.push(`
            e.campana_id IS NULL
        `);

        } else if (campanaId) {
            parametros.push(
                Number(campanaId)
            );

            condiciones.push(`
            e.campana_id = $${parametros.length}
        `);
        }


        const where =
            condiciones.length > 0
                ? `WHERE ${condiciones.join(' AND ')}`
                : '';


        const result =
            await this.db.query(
                `
                SELECT
                    e.*,

                    COALESCE(
                        e.quiebre_id,
                        c.quiebre_id
                    ) AS quiebre_efectivo_id

                FROM evaluaciones e

                LEFT JOIN campanas c
                    ON c.id = e.campana_id

                ${where}

                ORDER BY
                    e.fecha ASC,
                    e.id ASC
            `,
                parametros
            );


        return result.rows;
    }


    async listAgents() {
        const result =
            await this.db.query(`
                SELECT
                    nombre,
                    lider_2026
                FROM agentes
                WHERE nombre IS NOT NULL
                  AND TRIM(nombre) <> ''
            `);

        return result.rows;
    }


    async listPda() {
        const result =
            await this.db.query(`
            SELECT
                id,
                agente,
                estado,

                ciclo_basal_numero,

                fecha_deteccion,
                fecha_inicio_ciclo_basal,
                fecha_fin_ciclo_basal,

                quiebre_id,
                campana_id,
                matriz_id,
                version_matriz_id,

                fecha_feedback,
                fecha_inicio_seguimiento,

                fecha_capacitacion,
                fecha_inicio_seguimiento_capacitacion,

                promedio_basal,
                cuartil_basal,

                promedio_seguimiento,
                cuartil_seguimiento,
                ciclo_seguimiento_numero

            FROM pda_cabecera

            ORDER BY
                agente,
                fecha_deteccion,
                id
        `);

        return result.rows;
    }

}


module.exports =
    GestoresRepository;