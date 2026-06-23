// ======================================================
// db-client.js - Capa de Acceso a Base de Datos
// ======================================================
// 
// 📌 PROPÓSITO: Proveer una capa de abstracción para acceder a la base de datos
// 📌 TECNOLOGÍA: API REST (PostgreSQL) con sintaxis encadenable tipo Supabase
// 📌 MIGRACIÓN: Enruta todas las llamadas a la API local PostgreSQL
// 📌 COMPATIBILIDAD: Permite que supervisor.js y auditor.js funcionen sin modificaciones
// ======================================================

console.log('[DB-Client] Capa de acceso a datos cargada - usando API local');

// ======================================================
// 1. CLASE: DBQueryBuilder
// ======================================================
// 📌 PROPÓSITO: Construir consultas SQL de forma encadenable
// 📌 PATRÓN: Builder (similar a Supabase/Knex)
// 📌 CARACTERÍSTICAS: 
//    - Sintaxis: db.from('tabla').select().eq().order().limit()
//    - Thenable: Funciona con await (implementa .then/.catch)
//    - Filtros: eq, neq, gt, gte, lt, lte, like, ilike, in, is, contains
//    - Modificadores: order, limit, single, maybeSingle
// ======================================================

class DBQueryBuilder {
    constructor(table) {
        // 🔴 CONFIGURACIÓN DE LA CONSULTA
        this._table = table;                    // Tabla a consultar
        this._operation = null;                 // 'select', 'insert', 'update', 'delete', 'upsert'
        this._selectFields = '*';               // Campos a seleccionar
        this._filters = [];                     // Array de filtros (WHERE)
        this._insertData = null;                // Datos para INSERT
        this._updateData = null;                // Datos para UPDATE
        this._orderBy = null;                   // Campo de ordenamiento
        this._orderAscending = true;            // Orden ascendente (true) o descendente (false)
        this._limitValue = null;                // Límite de registros
        this._isSingle = false;                 // Esperar un solo registro
        this._isMaybeSingle = false;            // Esperar cero o un registro
        this._isHead = false;                   // Solo conteo (sin datos)
        this._countOption = null;               // 'exact', 'planned', 'estimated'
        this._selectOptions = {};
    }

    // ======================================================
    // 1a. MÉTODOS DE OPERACIÓN
    // ======================================================

    /**
     * select - Especifica los campos a seleccionar
     * @param {string} fields - Campos separados por coma (ej: 'id, nombre')
     * @param {Object} options - Opciones (count, head)
     * @returns {DBQueryBuilder} - Instancia para encadenar
     * @uso: db.from('usuarios').select('id, nombre')
     */
    select(fields, options) {
        this._operation = 'select';
        if (typeof fields === 'string') {
            this._selectFields = fields;
        }
        if (options && typeof options === 'object') {
            this._selectOptions = options;
            if (options.count) {
                this._countOption = options.count;
            }
            if (options.head === true) {
                this._isHead = true;
            }
        }
        return this;
    }

    /**
     * insert - Inserta un nuevo registro
     * @param {Object} data - Datos a insertar
     * @returns {DBQueryBuilder}
     * @uso: db.from('usuarios').insert({ nombre: 'Juan' })
     */
    insert(data) {
        this._operation = 'insert';
        this._insertData = data;
        return this;
    }

    /**
     * update - Actualiza registros existentes
     * @param {Object} data - Datos a actualizar
     * @returns {DBQueryBuilder}
     * @uso: db.from('usuarios').update({ activo: false }).eq('id', 1)
     */
    update(data) {
        this._operation = 'update';
        this._updateData = data;
        return this;
    }

    /**
     * delete - Elimina registros
     * @returns {DBQueryBuilder}
     * @uso: db.from('usuarios').delete().eq('id', 1)
     */
    delete() {
        this._operation = 'delete';
        return this;
    }

    /**
     * upsert - Inserta o actualiza (conflicto)
     * @param {Object} data - Datos a insertar o actualizar
     * @returns {DBQueryBuilder}
     * @uso: db.from('usuarios').upsert({ id: 1, nombre: 'Juan' })
     */
    upsert(data) {
        this._operation = 'upsert';
        this._insertData = data;
        return this;
    }

    // ======================================================
    // 1b. FILTROS (WHERE)
    // ======================================================

    /**
     * eq - Igual a (WHERE columna = valor)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     */
    eq(column, value) {
        this._filters.push({ type: 'eq', column, value });
        return this;
    }

    /**
     * neq - Diferente de (WHERE columna != valor)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     */
    neq(column, value) {
        this._filters.push({ type: 'neq', column, value });
        return this;
    }

