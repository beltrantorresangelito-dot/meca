class GenericQueryService {
  constructor(repository) {
    this.repository = repository;
  }

  static error(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async execute(query) {
    if (!query || typeof query !== 'object') {
      throw GenericQueryService.error(
        'Payload inválido'
      );
    }

    const {
      table,
      operation,
      selectFields,
      filters,
      data,
      orderBy,
      orderAscending,
      limit,
      isSingle,
      isMaybeSingle,
      isHead,
      countOption
    } = query;

    if (!table) {
      throw GenericQueryService.error(
        'Tabla no especificada'
      );
    }

    switch (operation) {
      case 'select':
        return this.repository.select({
          table,
          selectFields,
          filters,
          orderBy,
          orderAscending,
          limit,
          isSingle,
          isMaybeSingle,
          isHead,
          countOption
        });

      case 'insert':
        if (!data) {
          throw GenericQueryService.error(
            'No hay datos para insertar'
          );
        }

        return this.repository.insert({
          table,
          data
        });

      case 'update':
        if (!data) {
          throw GenericQueryService.error(
            'No hay datos para actualizar'
          );
        }

        return this.repository.update({
          table,
          data,
          filters
        });

      case 'delete':
        return this.repository.delete({
          table,
          filters
        });

      case 'upsert':
        if (!data) {
          throw GenericQueryService.error(
            'No hay datos para upsert'
          );
        }

        return this.repository.upsert({
          table,
          data,
          filters
        });

      default:
        throw GenericQueryService.error(
          `Operacion no soportada: ${operation}`
        );
    }
  }
}

module.exports = GenericQueryService;
