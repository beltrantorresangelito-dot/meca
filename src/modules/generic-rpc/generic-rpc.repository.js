class GenericRpcRepository {
  constructor(db) {
    this.db = db;
  }

  async closeMonth(params = {}) {
    const {
      anio,
      mes
    } = params;

    const result =
      await this.db.query(
        'SELECT cerrar_mes($1, $2, $3) as resultado',
        [
          anio || params.p_anio,
          mes || params.p_mes,
          params.p_usuario || 'admin'
        ]
      );

    return result.rows[0]?.resultado;
  }

  async closeExpiredSessions() {
    const result =
      await this.db.query(
        "UPDATE sesiones_activas SET estado = 'cerrada', fecha_logout = NOW() WHERE estado = 'activa' AND ultima_actividad < NOW() - INTERVAL '30 minutes'"
      );

    return {
      limpiadas: result.rowCount
    };
  }

  async callFunction(
    functionName,
    params = {}
  ) {
    const paramKeys =
      Object.keys(params);

    const paramValues =
      Object.values(params);

    if (paramKeys.length > 0) {
      const placeholders =
        paramKeys
          .map(
            (_, i) => `$${i + 1}`
          )
          .join(', ');

      const result =
        await this.db.query(
          `SELECT * FROM ${functionName}(${placeholders})`,
          paramValues
        );

      return result.rows;
    }

    const result =
      await this.db.query(
        `SELECT * FROM ${functionName}()`
      );

    return result.rows;
  }
}

module.exports = GenericRpcRepository;