    /**
     * gt - Mayor que (WHERE columna > valor)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     */
    gt(column, value) {
        this._filters.push({ type: 'gt', column, value });
        return this;
    }

    /**
     * gte - Mayor o igual que (WHERE columna >= valor)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     */
    gte(column, value) {
        this._filters.push({ type: 'gte', column, value });
        return this;
    }

    /**
     * lt - Menor que (WHERE columna < valor)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     */
    lt(column, value) {
        this._filters.push({ type: 'lt', column, value });
        return this;
    }

    /**
     * lte - Menor o igual que (WHERE columna <= valor)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     */
    lte(column, value) {
        this._filters.push({ type: 'lte', column, value });
        return this;
    }

    /**
     * like - Coincidencia parcial (WHERE columna LIKE '%valor%')
     * @param {string} column - Nombre de la columna
     * @param {string} value - Patrón a buscar
     * @returns {DBQueryBuilder}
     */
    like(column, value) {
        this._filters.push({ type: 'like', column, value });
        return this;
    }

    /**
     * ilike - Coincidencia parcial SIN DISTINGUIR MAYÚSCULAS
     * @param {string} column - Nombre de la columna
     * @param {string} value - Patrón a buscar
     * @returns {DBQueryBuilder}
     */
    ilike(column, value) {
        this._filters.push({ type: 'ilike', column, value });
        return this;
    }

    /**
     * in - Valor en lista (WHERE columna IN (valores))
     * @param {string} column - Nombre de la columna
     * @param {Array} values - Lista de valores
     * @returns {DBQueryBuilder}
     */
    in(column, values) {
        this._filters.push({ type: 'in', column, values: Array.isArray(values) ? values : [values] });
        return this;
    }

    /**
     * is - Comparación con NULL (WHERE columna IS NULL)
     * @param {string} column - Nombre de la columna
     * @param {*} value - null o 'null'
     * @returns {DBQueryBuilder}
     */
    is(column, value) {
        this._filters.push({ type: 'is', column, value });
        return this;
    }

    /**
     * contains - Contiene (para arrays/json)
     * @param {string} column - Nombre de la columna
     * @param {*} value - Valor a verificar
     * @returns {DBQueryBuilder}
     */
    contains(column, value) {
        this._filters.push({ type: 'contains', column, value });
        return this;
    }

    // ======================================================
    // 🔴 NUEVO MÉTODO: not
    // ======================================================
    /**
     * not - Negación de una condición (NOT)
     * @param {string} column - Nombre de la columna
     * @param {string} operator - Operador (eq, is, like, etc.)
     * @param {*} value - Valor a comparar
     * @returns {DBQueryBuilder}
     * @uso: .not('motivo_incidencia', 'is', null)
     *       .not('estado', 'eq', 'inactivo')
     *       .not('nombre', 'like', '%admin%')
     */
    not(column, operator, value) {
        this._filters.push({ type: 'not', column, operator, value });
        return this;
    }

    // ======================================================
    // 1c. MODIFICADORES
    // ======================================================

    /**
     * order - Ordena los resultados
     * @param {string} column - Columna por la cual ordenar
     * @param {Object} options - { ascending: true/false }
     * @returns {DBQueryBuilder}
     */
    order(column, options = {}) {
        this._orderBy = column;
        this._orderAscending = options.ascending !== false;
        return this;
    }

    /**
     * limit - Limita el número de resultados
     * @param {number} count - Número máximo de registros
     * @returns {DBQueryBuilder}
     */
    limit(count) {
        this._limitValue = count;
        return this;
    }

    /**
     * single - Espera exactamente un registro
     * @returns {DBQueryBuilder}
     * @throws Si no hay registros o hay más de uno
     */
    single() {
        this._isSingle = true;
        return this;
    }

    /**
     * maybeSingle - Espera cero o un registro
     * @returns {DBQueryBuilder}
     * @returns null si no hay registros
     */
    maybeSingle() {
        this._isMaybeSingle = true;
        return this;
    }

    // ======================================================
    // 1d. MÉTODO THENABLE (para usar con await)
    // ======================================================

    /**
     * then - Permite usar await en el builder
     * @param {Function} resolve - Función de éxito
     * @param {Function} reject - Función de error
     * @returns {Promise}
     * @uso: const result = await db.from('tabla').select()
     */
    then(resolve, reject) {
        this._execute()
            .then(result => resolve(result))
            .catch(error => reject(error));
    }

    /**
     * catch - Manejo de errores
     * @param {Function} reject - Función de error
     * @returns {Promise}
     */
    catch(reject) {
        this._execute().catch(reject);
    }

    // ======================================================
    // 1e. EJECUCIÓN REAL DE LA CONSULTA
    // ======================================================

