class GenericQueryRepository {
  constructor(db) {
    this.db = db;
  }

  static sanitizeIdentifier(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_]/g, '');
  }

  static sanitizeSelectFields(value) {
    if (!value || value === '*') {
      return '*';
    }

    return String(value).replace(
      /[^a-zA-Z0-9_,.*\s()]/g,
      ''
    );
  }

  static applySelectFilters({
    sql,
    params,
    idx,
    filters
  }) {
    for (const f of (filters || [])) {
      const col =
        GenericQueryRepository.sanitizeIdentifier(
          f.column
        );

      if (!col) continue;

      switch (f.type) {
        case 'eq':
          sql += ` AND ${col} = $${idx++}`;
          params.push(f.value);
          break;

        case 'neq':
          sql += ` AND ${col} != $${idx++}`;
          params.push(f.value);
          break;

        case 'gt':
          sql += ` AND ${col} > $${idx++}`;
          params.push(f.value);
          break;

        case 'gte':
          sql += ` AND ${col} >= $${idx++}`;
          params.push(f.value);
          break;

        case 'lt':
          sql += ` AND ${col} < $${idx++}`;
          params.push(f.value);
          break;

        case 'lte':
          sql += ` AND ${col} <= $${idx++}`;
          params.push(f.value);
          break;

        case 'like':
          sql += ` AND ${col} LIKE $${idx++}`;
          params.push(f.value);
          break;

        case 'ilike':
          sql += ` AND ${col} ILIKE $${idx++}`;
          params.push(f.value);
          break;

        case 'in':
          if (f.values && f.values.length > 0) {
            const placeholders =
              f.values
                .map(() => `$${idx++}`)
                .join(', ');

            sql +=
              ` AND ${col} IN (${placeholders})`;

            params.push(...f.values);
          }
          break;

        case 'is':
          if (f.value === null) {
            sql += ` AND ${col} IS NULL`;
          } else {
            sql += ` AND ${col} IS $${idx++}`;
            params.push(f.value);
          }
          break;

        case 'not':
          if (
            f.operator === 'is' &&
            (
              f.value === null ||
              f.value === 'null'
            )
          ) {
            sql += ` AND ${col} IS NOT NULL`;
          } else if (
            f.operator === 'in'
          ) {
            if (
              f.values &&
              f.values.length > 0
            ) {
              const placeholders =
                f.values
                  .map(() => `$${idx++}`)
                  .join(', ');

              sql +=
                ` AND ${col} NOT IN (${placeholders})`;

              params.push(...f.values);
            }
          } else {
            sql += ` AND ${col} != $${idx++}`;
            params.push(f.value);
          }
          break;

        case 'contains':
          sql += ` AND ${col} @> $${idx++}`;
          params.push(
            JSON.stringify(f.value)
          );
          break;
      }
    }

    return { sql, params, idx };
  }

  static applyMutationFilters({
    sql,
    params,
    idx,
    filters
  }) {
    for (const f of (filters || [])) {
      const col =
        GenericQueryRepository.sanitizeIdentifier(
          f.column
        );

      if (!col) continue;

      switch (f.type) {
        case 'eq':
          sql += ` AND ${col} = $${idx++}`;
          params.push(f.value);
          break;

        case 'neq':
          sql += ` AND ${col} != $${idx++}`;
          params.push(f.value);
          break;

        case 'in':
          if (
            f.values &&
            f.values.length > 0
          ) {
            const placeholders =
              f.values
                .map(() => `$${idx++}`)
                .join(', ');

            sql +=
              ` AND ${col} IN (${placeholders})`;

            params.push(...f.values);
          }
          break;

        default:
          sql += ` AND ${col} = $${idx++}`;
          params.push(f.value);
          break;
      }
    }

    return { sql, params, idx };
  }

  async select({
    table,
    selectFields,
    filters,
    orderBy,
    orderAscending,
    limit,
    isHead,
    countOption
  }) {
    const tableName =
      GenericQueryRepository.sanitizeIdentifier(
        table
      );

    const fields =
      GenericQueryRepository.sanitizeSelectFields(
        selectFields
      );

    let sql =
      `SELECT ${fields} FROM ${tableName} WHERE 1=1`;

    let params = [];
    let idx = 1;

    ({
      sql,
      params,
      idx
    } = GenericQueryRepository.applySelectFilters({
      sql,
      params,
      idx,
      filters
    }));

    if (orderBy) {
      const orderCol =
        GenericQueryRepository.sanitizeIdentifier(
          orderBy
        );

      const direction =
        orderAscending !== false
          ? 'ASC'
          : 'DESC';

      sql +=
        ` ORDER BY ${orderCol} ${direction}`;
    }

    if (limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(parseInt(limit));
    }

    if (isHead && countOption) {
      const countSql =
        sql.replace(
          /^SELECT .+ FROM/,
          'SELECT COUNT(*) as count FROM'
        );

      const result =
        await this.db.query(
          countSql,
          params
        );

      return {
        data: [],
        count: parseInt(
          result.rows[0]?.count || 0
        )
      };
    }

    const result =
      await this.db.query(
        sql,
        params
      );

    return {
      data: result.rows,
      count: result.rowCount
    };
  }

  async insert({
    table,
    data
  }) {
    const tableName =
      GenericQueryRepository.sanitizeIdentifier(
        table
      );

    const dataArray =
      Array.isArray(data)
        ? data
        : [data];

    const results = [];

    for (const item of dataArray) {
      let idx = 1;

      const keys =
        Object.keys(item);

      const values =
        Object.values(item);

      const colNames =
        keys
          .map(
            GenericQueryRepository
              .sanitizeIdentifier
          )
          .join(', ');

      const placeholders =
        keys
          .map(() => `$${idx++}`)
          .join(', ');

      const insertResult =
        await this.db.query(
          `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders}) RETURNING *`,
          values
        );

      results.push(
        ...insertResult.rows
      );
    }

    return {
      data: results,
      count: results.length
    };
  }

  async update({
    table,
    data,
    filters
  }) {
    if (!filters || filters.length === 0) {
      const error = new Error(
        'UPDATE requiere al menos un filtro'
      );
      error.status = 400;
      throw error;
    }

    const tableName =
      GenericQueryRepository.sanitizeIdentifier(
        table
      );

    const keys =
      Object.keys(data);

    const values =
      Object.values(data);

    let idx = 1;

    const setClause =
      keys
        .map(
          k =>
            `${GenericQueryRepository.sanitizeIdentifier(k)} = $${idx++}`
        )
        .join(', ');

    let params = [...values];

    let sql =
      `UPDATE ${tableName} SET ${setClause} WHERE 1=1`;

    ({
      sql,
      params,
      idx
    } = GenericQueryRepository.applyMutationFilters({
      sql,
      params,
      idx,
      filters
    }));

    sql += ' RETURNING *';

    const result =
      await this.db.query(
        sql,
        params
      );

    return {
      data: result.rows,
      count: result.rowCount
    };
  }

  async delete({
    table,
    filters
  }) {
    if (!filters || filters.length === 0) {
      const error = new Error(
        'DELETE requiere al menos un filtro'
      );
      error.status = 400;
      throw error;
    }

    const tableName =
      GenericQueryRepository.sanitizeIdentifier(
        table
      );

    let sql =
      `DELETE FROM ${tableName} WHERE 1=1`;

    let params = [];
    let idx = 1;

    ({
      sql,
      params,
      idx
    } = GenericQueryRepository.applyMutationFilters({
      sql,
      params,
      idx,
      filters
    }));

    sql += ' RETURNING *';

    const result =
      await this.db.query(
        sql,
        params
      );

    return {
      data: result.rows,
      count: result.rowCount
    };
  }

  async upsert({
    table,
    data,
    filters
  }) {
    const tableName =
      GenericQueryRepository.sanitizeIdentifier(
        table
      );

    const dataArray =
      Array.isArray(data)
        ? data
        : [data];

    for (const item of dataArray) {
      let idx = 1;

      const keys =
        Object.keys(item);

      const values =
        Object.values(item);

      const colNames =
        keys
          .map(
            GenericQueryRepository
              .sanitizeIdentifier
          )
          .join(', ');

      const placeholders =
        keys
          .map(() => `$${idx++}`)
          .join(', ');

      try {
        await this.db.query(
          `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
          values
        );
      } catch (insertErr) {
        if (
          insertErr.code === '23505' &&
          filters &&
          filters.length > 0
        ) {
          let updateSql =
            `UPDATE ${tableName} SET `;

          let updateParams = [];
          let updateIdx = 1;

          const setClause =
            keys
              .map(
                k =>
                  `${GenericQueryRepository.sanitizeIdentifier(k)} = $${updateIdx++}`
              )
              .join(', ');

          updateParams = [...values];
          updateSql +=
            setClause + ' WHERE 1=1';

          for (const f of filters) {
            const col =
              GenericQueryRepository.sanitizeIdentifier(
                f.column
              );

            if (!col) continue;

            updateSql +=
              ` AND ${col} = $${updateIdx++}`;

            updateParams.push(
              f.value
            );
          }

          await this.db.query(
            updateSql,
            updateParams
          );
        } else {
          throw insertErr;
        }
      }
    }

    return {
      data: [],
      count: dataArray.length
    };
  }
}

module.exports = GenericQueryRepository;
