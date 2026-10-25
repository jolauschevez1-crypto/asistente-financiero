/**
 * @file movimientosQueries.js
 * @description Diccionario centralizado de consultas SQL para la gestión de movimientos financieros, cuentas y categorías.
 */

module.exports = {
    /**
     * Invoca la función almacenada fx_buscar_o_crear_usuario.
     */
    BUSCAR_O_CREAR_USUARIO: `
        SELECT * FROM fx_buscar_o_crear_usuario($1, $2, $3);
    `,

    /**
     * Obtiene un usuario activo por su ID.
     */
    BUSCAR_USUARIO_POR_ID: `
        SELECT id, telegram_id, username, nombre, correo, rol, created_at
        FROM usuarios
        WHERE id = $1 AND deleted_at IS NULL;
    `,

    /**
     * Busca un tipo de movimiento por su nombre (ej. INGRESO, GASTO, TRANSFERENCIA).
     */
    OBTENER_TIPO_MOVIMIENTO_POR_NOMBRE: `
        SELECT id, nombre 
        FROM tipos_movimiento 
        WHERE UPPER(nombre) = $1 
        LIMIT 1;
    `,

    /**
     * Busca una categoría existente (del usuario o global).
     */
    OBTENER_CATEGORIA_POR_NOMBRE: `
        SELECT id, nombre
        FROM categorias
        WHERE TRIM(LOWER(nombre)) = TRIM(LOWER($1))
          AND (usuario_id = $2 OR usuario_id IS NULL)
        ORDER BY usuario_id NULLS FIRST
        LIMIT 1;
    `,

    /**
     * Inserta una nueva categoría personalizada para un usuario.
     */
    CREAR_CATEGORIA: `
        INSERT INTO categorias (nombre, usuario_id)
        VALUES ($1, $2)
        RETURNING id, nombre;
    `,

    /**
     * Busca una cuenta por su nombre para un usuario específico.
     */
    OBTENER_CUENTA_POR_NOMBRE: `
        SELECT id, nombre, saldo_actual
        FROM cuentas
        WHERE TRIM(LOWER(nombre)) = TRIM(LOWER($1))
          AND usuario_id = $2
          AND deleted_at IS NULL
        LIMIT 1;
    `,

    /**
     * Inserta una nueva cuenta para un usuario.
     */
    CREAR_CUENTA: `
        INSERT INTO cuentas (nombre, usuario_id)
        VALUES ($1, $2)
        RETURNING id, nombre, saldo_actual;
    `,

    /**
     * Registra un movimiento financiero.
     */
    INSERTAR_MOVIMIENTO: `
        INSERT INTO movimientos (
            usuario_id,
            tipo_movimiento_id,
            categoria_id,
            cuenta_origen_id,
            cuenta_destino_id,
            monto,
            descripcion,
            metodo_pago
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, usuario_id, monto, descripcion, metodo_pago, fecha;
    `,

    /**
     * Incrementa el saldo de una cuenta.
     */
    INCREMENTAR_SALDO_CUENTA: `
        UPDATE cuentas 
        SET saldo_actual = saldo_actual + $1 
        WHERE id = $2;
    `,

    /**
     * Decrementa el saldo de una cuenta.
     */
    DECREMENTAR_SALDO_CUENTA: `
        UPDATE cuentas 
        SET saldo_actual = saldo_actual - $1 
        WHERE id = $2;
    `,

    /**
     * Genera la consulta SQL para obtener un movimiento para su eliminación.
     * Soporta filtrado opcional por ID de usuario mediante una función constructora.
     * 
     * @param {boolean} conFiltroUsuario Indica si se debe agregar la condición de usuario_id.
     * @returns {string} Consulta SQL resultante.
     */
    OBTENER_MOVIMIENTO_PARA_ELIMINAR: (conFiltroUsuario) => `
        SELECT
            m.id,
            m.monto,
            m.cuenta_origen_id,
            m.cuenta_destino_id,
            tm.nombre AS tipo
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        WHERE m.id = $1
          ${conFiltroUsuario ? 'AND m.usuario_id = $2' : ''}
          AND m.deleted_at IS NULL
        FOR UPDATE;
    `,

    /**
     * Realiza un soft delete en la tabla movimientos.
     */
    SOFT_DELETE_MOVIMIENTO: `
        UPDATE movimientos 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = $1;
    `,

    /**
     * Invoca la función almacenada para listar cuentas de usuario.
     */
    LISTAR_CUENTAS: `
        SELECT * FROM fx_listar_cuentas_usuario($1);
    `,

    /**
     * Consulta una cuenta por nombre y usuario (usada en obtener/crear cuenta).
     */
    OBTENER_CUENTA_DETALLADA: `
        SELECT id, nombre, usuario_id, saldo_actual, created_at
        FROM cuentas
        WHERE LOWER(nombre) = LOWER($1)
          AND usuario_id = $2
        LIMIT 1;
    `,

    /**
     * Inserta una cuenta detallada retornando todos sus campos.
     */
    CREAR_CUENTA_DETALLADA: `
        INSERT INTO cuentas (nombre, usuario_id)
        VALUES ($1, $2)
        RETURNING id, nombre, usuario_id, saldo_actual, created_at;
    `,

    /**
     * Invoca la función para obtener el balance general.
     */
    OBTENER_BALANCE_TOTAL: `
        SELECT moneda, COALESCE(SUM(saldo_actual), 0) AS total
        FROM cuentas WHERE usuario_id = $1 AND deleted_at IS NULL
        GROUP BY moneda ORDER BY moneda;
    `,

    /**
     * Invoca la función para obtener el resumen de hoy.
     */
    OBTENER_RESUMEN_HOY: `
        SELECT t.nombre AS tipo, m.moneda, COALESCE(SUM(m.monto), 0) AS total
        FROM movimientos m JOIN tipos_movimiento t ON t.id = m.tipo_movimiento_id
        WHERE m.usuario_id = $1 AND m.deleted_at IS NULL
          AND (m.fecha AT TIME ZONE 'America/Guayaquil')::date = (NOW() AT TIME ZONE 'America/Guayaquil')::date
        GROUP BY t.nombre, m.moneda ORDER BY m.moneda, t.nombre;
    `,

    /**
     * Invoca la función para obtener el resumen del mes.
     */
    OBTENER_RESUMEN_MES: `
        SELECT t.nombre AS tipo, m.moneda, COALESCE(SUM(m.monto), 0) AS total
        FROM movimientos m JOIN tipos_movimiento t ON t.id = m.tipo_movimiento_id
        WHERE m.usuario_id = $1 AND m.deleted_at IS NULL
          AND date_trunc('month', m.fecha AT TIME ZONE 'America/Guayaquil') = date_trunc('month', NOW() AT TIME ZONE 'America/Guayaquil')
        GROUP BY t.nombre, m.moneda ORDER BY m.moneda, t.nombre;
    `,

    /**
     * Invoca la función para obtener gastos por categoría del mes.
     */
    OBTENER_GASTOS_CATEGORIA_MES: `
        SELECT c.nombre AS categoria, m.moneda, SUM(m.monto) AS total
        FROM movimientos m JOIN tipos_movimiento t ON t.id = m.tipo_movimiento_id
        LEFT JOIN categorias c ON c.id = m.categoria_id
        WHERE m.usuario_id = $1 AND m.deleted_at IS NULL AND t.nombre = 'GASTO'
          AND date_trunc('month', m.fecha AT TIME ZONE 'America/Guayaquil') = date_trunc('month', NOW() AT TIME ZONE 'America/Guayaquil')
        GROUP BY c.nombre, m.moneda ORDER BY 3 DESC;
    `,

    /**
     * Invoca la función almacenada para editar un movimiento.
     */
    EDITAR_MOVIMIENTO: `
        SELECT * FROM fx_editar_movimiento($1, $2, $3, $4, $5, $6, $7, $8);
    `,

    /**
     * Invoca la función para listar el historial de movimientos.
     */
    OBTENER_HISTORIAL: `
        SELECT * FROM fx_listar_historial_movimientos($1);
    `,

    // ==========================================
    // ADMINISTRACIÓN GLOBAL (todos los usuarios)
    // ==========================================

    /**
     * Whitelist de columnas ordenables para el listado global de movimientos (administración).
     */
    COLUMNAS_ORDENABLES_MOVIMIENTOS_GLOBAL: {
        fecha: 'm.fecha',
        monto: 'm.monto',
        usuario: 'u.nombre',
        categoria: 'cat.nombre',
        tipo: 'tm.nombre',
    },

    /**
     * Genera el listado paginado/filtrable/ordenable de TODOS los movimientos (todos los usuarios).
     *
     * @param {object} opts
     * @param {string[]} opts.condiciones Fragmentos SQL ya armados para el WHERE.
     * @param {string} opts.ordenColumna Columna SQL resuelta desde COLUMNAS_ORDENABLES_MOVIMIENTOS_GLOBAL.
     * @param {string} opts.ordenDireccion 'ASC' | 'DESC'.
     * @param {number} opts.indexLimit Índice del parámetro LIMIT.
     * @param {number} opts.indexOffset Índice del parámetro OFFSET.
     */
    GENERAR_LISTADO_PAGINADO_MOVIMIENTOS_GLOBAL: ({ condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset }) => `
        SELECT
            m.id, m.fecha, m.monto, m.descripcion, m.metodo_pago, m.deleted_at,
            tm.nombre AS tipo,
            cat.nombre AS categoria,
            co.nombre AS cuenta_origen,
            cd.nombre AS cuenta_destino,
            m.moneda, m.moneda_destino, m.monto_destino, m.tasa, m.tasa_fecha, u.id AS usuario_id, u.nombre AS usuario_nombre, u.correo AS usuario_correo,
            COUNT(*) OVER() AS total_registros
        FROM movimientos m
        JOIN usuarios u ON m.usuario_id = u.id
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN categorias cat ON m.categoria_id = cat.id
        LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
        LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ORDER BY ${ordenColumna} ${ordenDireccion}, m.id DESC
        LIMIT $${indexLimit} OFFSET $${indexOffset};
    `,

    /**
     * Lista alfabética de todas las categorías existentes (globales y de usuario) para el filtro.
     */
    OBTENER_CATEGORIAS_DISTINCT: `
        SELECT DISTINCT nombre
        FROM categorias
        ORDER BY nombre;
    `,

    /**
     * Obtiene un movimiento completo (con nombres legibles) para "Duplicar" desde administración.
     * Exige deleted_at IS NULL: no se permite duplicar un movimiento ya eliminado.
     */
    OBTENER_MOVIMIENTO_COMPLETO_POR_ID: `
        SELECT
            m.id, m.usuario_id, m.monto, m.descripcion, m.metodo_pago,
            tm.nombre AS tipo,
            cat.nombre AS categoria,
            co.nombre AS cuenta_origen,
            cd.nombre AS cuenta_destino
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN categorias cat ON m.categoria_id = cat.id
        LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
        LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
        WHERE m.id = $1 AND m.deleted_at IS NULL;
    `
};
