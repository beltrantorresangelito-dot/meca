class GestoresController {
    constructor(service) {
        this.service =
            service;
    }


    static json(
        res,
        status,
        payload
    ) {
        res.writeHead(
            status,
            {
                'Content-Type':
                    'application/json; charset=utf-8'
            }
        );


        res.end(
            JSON.stringify(
                payload
            )
        );
    }


    async getSummary(
        req,
        res,
        query = {}
    ) {
        try {

            // ==================================================
            // 1. PERÍODO
            // ==================================================

            const periodo =
                String(
                    query.periodo ||
                    ''
                ).trim() ||
                null;


            if (
                periodo &&
                !/^\d{4}-\d{2}$/.test(
                    periodo
                )
            ) {
                const error =
                    new Error(
                        'Período inválido. Use YYYY-MM.'
                    );


                error.status =
                    400;


                throw error;
            }


            // ==================================================
            // 2. QUIEBRE
            // ==================================================

            const quiebreId =
                query.quiebre_id
                    ? Number(
                        query.quiebre_id
                    )
                    : null;


            // ==================================================
            // 3. CAMPAÑA
            // ==================================================

            const campanaTexto =
                String(
                    query.campana_id ||
                    ''
                ).trim();


            const sinCampana =
                campanaTexto ===
                '__SIN_CAMPANA__';


            const campanaId =
                (
                    campanaTexto &&
                    !sinCampana
                )
                    ? Number(
                        campanaTexto
                    )
                    : null;


            // ==================================================
            // 4. SERVICE
            // ==================================================

            const resultado =
                await this.service
                    .getSummary({
                        periodo,
                        quiebreId,
                        campanaId,
                        sinCampana
                    });


            // ==================================================
            // 5. RESPUESTA
            // ==================================================

            GestoresController
                .json(
                    res,
                    200,
                    resultado
                );

        } catch (error) {

            console.error(
                '❌ Error en Gestores 2.0:',
                error
            );


            GestoresController
                .json(
                    res,
                    error.status ||
                    500,
                    {
                        success:
                            false,

                        error:
                            error.message ||
                            'Error interno de Gestores'
                    }
                );
        }
    }
}


module.exports =
    GestoresController;