/**
 * @file adminQueries.js
 * @description Diccionario centralizado de consultas SQL para el módulo de administración.
 */

module.exports = {
    /**
     * Obtiene el conteo total de usuarios activos (no eliminados lógicamente).
     */
    OBTENER_TOTAL_USUARIOS: `
        SELECT COUNT(*) AS total_usuarios 
        FROM usuarios 
        WHERE deleted_at IS NULL
    `,

    /**
     * Obtiene el conteo total de movimientos activos (no eliminados lógicamente).
     */
    OBTENER_TOTAL_MOVIMIENTOS: `
        SELECT COUNT(*) AS total_movimientos
        FROM movimientos
        WHERE deleted_at IS NULL
    `,

    // ==========================================
    // MÉTRICAS PARA EL DASHBOARD ADMINISTRATIVO (nuevas, aditivas)
    // ==========================================

    /**
     * Suma el saldo actual de TODAS las cuentas (patrimonio total gestionado, activos o no).
     */
    OBTENER_BALANCE_GLOBAL: `
        SELECT COALESCE(SUM(saldo_actual), 0) AS balance_global
        FROM cuentas
    `,

    /**
     * Suma el saldo actual de las cuentas de usuarios activos (no deshabilitados).
     */
    OBTENER_BALANCE_DISPONIBLE: `
        SELECT COALESCE(SUM(c.saldo_actual), 0) AS balance_disponible
        FROM cuentas c
        JOIN usuarios u ON c.usuario_id = u.id
        WHERE u.deleted_at IS NULL
    `,

    /**
     * Ingresos y gastos globales del mes actual vs. el mes anterior (para variaciones %).
     */
    OBTENER_FLUJO_MENSUAL: `
        SELECT
            tm.nombre AS tipo,
            SUM(CASE WHEN date_trunc('month', m.fecha) = date_trunc('month', CURRENT_DATE) THEN m.monto ELSE 0 END) AS monto_actual,
            SUM(CASE WHEN date_trunc('month', m.fecha) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN m.monto ELSE 0 END) AS monto_anterior
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        WHERE m.deleted_at IS NULL
          AND m.fecha >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        GROUP BY tm.nombre
    `,

    /**
     * Conteo total de usuarios registrados (activos o deshabilitados).
     */
    OBTENER_TOTAL_USUARIOS_REGISTRADOS: `
        SELECT COUNT(*) AS total_usuarios_registrados FROM usuarios
    `,

    /**
     * Nuevos usuarios registrados este mes vs. el mes anterior.
     */
    OBTENER_USUARIOS_NUEVOS_MENSUAL: `
        SELECT
            COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)) AS nuevos_mes_actual,
            COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) AS nuevos_mes_anterior
        FROM usuarios
    `,

    /**
     * Cantidad de movimientos este mes vs. el mes anterior.
     */
    OBTENER_MOVIMIENTOS_MENSUAL: `
        SELECT
            COUNT(*) FILTER (WHERE date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE)) AS movimientos_mes_actual,
            COUNT(*) FILTER (WHERE date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) AS movimientos_mes_anterior
        FROM movimientos
        WHERE deleted_at IS NULL
    `,

    /**
     * Últimos movimientos globales (todos los usuarios), con datos legibles para la tabla de actividad.
     */
    OBTENER_ULTIMOS_MOVIMIENTOS: `
        SELECT
            m.id, m.monto, m.fecha, m.descripcion,
            tm.nombre AS tipo,
            cat.nombre AS categoria,
            co.nombre AS cuenta_origen,
            cd.nombre AS cuenta_destino,
            u.id AS usuario_id, u.nombre AS usuario_nombre, u.correo AS usuario_correo
        FROM movimientos m
        JOIN usuarios u ON m.usuario_id = u.id
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        LEFT JOIN categorias cat ON m.categoria_id = cat.id
        LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
        LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
        WHERE m.deleted_at IS NULL
        ORDER BY m.fecha DESC
        LIMIT 10
    `,

    /**
     * Últimos usuarios registrados.
     */
    OBTENER_ULTIMOS_USUARIOS: `
        SELECT id, nombre, correo, rol, created_at, deleted_at
        FROM usuarios
        ORDER BY created_at DESC
        LIMIT 5
    `,

    /**
     * Últimos inicios de sesión registrados (requiere columna usuarios.ultimo_login).
     */
    OBTENER_ULTIMOS_LOGINS: `
        SELECT id, nombre, correo, ultimo_login
        FROM usuarios
        WHERE ultimo_login IS NOT NULL
        ORDER BY ultimo_login DESC
        LIMIT 8
    `,

    /**
     * Tendencia de ingresos/gastos globales de los últimos 6 meses (para gráficos).
     */
    OBTENER_BALANCE_MENSUAL: `
        SELECT
            date_trunc('month', m.fecha)::date AS mes,
            SUM(CASE WHEN tm.nombre = 'INGRESO' THEN m.monto ELSE 0 END) AS ingresos,
            SUM(CASE WHEN tm.nombre = 'GASTO' THEN m.monto ELSE 0 END) AS gastos
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        WHERE m.deleted_at IS NULL
          AND m.fecha >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY mes
        ORDER BY mes ASC
    `,

    /**
     * Cantidad y monto de movimientos por día de los últimos 30 días (global).
     */
    OBTENER_MOVIMIENTOS_POR_DIA: `
        SELECT
            date_trunc('day', fecha)::date AS dia,
            COUNT(*) AS cantidad,
            COALESCE(SUM(monto), 0) AS monto_total
        FROM movimientos
        WHERE deleted_at IS NULL
          AND fecha >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY dia
        ORDER BY dia ASC
    `,

    /**
     * Categorías más utilizadas globalmente en los últimos 30 días (misma ventana móvil
     * que OBTENER_MOVIMIENTOS_POR_DIA, para no depender del corte de mes calendario).
     */
    OBTENER_CATEGORIAS_MAS_USADAS: `
        SELECT
            COALESCE(cat.nombre, 'Sin categoria') AS categoria,
            COUNT(*) AS cantidad,
            COALESCE(SUM(m.monto), 0) AS monto_total
        FROM movimientos m
        LEFT JOIN categorias cat ON m.categoria_id = cat.id
        WHERE m.deleted_at IS NULL
          AND m.fecha >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY cat.nombre
        ORDER BY cantidad DESC
        LIMIT 8
    `,

    /**
     * Usuarios con mayor volumen de movimientos en los últimos 30 días.
     */
    OBTENER_TOP_USUARIOS: `
        SELECT
            u.id, u.nombre, u.correo,
            COUNT(m.id) AS cantidad_movimientos,
            COALESCE(SUM(m.monto), 0) AS monto_total
        FROM usuarios u
        JOIN movimientos m ON m.usuario_id = u.id
        WHERE m.deleted_at IS NULL AND u.deleted_at IS NULL
          AND m.fecha >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY u.id, u.nombre, u.correo
        ORDER BY cantidad_movimientos DESC
        LIMIT 8
    `,

    // ==========================================
    // MÓDULO DE REPORTES (nuevas, aditivas, parametrizadas por rango arbitrario)
    // ==========================================

    /**
     * Serie mensual de ingresos/gastos globales para un año arbitrario ($1).
     * Cubre los reportes: ingresos mensuales, gastos mensuales, balance mensual.
     */
    OBTENER_SERIE_MENSUAL_POR_ANIO: `
        SELECT
            date_trunc('month', m.fecha)::date AS mes,
            SUM(CASE WHEN tm.nombre = 'INGRESO' THEN m.monto ELSE 0 END) AS ingresos,
            SUM(CASE WHEN tm.nombre = 'GASTO' THEN m.monto ELSE 0 END) AS gastos
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        WHERE m.deleted_at IS NULL
          AND EXTRACT(YEAR FROM m.fecha) = $1
        GROUP BY mes
        ORDER BY mes ASC
    `,

    /**
     * Serie anual de ingresos/gastos globales para un rango de años ($1 a $2).
     * Cubre el reporte: balance anual.
     */
    OBTENER_SERIE_ANUAL: `
        SELECT
            EXTRACT(YEAR FROM m.fecha)::int AS anio,
            SUM(CASE WHEN tm.nombre = 'INGRESO' THEN m.monto ELSE 0 END) AS ingresos,
            SUM(CASE WHEN tm.nombre = 'GASTO' THEN m.monto ELSE 0 END) AS gastos
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        WHERE m.deleted_at IS NULL
          AND EXTRACT(YEAR FROM m.fecha) BETWEEN $1 AND $2
        GROUP BY anio
        ORDER BY anio ASC
    `,

    /**
     * Usuarios con mayor volumen de movimientos en un rango de fechas arbitrario ($1 a $2), top $3.
     * Versión parametrizada de OBTENER_TOP_USUARIOS.
     */
    OBTENER_TOP_USUARIOS_RANGO: `
        SELECT
            u.id, u.nombre, u.correo,
            COUNT(m.id) AS cantidad_movimientos,
            COALESCE(SUM(m.monto), 0) AS monto_total
        FROM usuarios u
        JOIN movimientos m ON m.usuario_id = u.id
        WHERE m.deleted_at IS NULL AND u.deleted_at IS NULL
          AND m.fecha >= $1 AND m.fecha < $2
        GROUP BY u.id, u.nombre, u.correo
        ORDER BY cantidad_movimientos DESC
        LIMIT $3
    `,

    /**
     * Categorías más utilizadas en un rango de fechas arbitrario ($1 a $2), top $3.
     * Versión parametrizada de OBTENER_CATEGORIAS_MAS_USADAS.
     */
    OBTENER_CATEGORIAS_RANGO: `
        SELECT
            COALESCE(cat.nombre, 'Sin categoria') AS categoria,
            COUNT(*) AS cantidad,
            COALESCE(SUM(m.monto), 0) AS monto_total
        FROM movimientos m
        LEFT JOIN categorias cat ON m.categoria_id = cat.id
        WHERE m.deleted_at IS NULL
          AND m.fecha >= $1 AND m.fecha < $2
        GROUP BY cat.nombre
        ORDER BY cantidad DESC
        LIMIT $3
    `,

    /**
     * Resumen agregado (ingresos, gastos, cantidad de movimientos) de un rango de fechas
     * arbitrario ($1 a $2). Usado dos veces (periodo actual/anterior) para comparativas.
     */
    OBTENER_RESUMEN_RANGO: `
        SELECT
            SUM(CASE WHEN tm.nombre = 'INGRESO' THEN m.monto ELSE 0 END) AS ingresos,
            SUM(CASE WHEN tm.nombre = 'GASTO' THEN m.monto ELSE 0 END) AS gastos,
            COUNT(*) AS cantidad_movimientos
        FROM movimientos m
        JOIN tipos_movimiento tm ON m.tipo_movimiento_id = tm.id
        WHERE m.deleted_at IS NULL
          AND m.fecha >= $1 AND m.fecha < $2
    `
};
