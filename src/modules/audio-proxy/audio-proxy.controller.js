class AudioProxyController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(payload));
  }

  static validateTicketId(ticketId) {
    if (!ticketId || isNaN(ticketId)) {
      const error = new Error('Ticket ID inválido');
      error.status = 400;
      throw error;
    }

    return ticketId;
  }

  async reproducir(res, ticketId) {
    try {
      AudioProxyController.validateTicketId(ticketId);

      console.log(
        `🎧 [PROXY] Solicitando audio para ticket: ${ticketId}`
      );

      const audio =
        await this.service.reproducir(ticketId);

      res.setHeader(
        'Content-Type',
        audio.contentType
      );

      res.setHeader(
        'Accept-Ranges',
        'bytes'
      );

      res.setHeader(
        'Cache-Control',
        'public, max-age=86400'
      );

      res.setHeader(
        'Content-Length',
        audio.data.length
      );

      if (audio.contentDisposition) {
        res.setHeader(
          'Content-Disposition',
          audio.contentDisposition
        );
      }

      console.log(
        `✅ [PROXY] Audio servido para ticket: ${ticketId} ` +
        `(${audio.contentType}, ${(audio.data.length / 1024).toFixed(1)} KB)`
      );

      res.writeHead(200);
      res.end(audio.data);
    } catch (error) {
      console.error(
        '❌ [PROXY] Error sirviendo audio:',
        error.message
      );

      AudioProxyController.json(
        res,
        error.status || 500,
        {
          error: error.status
            ? error.message
            : 'Error al obtener el audio',
          details:
            error.details || error.message
        }
      );
    }
  }

  async verificar(res, ticketId) {
    try {
      const result =
        await this.service.verificar(ticketId);

      AudioProxyController.json(
        res,
        result.status,
        result.data
      );
    } catch (error) {
      console.error(
        '❌ [PROXY] Error verificando audio:',
        error.message
      );

      AudioProxyController.json(
        res,
        500,
        {
          existe: false,
          error: error.message
        }
      );
    }
  }
}

module.exports = AudioProxyController;
