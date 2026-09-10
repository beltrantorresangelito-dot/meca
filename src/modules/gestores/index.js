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
    createGestoresHandler
} =
    require(
        './gestores.routes'
    );


module.exports = {
    GestoresRepository,
    GestoresService,
    GestoresController,
    createGestoresHandler
};