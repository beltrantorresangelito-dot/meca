const GestoresRepository =
    require(
        './gestores.repository'
    );

const GestoresService =
    require(
        './gestores.service'
    );

const GestoresController =
    require(
        './gestores.controller'
    );


const {
    QuartileCriteriaRepository,
    QuartileCriteriaService
} =
    require(
        '../quartile-criteria'
    );


function createGestoresHandler({
    db
}) {
    if (!db) {
        throw new Error(
            'createGestoresHandler requiere db'
        );
    }


    const repository =
        new GestoresRepository(
            db
        );


    const quartileRepository =
        new QuartileCriteriaRepository(
            db
        );


    const quartileService =
        new QuartileCriteriaService(
            quartileRepository
        );


    const service =
        new GestoresService({
            repository,
            quartileService
        });


    const controller =
        new GestoresController(
            service
        );


    return async function handleGestoresRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query = {}
    }) {
        if (
            metodo !==
            'GET'
        ) {
            return false;
        }


        if (
            ruta ===
            '/api/gestores/resumen'
        ) {
            if (
                !peticion.auth
            ) {
                GestoresController
                    .json(
                        respuesta,
                        401,
                        {
                            error:
                                'Token requerido'
                        }
                    );

                return true;
            }


            await controller
                .getSummary(
                    peticion,
                    respuesta,
                    query
                );


            return true;
        }


        return false;
    };
}


module.exports = {
    createGestoresHandler
};