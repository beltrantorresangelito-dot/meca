const DomainRepository = require('./domain.repository');

class DomainService {
  constructor(repository = new DomainRepository()) { this.repository = repository; }

  static normalizeDateOnly(
    value,
    fieldName,
    {
      required = true
    } = {}
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      if (!required) {
        return null;
      }

      const error =
        new Error(
          `${fieldName} es obligatorio`
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    const normalized =
      String(value).trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        normalized
      )
    ) {
      const error =
        new Error(
          `${fieldName} debe tener formato YYYY-MM-DD`
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    const [
      year,
      month,
      day
    ] = normalized
      .split('-')
      .map(Number);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      const error =
        new Error(
          `${fieldName} contiene una fecha inválida`
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    return normalized;
  }

  static normalizeRequiredText(value, fieldName, maxLength = null) {
    const normalized =
      typeof value === 'string'
        ? value.trim()
        : '';

    if (!normalized) {
      const error = new Error(
        `${fieldName} es obligatorio`
      );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    if (
      maxLength !== null &&
      normalized.length > maxLength
    ) {
      const error = new Error(
        `${fieldName} excede la longitud máxima de ${maxLength}`
      );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    return normalized;
  }


  static normalizeOptionalText(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const normalized = String(value).trim();

    return normalized || null;
  }


  static normalizeBoolean(value, defaultValue = true) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 1 || value === '1' || value === 'true') {
      return true;
    }

    if (value === 0 || value === '0' || value === 'false') {
      return false;
    }

    const error = new Error(
      'activo debe ser booleano'
    );

    error.code = 'VALIDATION_ERROR';
    error.status = 400;
    throw error;
  }

  static parsePositiveId(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      const error = new Error(`${fieldName} debe ser un entero positivo`);
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    return parsed;
  }

  static normalizeDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const error = new Error('fecha debe tener formato YYYY-MM-DD');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    return text;
  }

  async listBreaks(options = {}) {
    return this.repository.listBreaks(
      options
    );
  }

  async getBreak(id) {
    const breakId = DomainService.parsePositiveId(id, 'quiebreId');
    const item = await this.repository.getBreakById(breakId);
    if (!item) {
      const error = new Error(`Quiebre ${breakId} no encontrado`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    return item;
  }

  async listCampaigns(breakId, options = {}) {
    const id = DomainService.parsePositiveId(breakId, 'quiebreId');
    return this.repository.listCampaignsByBreak(id, options);
  }

  async listMatrices(
    breakId,
    options = {}
  ) {
    const id =
      DomainService.parsePositiveId(
        breakId,
        'quiebreId'
      );

    return this.repository
      .listMatricesByBreak(
        id,
        options
      );
  }

  async getCampaignMatrixHistory(campaignId) {
    const id = DomainService.parsePositiveId(campaignId, 'campanaId');
    return this.repository.listCampaignMatrixAssignments(id);
  }

  async resolveContext({
    campaignId,
    date = null
  }) {
    const id =
      DomainService.parsePositiveId(
        campaignId,
        'campanaId'
      );

    const normalizedDate =
      DomainService.normalizeDate(date);

    let rows;

    try {
      rows =
        await this.repository
          .resolveEvaluationContext(
            id,
            normalizedDate
          );

    } catch (error) {

      if (
        error?.code === 'P0001' &&
        /No existe matriz vigente/i.test(
          error.message || ''
        )
      ) {
        const domainError =
          new Error(error.message);

        domainError.code =
          'CONTEXT_NOT_FOUND';

        domainError.status = 404;

        throw domainError;
      }

      if (
        error?.code === 'P0001' &&
        /más de una matriz vigente/i.test(
          error.message || ''
        )
      ) {
        const domainError =
          new Error(error.message);

        domainError.code =
          'CONTEXT_CONFLICT';

        domainError.status = 409;

        throw domainError;
      }

      if (
        error?.code === 'P0001' &&
        /no existe una versión de matriz aplicable/i.test(
          error.message || ''
        )
      ) {
        const domainError =
          new Error(error.message);

        domainError.code =
          'VERSION_NOT_FOUND';

        domainError.status = 404;

        throw domainError;
      }

      throw error;
    }

    if (rows.length !== 1) {
      const error =
        new Error(
          `El contexto de evaluación para campaña ${id} esperaba 1 resultado y obtuvo ${rows.length}`
        );

      error.code =
        'DOMAIN_CONFIGURATION_ERROR';

      error.status = 409;

      throw error;
    }

    return rows[0];
  }

  async validateConsistency() {
    const checks = await this.repository.getDomainConsistency();
    const violations = Object.entries(checks)
      .filter(([, value]) => Number(value) !== 0)
      .map(([check, value]) => ({ check, count: Number(value) }));

    return {
      ok: violations.length === 0,
      checks,
      violations
    };
  }
  async createBreak(data = {}) {
    const codigo =
      DomainService.normalizeRequiredText(
        data.codigo,
        'codigo',
        50
      ).toUpperCase();

    const nombre =
      DomainService.normalizeRequiredText(
        data.nombre,
        'nombre',
        150
      );

    const descripcion =
      DomainService.normalizeOptionalText(
        data.descripcion
      );

    const activo =
      DomainService.normalizeBoolean(
        data.activo,
        true
      );

    try {
      return await this.repository.createBreak({
        codigo,
        nombre,
        descripcion,
        activo
      });

    } catch (error) {

      if (error?.code === '23505') {
        const duplicateError =
          new Error(
            `Ya existe un quiebre con código ${codigo}`
          );

        duplicateError.code = 'DUPLICATE_ERROR';
        duplicateError.status = 409;

        throw duplicateError;
      }

      throw error;
    }
  }

  async createCampaign(data = {}) {
    const codigo =
      DomainService.normalizeRequiredText(
        data.codigo,
        'codigo',
        5
      ).toUpperCase();

    if (!/^[A-Z0-9]{1,5}$/.test(codigo)) {
      const error =
        new Error(
          'codigo debe tener entre 1 y 5 caracteres alfanuméricos'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const descripcion =
      DomainService.normalizeRequiredText(
        data.descripcion,
        'descripcion',
        255
      );

    const quiebreId =
      DomainService.parsePositiveId(
        data.quiebreId ??
        data.quiebre_id,
        'quiebreId'
      );

    const quiebre =
      await this.repository.getBreakById(
        quiebreId
      );

    if (!quiebre) {
      const error =
        new Error('Quiebre no encontrado');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!quiebre.activo) {
      const error =
        new Error(
          'No se puede crear una campaña en un quiebre inactivo'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const activa =
      DomainService.normalizeBoolean(
        data.activa,
        true
      );

    try {
      return await this.repository.createCampaign({
        codigo,
        descripcion,
        activa,
        quiebreId
      });

    } catch (error) {

      if (error?.code === '23505') {
        const duplicateError =
          new Error(
            `Ya existe una campaña con código ${codigo}`
          );

        duplicateError.code = 'DUPLICATE_ERROR';
        duplicateError.status = 409;

        throw duplicateError;
      }

      throw error;
    }
  }


  async updateCampaign(id, data = {}) {
    const campaignId =
      DomainService.parsePositiveId(
        id,
        'campanaId'
      );

    const existing =
      await this.repository.getCampaignById(
        campaignId
      );

    if (!existing) {
      const error =
        new Error('Campaña no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const codigo =
      DomainService.normalizeRequiredText(
        data.codigo ?? existing.codigo,
        'codigo',
        5
      ).toUpperCase();

    if (!/^[A-Z0-9]{1,5}$/.test(codigo)) {
      const error =
        new Error(
          'codigo debe tener entre 1 y 5 caracteres alfanuméricos'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const descripcion =
      DomainService.normalizeRequiredText(
        data.descripcion ??
        existing.descripcion,
        'descripcion',
        255
      );

    const quiebreId =
      DomainService.parsePositiveId(
        data.quiebreId ??
        data.quiebre_id ??
        existing.quiebre_id,
        'quiebreId'
      );

    const quiebre =
      await this.repository.getBreakById(
        quiebreId
      );

    if (!quiebre) {
      const error =
        new Error('Quiebre no encontrado');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!quiebre.activo) {
      const error =
        new Error(
          'No se puede asignar la campaña a un quiebre inactivo'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const activa =
      DomainService.normalizeBoolean(
        data.activa,
        existing.activa
      );

    try {
      return await this.repository.updateCampaign(
        campaignId,
        {
          codigo,
          descripcion,
          activa,
          quiebreId
        }
      );

    } catch (error) {

      if (error?.code === '23505') {
        const duplicateError =
          new Error(
            `Ya existe una campaña con código ${codigo}`
          );

        duplicateError.code = 'DUPLICATE_ERROR';
        duplicateError.status = 409;

        throw duplicateError;
      }

      throw error;
    }
  }


  async setCampaignActive(id, activa) {
    const campaignId =
      DomainService.parsePositiveId(
        id,
        'campanaId'
      );

    const existing =
      await this.repository.getCampaignById(
        campaignId
      );

    if (!existing) {
      const error =
        new Error('Campaña no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const normalizedActive =
      DomainService.normalizeBoolean(
        activa
      );

    return this.repository.setCampaignActive(
      campaignId,
      normalizedActive
    );
  }

  async updateBreak(id, data = {}) {
    const breakId =
      DomainService.parsePositiveId(
        id,
        'quiebreId'
      );

    const existing =
      await this.repository.getBreakById(
        breakId
      );

    if (!existing) {
      const error =
        new Error('Quiebre no encontrado');

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    const codigo =
      DomainService.normalizeRequiredText(
        data.codigo,
        'codigo',
        50
      ).toUpperCase();

    const nombre =
      DomainService.normalizeRequiredText(
        data.nombre,
        'nombre',
        150
      );

    const descripcion =
      DomainService.normalizeOptionalText(
        data.descripcion
      );

    const activo =
      DomainService.normalizeBoolean(
        data.activo,
        existing.activo
      );

    try {
      return await this.repository.updateBreak(
        breakId,
        {
          codigo,
          nombre,
          descripcion,
          activo
        }
      );

    } catch (error) {

      if (error?.code === '23505') {
        const duplicateError =
          new Error(
            `Ya existe un quiebre con código ${codigo}`
          );

        duplicateError.code = 'DUPLICATE_ERROR';
        duplicateError.status = 409;

        throw duplicateError;
      }

      throw error;
    }
  }

  async createMatrix(data = {}) {
    const codigo =
      DomainService.normalizeRequiredText(
        data.codigo,
        'codigo',
        50
      ).toUpperCase();

    const nombre =
      DomainService.normalizeRequiredText(
        data.nombre,
        'nombre',
        150
      );

    const descripcion =
      DomainService.normalizeOptionalText(
        data.descripcion
      );

    const quiebreId =
      DomainService.parsePositiveId(
        data.quiebreId ??
        data.quiebre_id,
        'quiebreId'
      );

    const quiebre =
      await this.repository.getBreakById(
        quiebreId
      );

    if (!quiebre) {
      const error =
        new Error('Quiebre no encontrado');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!quiebre.activo) {
      const error =
        new Error(
          'No se puede crear una matriz en un quiebre inactivo'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const activa =
      DomainService.normalizeBoolean(
        data.activa,
        true
      );

    try {
      return await this.repository.createMatrix({
        codigo,
        nombre,
        descripcion,
        activa,
        quiebreId
      });

    } catch (error) {

      if (error?.code === '23505') {
        const duplicateError =
          new Error(
            `Ya existe una matriz con código ${codigo} en el quiebre seleccionado`
          );

        duplicateError.code = 'DUPLICATE_ERROR';
        duplicateError.status = 409;

        throw duplicateError;
      }

      throw error;
    }
  }


  async updateMatrix(id, data = {}) {
    const matrixId =
      DomainService.parsePositiveId(
        id,
        'matrizId'
      );

    const existing =
      await this.repository.getMatrixById(
        matrixId
      );

    if (!existing) {
      const error =
        new Error('Matriz no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const codigo =
      DomainService.normalizeRequiredText(
        data.codigo ?? existing.codigo,
        'codigo',
        50
      ).toUpperCase();

    const nombre =
      DomainService.normalizeRequiredText(
        data.nombre ?? existing.nombre,
        'nombre',
        150
      );

    const descripcion =
      data.descripcion !== undefined
        ? DomainService.normalizeOptionalText(
          data.descripcion
        )
        : existing.descripcion;

    const quiebreId =
      DomainService.parsePositiveId(
        data.quiebreId ??
        data.quiebre_id ??
        existing.quiebre_id,
        'quiebreId'
      );

    const quiebre =
      await this.repository.getBreakById(
        quiebreId
      );

    if (!quiebre) {
      const error =
        new Error('Quiebre no encontrado');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!quiebre.activo) {
      const error =
        new Error(
          'No se puede asignar la matriz a un quiebre de origen inactivo'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const activa =
      DomainService.normalizeBoolean(
        data.activa,
        existing.activa
      );

    try {
      return await this.repository.updateMatrix(
        matrixId,
        {
          codigo,
          nombre,
          descripcion,
          activa,
          quiebreId
        }
      );

    } catch (error) {

      if (error?.code === '23505') {
        const duplicateError =
          new Error(
            `Ya existe una matriz con código ${codigo} en el quiebre seleccionado`
          );

        duplicateError.code = 'DUPLICATE_ERROR';
        duplicateError.status = 409;

        throw duplicateError;
      }

      throw error;
    }
  }

  async createCampaignMatrixAssignment(
    data = {}
  ) {
    const campanaId =
      DomainService.parsePositiveId(
        data.campanaId ??
        data.campana_id,
        'campanaId'
      );

    const matrizId =
      DomainService.parsePositiveId(
        data.matrizId ??
        data.matriz_id,
        'matrizId'
      );

    const vigenteDesde =
      DomainService.normalizeDateOnly(
        data.vigenteDesde ??
        data.vigente_desde,
        'vigenteDesde'
      );

    const vigenteHasta =
      DomainService.normalizeDateOnly(
        data.vigenteHasta ??
        data.vigente_hasta,
        'vigenteHasta',
        {
          required: false
        }
      );

    if (
      vigenteHasta &&
      vigenteHasta < vigenteDesde
    ) {
      const error =
        new Error(
          'vigenteHasta no puede ser anterior a vigenteDesde'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    const campana =
      await this.repository.getCampaignById(
        campanaId
      );

    if (!campana) {
      const error =
        new Error('Campaña no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    if (!campana.activa) {
      const error =
        new Error(
          'No se puede asignar una matriz a una campaña inactiva'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    const matriz =
      await this.repository.getMatrixById(
        matrizId
      );

    if (!matriz) {
      const error =
        new Error('Matriz no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    if (!matriz.activa) {
      const error =
        new Error(
          'No se puede asignar una matriz inactiva'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    const activa =
      DomainService.normalizeBoolean(
        data.activa,
        true
      );

    if (activa) {
      const overlaps =
        await this.repository
          .findCampaignMatrixOverlaps({
            campanaId,
            vigenteDesde,
            vigenteHasta
          });

      if (
        Array.isArray(overlaps) &&
        overlaps.length > 0
      ) {
        const error =
          new Error(
            'La campaña ya tiene una matriz activa con vigencia solapada'
          );

        error.code =
          'ASSIGNMENT_OVERLAP';

        error.status = 409;

        throw error;
      }
    }

    try {
      return await this.repository
        .createCampaignMatrixAssignment({
          campanaId,
          matrizId,
          vigenteDesde,
          vigenteHasta,
          activa
        });

    } catch (error) {

      /*
       * Protección adicional:
       * PostgreSQL/trigger continúa siendo
       * la última barrera de consistencia.
       */
      if (
        error?.message &&
        /vigencia solapada/i.test(
          error.message
        )
      ) {
        const overlapError =
          new Error(
            'La campaña ya tiene una matriz activa con vigencia solapada'
          );

        overlapError.code =
          'ASSIGNMENT_OVERLAP';

        overlapError.status = 409;

        throw overlapError;
      }

      throw error;
    }
  }


  async updateCampaignMatrixAssignment(
    id,
    data = {}
  ) {
    const assignmentId =
      DomainService.parsePositiveId(
        id,
        'asignacionId'
      );

    const existing =
      await this.repository
        .getCampaignMatrixAssignmentById(
          assignmentId
        );

    if (!existing) {
      const error =
        new Error(
          'Asignación campaña-matriz no encontrada'
        );

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    const campanaId =
      DomainService.parsePositiveId(
        data.campanaId ??
        data.campana_id ??
        existing.campana_id,
        'campanaId'
      );

    const matrizId =
      DomainService.parsePositiveId(
        data.matrizId ??
        data.matriz_id ??
        existing.matriz_id,
        'matrizId'
      );

    const vigenteDesde =
      DomainService.normalizeDateOnly(
        data.vigenteDesde ??
        data.vigente_desde ??
        existing.vigente_desde,
        'vigenteDesde'
      );

    const vigenteHastaInput =
      data.vigenteHasta !== undefined
        ? data.vigenteHasta
        : data.vigente_hasta !== undefined
          ? data.vigente_hasta
          : existing.vigente_hasta;

    const vigenteHasta =
      DomainService.normalizeDateOnly(
        vigenteHastaInput,
        'vigenteHasta',
        {
          required: false
        }
      );

    if (
      vigenteHasta &&
      vigenteHasta < vigenteDesde
    ) {
      const error =
        new Error(
          'vigenteHasta no puede ser anterior a vigenteDesde'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    const campana =
      await this.repository.getCampaignById(
        campanaId
      );

    if (!campana) {
      const error =
        new Error('Campaña no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    const matriz =
      await this.repository.getMatrixById(
        matrizId
      );

    if (!matriz) {
      const error =
        new Error('Matriz no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    const activa =
      DomainService.normalizeBoolean(
        data.activa,
        existing.activa
      );

    /*
     * Si la asignación queda activa,
     * campaña y matriz también deben estarlo.
     */
    if (activa && !campana.activa) {
      const error =
        new Error(
          'No se puede activar una asignación para una campaña inactiva'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    if (activa && !matriz.activa) {
      const error =
        new Error(
          'No se puede activar una asignación con una matriz inactiva'
        );

      error.code = 'VALIDATION_ERROR';
      error.status = 400;

      throw error;
    }

    if (activa) {
      const overlaps =
        await this.repository
          .findCampaignMatrixOverlaps({
            campanaId,
            vigenteDesde,
            vigenteHasta,
            excludeId: assignmentId
          });

      if (
        Array.isArray(overlaps) &&
        overlaps.length > 0
      ) {
        const error =
          new Error(
            'La campaña ya tiene una matriz activa con vigencia solapada'
          );

        error.code =
          'ASSIGNMENT_OVERLAP';

        error.status = 409;

        throw error;
      }
    }

    return this.repository
      .updateCampaignMatrixAssignment(
        assignmentId,
        {
          campanaId,
          matrizId,
          vigenteDesde,
          vigenteHasta,
          activa
        }
      );
  }


  async setCampaignMatrixAssignmentActive(
    id,
    activa
  ) {
    const assignmentId =
      DomainService.parsePositiveId(
        id,
        'asignacionId'
      );

    const existing =
      await this.repository
        .getCampaignMatrixAssignmentById(
          assignmentId
        );

    if (!existing) {
      const error =
        new Error(
          'Asignación campaña-matriz no encontrada'
        );

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    const normalizedActive =
      DomainService.normalizeBoolean(
        activa
      );

    /*
     * Reactivar también debe respetar
     * las reglas de solapamiento.
     */
    if (normalizedActive) {
      const campana =
        await this.repository.getCampaignById(
          existing.campana_id
        );

      const matriz =
        await this.repository.getMatrixById(
          existing.matriz_id
        );

      if (!campana?.activa) {
        const error =
          new Error(
            'No se puede activar una asignación para una campaña inactiva'
          );

        error.code = 'VALIDATION_ERROR';
        error.status = 400;

        throw error;
      }

      if (!matriz?.activa) {
        const error =
          new Error(
            'No se puede activar una asignación con una matriz inactiva'
          );

        error.code = 'VALIDATION_ERROR';
        error.status = 400;

        throw error;
      }

      const overlaps =
        await this.repository
          .findCampaignMatrixOverlaps({
            campanaId:
              existing.campana_id,

            vigenteDesde:
              existing.vigente_desde,

            vigenteHasta:
              existing.vigente_hasta,

            excludeId:
              assignmentId
          });

      if (
        Array.isArray(overlaps) &&
        overlaps.length > 0
      ) {
        const error =
          new Error(
            'La campaña ya tiene una matriz activa con vigencia solapada'
          );

        error.code =
          'ASSIGNMENT_OVERLAP';

        error.status = 409;

        throw error;
      }
    }

    return this.repository
      .setCampaignMatrixAssignmentActive(
        assignmentId,
        normalizedActive
      );
  }

  async setMatrixActive(id, activa) {
    const matrixId =
      DomainService.parsePositiveId(
        id,
        'matrizId'
      );

    const existing =
      await this.repository.getMatrixById(
        matrixId
      );

    if (!existing) {
      const error =
        new Error('Matriz no encontrada');

      error.code = 'NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const normalizedActive =
      DomainService.normalizeBoolean(
        activa
      );

    return this.repository.setMatrixActive(
      matrixId,
      normalizedActive
    );
  }

  async setBreakActive(id, activo) {
    const breakId =
      DomainService.parsePositiveId(
        id,
        'quiebreId'
      );

    const normalizedActive =
      DomainService.normalizeBoolean(
        activo
      );

    const existing =
      await this.repository.getBreakById(
        breakId
      );

    if (!existing) {
      const error =
        new Error('Quiebre no encontrado');

      error.code = 'NOT_FOUND';
      error.status = 404;

      throw error;
    }

    return this.repository.setBreakActive(
      breakId,
      normalizedActive
    );
  }
}

module.exports = DomainService;
