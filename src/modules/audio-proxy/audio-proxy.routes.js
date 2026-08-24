const AudioProxyService = require('./audio-proxy.service');
const AudioProxyController = require('./audio-proxy.controller');

function createAudioProxyHandler({
  baseUrl,
  fetchImpl = global.fetch
} = {}) {
  const service = new AudioProxyService({
    baseUrl,
    fetchImpl
  });

  const controller =
    new AudioProxyController(service);

  return async function handleAudioProxyRequest({
    ruta,
    metodo,
    respuesta
  }) {
    if (
      ruta.startsWith('/api/audio/reproducir/') &&
      metodo === 'GET'
    ) {
      const ticketId =
        ruta.split('/').pop();

      await controller.reproducir(
        respuesta,
        ticketId
      );

      return true;
    }

    if (
      ruta.startsWith('/api/audio/verificar/') &&
      metodo === 'GET'
    ) {
      const ticketId =
        ruta.split('/').pop();

      await controller.verificar(
        respuesta,
        ticketId
      );

      return true;
    }

    return false;
  };
}

module.exports = {
  createAudioProxyHandler
};
