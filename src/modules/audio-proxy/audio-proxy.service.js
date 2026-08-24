class AudioProxyService {
  constructor({ baseUrl, fetchImpl = global.fetch } = {}) {
    if (!baseUrl) {
      throw new Error('AudioProxyService requiere baseUrl');
    }

    if (typeof fetchImpl !== 'function') {
      throw new Error('AudioProxyService requiere fetch');
    }

    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetch = fetchImpl;
  }

  async reproducir(ticketId) {
    const response = await this.fetch(
      `${this.baseUrl}/api/audio/reproducir/${ticketId}`
    );

    if (!response.ok) {
      let errorText = '';

      try {
        errorText = await response.text();
      } catch (error) {
        errorText = 'Sin detalles adicionales';
      }

      const proxyError = new Error(
        `Error desde servidor de audio: ${response.status}`
      );

      proxyError.status = response.status;
      proxyError.details = errorText.substring(0, 300);

      throw proxyError;
    }

    const contentType =
      response.headers.get('content-type') ||
      'application/octet-stream';

    const contentDisposition =
      response.headers.get('content-disposition');

    const buffer = await response.arrayBuffer();
    const data = Buffer.from(buffer);

    return {
      status: response.status,
      contentType,
      contentDisposition,
      data
    };
  }

  async verificar(ticketId) {
    const response = await this.fetch(
      `${this.baseUrl}/api/audio/verificar/${ticketId}`
    );

    const data = await response.json();

    return {
      status: response.status,
      data
    };
  }
}

module.exports = AudioProxyService;
