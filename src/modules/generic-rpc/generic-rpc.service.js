class GenericRpcService {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(functionName, params = {}) {
    if (functionName === 'cerrar_mes') {
      return {
        type: 'direct',
        payload:
          await this.repository.closeMonth(params)
      };
    }

    if (
      functionName ===
      'limpiar_sesiones_expiradas'
    ) {
      return {
        type: 'wrapped',
        payload: {
          data:
            await this.repository
              .closeExpiredSessions(),
          error: null
        }
      };
    }

    return {
      type: 'wrapped',
      payload: {
        data:
          await this.repository.callFunction(
            functionName,
            params
          ),
        error: null
      }
    };
  }
}

module.exports = GenericRpcService;