    /**
     * _execute - Ejecuta la consulta en la API
     * @returns {Promise<Object>} { data, error, count }
     * @private
     */
    async _execute() {
        // Construir payload para la API
        const payload = {
            table: this._table,
            operation: this._operation,
            selectFields: this._selectFields,
            filters: this._filters,
            data: this._insertData || this._updateData,
            orderBy: this._orderBy,
            orderAscending: this._orderAscending,
            limit: this._limitValue,
            isSingle: this._isSingle,
            isMaybeSingle: this._isMaybeSingle,
            isHead: this._isHead,
            countOption: this._countOption
        };

        try {
            // ======================================================
            // ENVIAR CONSULTA A LA API
            // ======================================================
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[DB-Client] Error en consulta:', errorData);
                return { 
                    data: null, 
                    error: { 
                        message: errorData.error || `Error HTTP ${response.status}`, 
                        code: String(response.status) 
                    } 
                };
            }

            const result = await response.json();

            // Manejar errores de la API
            if (result.error) {
                return { 
                    data: null, 
                    error: { 
                        message: result.error, 
                        code: result.code || 'ERROR', 
                        details: result.details || '', 
                        hint: result.hint || '' 
                    } 
                };
            }

            // ======================================================
            // FORMATEAR RESPUESTA (compatible con Supabase)
            // ======================================================
            let data = result.data;

            // Si es single: devolver un solo objeto o error
            if (this._isSingle) {
                if (!data || data.length === 0) {
                    return { 
                        data: null, 
                        error: { 
                            message: 'No rows found', 
                            code: 'PGRST116', 
                            details: 'Results contain 0 rows, but single row was expected' 
                        } 
                    };
                }
                if (data.length > 1) {
                    return { 
                        data: null, 
                        error: { 
                            message: 'Multiple rows found', 
                            code: 'PGRST116', 
                            details: 'Results contain multiple rows, but single row was expected' 
                        } 
                    };
                }
                data = data[0];
            }

            // Si es maybeSingle: devolver un objeto o null
            if (this._isMaybeSingle) {
                if (!data || data.length === 0) {
                    data = null;
                } else {
                    data = data[0];
                }
            }

            // Si es head: solo devolver conteo
            if (this._isHead) {
                return { data: null, error: null, count: result.count || 0 };
            }

            return { data: data, error: null, count: result.count };

        } catch (error) {
            console.error('[DB-Client] Error de red:', error);
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Error de conexion', 
                    code: 'NETWORK_ERROR' 
                } 
            };
        }
    }
}

// ======================================================
// 2. CLASE: DBClient
// ======================================================
// 📌 PROPÓSITO: Cliente principal de acceso a base de datos
// 📌 USO: const db = new DBClient(); const result = await db.from('tabla').select()
// ======================================================

class DBClient {
    /**
     * from - Inicia una consulta en una tabla
     * @param {string} table - Nombre de la tabla
     * @returns {DBQueryBuilder}
     * @uso: db.from('usuarios').select()
     */
    from(table) {
        return new DBQueryBuilder(table);
    }

    /**
     * rpc - Ejecuta una función RPC en la base de datos
     * @param {string} functionName - Nombre de la función
     * @param {Object} params - Parámetros de la función
     * @returns {Promise<Object>} { data, error }
     * @uso: db.rpc('cerrar_mes', { p_anio: 2026, p_mes: 6 })
     */
    async rpc(functionName, params = {}) {
        try {
            const response = await fetch(`/api/rpc/${functionName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { 
                    data: null, 
                    error: { 
                        message: errorData.error || `Error HTTP ${response.status}`, 
                        code: String(response.status) 
                    } 
                };
            }

            const result = await response.json();

            if (result.error) {
                return { 
                    data: null, 
                    error: { 
                        message: result.error, 
                        code: result.code || 'ERROR' 
                    } 
                };
            }

            return { data: result.data, error: null };

        } catch (error) {
            console.error('[DB-Client] Error en RPC:', error);
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Error de conexion', 
                    code: 'NETWORK_ERROR' 
                } 
            };
        }
    }
}

// ======================================================
// 3. FUNCIÓN GLOBAL: getDB()
// ======================================================
// 📌 PROPÓSITO: Devuelve una instancia de DBClient
// 📌 COMPATIBILIDAD: Mantiene compatibilidad con código existente
// 📌 USO: const db = getDB(); 
// ======================================================

function getDB() {
    return new DBClient();
}

// ======================================================
// 4. EXPOSICIÓN GLOBAL
// ======================================================
// 📌 Hacer disponible para toda la aplicación
// ======================================================

if (typeof window !== 'undefined') {
    window.getDB = getDB;
}

console.log('[DB-Client] getDB() disponible - redirigiendo a API local PostgreSQL');