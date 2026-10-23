/**
 * @file usuariosQueries.js
 * @description Diccionario centralizado de consultas SQL para el módulo de usuarios (autenticación, registro, perfil, administración).
 */

module.exports = {
    /**
     * Invoca la función almacenada fx_buscar_por_correo.
     */
    BUSCAR_POR_CORREO: `
        SELECT * FROM fx_buscar_por_correo($1);
    `,

    /**
     * Busca un usuario activo por su google_id.
     */
    BUSCAR_POR_GOOGLE_ID: `
        SELECT * FROM usuarios WHERE google_id = $1 AND deleted_at IS NULL;
    `,

    /**
     * Vincula el google_id a un usuario existente.
     */
    VINCULAR_GOOGLE_ID: `
        UPDATE usuarios SET google_id = $1 WHERE id = $2 RETURNING *;
    `,

    /**
     * Registra un usuario nuevo mediante Google Sign-In.
     */
    REGISTRO_GOOGLE: `
        INSERT INTO usuarios (nombre, correo, google_id, rol)
        VALUES ($1, $2, $3, 'USUARIO')
        RETURNING id, nombre, correo, moneda, rol, created_at;
    `,

    /**
     * Invoca la función almacenada fx_registro_completo.
     */
    REGISTRO_COMPLETO: `
        SELECT * FROM fx_registro_completo($1, $2, $3);
    `,

    /**
     * Invoca la función almacenada fx_vincular_cuenta_web.
     */
    VINCULAR_CUENTA_WEB: `
        SELECT * FROM fx_vincular_cuenta_web($1, $2, $3);
    `,

    /**
     * Guarda el hash del código de recuperación y su expiración.
     */
    GUARDAR_CODIGO_RECUPERACION: `
        UPDATE usuarios 
        SET codigo_recuperacion = $1, codigo_expiracion = $2 
        WHERE correo = $3;
    `,

    /**
     * Obtiene los códigos temporales y verificación del usuario.
     */
    OBTENER_DATOS_RECUPERACION: `
        SELECT codigo_recuperacion, codigo_expiracion, codigo_verificacion 
        FROM usuarios 
        WHERE correo = $1;
    `,

    /**
     * Marca el código de recuperación como verificado.
     */
    MARCAR_CODIGO_VERIFICADO: `
        UPDATE usuarios 
        SET codigo_verificacion = true 
        WHERE correo = $1;
    `,

    /**
     * Actualiza la contraseña y limpia los campos del proceso de recuperación.
     */
    ACTUALIZAR_PASSWORD_Y_LIMPIAR: `
        UPDATE usuarios
        SET password = $1,
            codigo_recuperacion = NULL,
            codigo_expiracion = NULL,
            codigo_verificacion = false
        WHERE correo = $2;
    `,

    /**
     * Obtiene una lista de todos los usuarios activos ordenados por ID.
     */
    OBTENER_TODOS_LOS_USUARIOS: `
        SELECT id, nombre, correo, moneda, rol, telegram_id, deleted_at 
        FROM usuarios 
        WHERE deleted_at IS NULL 
        ORDER BY id ASC;
    `,

    /**
     * Obtiene un usuario activo por su ID.
     */
    OBTENER_USUARIO_POR_ID: `
        SELECT id, nombre, correo, moneda, rol, google_id, foto_url, fecha_nacimiento, token_version, password AS password_hash, 
               TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at, 
               TO_CHAR(ultimo_login, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ultimo_login, 
               telegram_id, deleted_at 
        FROM usuarios 
        WHERE id = $1 AND deleted_at IS NULL;
    `,

    /**
     * Obtiene un usuario por su ID sin importar si está marcado como eliminado.
     */
    OBTENER_USUARIO_POR_ID_ADMIN: `
        SELECT id, nombre, correo, moneda, rol, telegram_id, deleted_at 
        FROM usuarios 
        WHERE id = $1;
    `,

    /**
     * Busca usuarios por correo para administración limitando a 50 registros.
     */
    BUSCAR_USUARIOS_POR_CORREO_ADMIN: `
        SELECT id, nombre, correo, moneda, rol, telegram_id, deleted_at
        FROM usuarios
        WHERE correo ILIKE $1
        ORDER BY deleted_at IS NULL DESC, id ASC
        LIMIT 50;
    `,

    /**
     * Genera la consulta dinámica para actualizar los datos de un usuario en administración.
     *
     * @param {string[]} campos Array con los fragmentos de asignaciones (ej. ["nombre = $1", "correo = $2"]).
     * @param {number} indexId Índice numérico que ocupará el parámetro del ID (ej. 3).
     * @returns {string} Consulta SQL generada.
     */
    GENERAR_ACTUALIZACION_ADMIN: (campos, indexId) => `
        UPDATE usuarios
        SET ${campos.join(', ')}
        WHERE id = $${indexId} AND deleted_at IS NULL
        RETURNING id, nombre, correo, moneda, rol, telegram_id, created_at, ultimo_login, deleted_at;
    `,

    /**
     * Realiza un soft delete de un usuario.
     */
    DESHABILITAR_USUARIO: `
        UPDATE usuarios
        SET deleted_at = CURRENT_TIMESTAMP, token_version = token_version + 1,
            reset_token_hash = NULL, reset_token_expires = NULL,
            codigo_recuperacion = NULL, codigo_expiracion = NULL, codigo_verificacion = false
        WHERE id = $1;
    `,

    /**
     * Reactiva (des-elimina) un usuario previamente deshabilitado.
     */
    REACTIVAR_USUARIO: `
        UPDATE usuarios
        SET deleted_at = NULL
        WHERE id = $1
        RETURNING id, nombre, correo, moneda, rol, telegram_id, created_at, ultimo_login, deleted_at;
    `,

    /**
     * Registra la fecha/hora del último inicio de sesión exitoso.
     */
    ACTUALIZAR_ULTIMO_LOGIN: `
        UPDATE usuarios
        SET ultimo_login = NOW()
        WHERE id = $1;
    `,

    /**
     * Whitelist de columnas ordenables para el listado paginado de administración
     * (evita inyección SQL vía el parámetro sortBy).
     */
    COLUMNAS_ORDENABLES_USUARIOS: {
        id: 'u.id',
        nombre: 'u.nombre',
        correo: 'u.correo',
        created_at: 'u.created_at',
        ultimo_login: 'u.ultimo_login',
        movimientos_count: 'movimientos_count',
        balance_total: 'balance_total',
    },

    /**
     * Genera el listado paginado/filtrable/ordenable de usuarios para administración,
     * con conteo de movimientos y balance total resueltos vía subconsultas pre-agregadas
     * (evita el fan-out de un JOIN directo entre movimientos y cuentas).
     *
     * @param {object} opts
     * @param {string[]} opts.condiciones Fragmentos SQL ya armados para el WHERE.
     * @param {string} opts.ordenColumna Columna SQL ya resuelta desde COLUMNAS_ORDENABLES_USUARIOS.
     * @param {string} opts.ordenDireccion 'ASC' | 'DESC'.
     * @param {number} opts.indexLimit Índice del parámetro LIMIT.
     * @param {number} opts.indexOffset Índice del parámetro OFFSET.
     */
    GENERAR_LISTADO_PAGINADO_USUARIOS: ({ condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset }) => `
        SELECT
            u.id, u.nombre, u.correo, u.moneda, u.telegram_id, u.rol,
            u.created_at, u.ultimo_login, u.deleted_at,
            COALESCE(mv.movimientos_count, 0) AS movimientos_count,
            COALESCE(ct.balance_total, 0) AS balance_total,
            COUNT(*) OVER() AS total_registros
        FROM usuarios u
        LEFT JOIN (
            SELECT usuario_id, COUNT(*) AS movimientos_count
            FROM movimientos
            WHERE deleted_at IS NULL
            GROUP BY usuario_id
        ) mv ON mv.usuario_id = u.id
        LEFT JOIN (
            SELECT usuario_id, SUM(saldo_actual) AS balance_total
            FROM cuentas
            GROUP BY usuario_id
        ) ct ON ct.usuario_id = u.id
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ORDER BY ${ordenColumna} ${ordenDireccion}, u.id ASC
        LIMIT $${indexLimit} OFFSET $${indexOffset};
    `
};
