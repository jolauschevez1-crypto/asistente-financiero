// src/models/usuariosModel.js
const db = require('../config/db');
const usuariosQueries = require('../queries/usuariosQueries');
const { crearConstructorCondiciones, construirResultadoPaginado } = require('../utils/queryBuilder');

class UsuariosModel {
    // ==========================================
    // MÉTODOS DE AUTENTICACIÓN Y REGISTRO
    // ==========================================

    /**
     * Busca un usuario delegando la consulta a fx_buscar_por_correo.
     * @param {string} correo Correo electrónico del usuario.
     */
    async BuscarPorCorreo(correo) {
        return await db.query(usuariosQueries.BUSCAR_POR_CORREO, [correo]);
    }

    /**
     * Busca un usuario por su Google ID.
     * @param {string} googleId ID único de usuario de Google.
     */
    async BuscarPorGoogleId(googleId) {
        return await db.query(usuariosQueries.BUSCAR_POR_GOOGLE_ID, [googleId]);
    }

    /**
     * Asocia el Google ID a una cuenta de usuario existente.
     * @param {number} id ID del usuario en la base de datos.
     * @param {string} googleId ID de Google a vincular.
     */
    async VincularGoogleId(id, googleId) {
        const res = await db.query(usuariosQueries.VINCULAR_GOOGLE_ID, [googleId, id]);
        return res.rows[0];
    }

    /**
     * Registra un nuevo usuario proveniente de Google Sign-In.
     * @param {object} datos { nombre, correo, googleId }
     */
    async RegistroGoogle({ nombre, correo, googleId }) {
        const res = await db.query(usuariosQueries.REGISTRO_GOOGLE, [nombre, correo, googleId]);
        return res.rows[0];
    }

    /**
     * Registra un nuevo usuario delegando la inserción a fx_registro_completo.
     * @param {object} datos Datos del usuario (nombre, correo, password).
     */
    async RegistroCompleto(datos) {
        return db.withTransaction(async client => {
            const res = await client.query(usuariosQueries.REGISTRO_COMPLETO, [datos.nombre, datos.correo, datos.password]);
            const user = res.rows[0];
            const moneda=require('../finance/currency').validate(datos.moneda);
            const updated=await client.query('UPDATE usuarios SET fecha_nacimiento=COALESCE($1,fecha_nacimiento),moneda=$2 WHERE id=$3 RETURNING *',[datos.fechaNacimiento||null,moneda,user.id]);
            return updated.rows[0];
        });
    }

    /**
     * Vincula la cuenta delegando la actualización a fx_vincular_cuenta_web.
     * @param {string} telegramId ID de Telegram del usuario.
     * @param {string} correo Correo electrónico del usuario.
     * @param {string} passwordHash Hash de la contraseña.
     */
    async VincularCuentaWeb(telegramId, correo, passwordHash) {
        const resultado = await db.query(usuariosQueries.VINCULAR_CUENTA_WEB, [telegramId, correo, passwordHash]);
        return resultado.rows[0];
    }

    // ==========================================
    // MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA
    // ==========================================

    /**
     * Guarda el hash del código de recuperación y su fecha de expiración.
     * @param {string} correo Correo electrónico del usuario.
     * @param {string} codigoHasheado Código de recuperación codificado.
     * @param {Date} expiracion Fecha y hora de expiración.
     */
    async GuardarCodigoRecuperacion(correo, codigoHasheado, expiracion) {
        return await db.query(usuariosQueries.GUARDAR_CODIGO_RECUPERACION, [codigoHasheado, expiracion, correo]);
    }

    /**
     * Obtiene los datos de recuperación actuales del usuario.
     * @param {string} correo Correo electrónico del usuario.
     */
    async ObtenerDatosRecuperacion(correo) {
        const res = await db.query(usuariosQueries.OBTENER_DATOS_RECUPERACION, [correo]);
        return res.rows[0];
    }

    /**
     * Autoriza al usuario a cambiar su contraseña tras validar el código.
     * @param {string} correo Correo electrónico del usuario.
     */
    async MarcarCodigoVerificado(correo) {
        return await db.query(usuariosQueries.MARCAR_CODIGO_VERIFICADO, [correo]);
    }

    /**
     * Guarda la nueva contraseña y limpia los campos temporales de recuperación.
     * @param {string} correo Correo electrónico del usuario.
     * @param {string} nuevaPasswordHash Hash de la nueva contraseña.
     */
    async ActualizarPasswordYLimpiar(correo, nuevaPasswordHash) {
        return await db.query(usuariosQueries.ACTUALIZAR_PASSWORD_Y_LIMPIAR, [nuevaPasswordHash, correo]);
    }

    // ==========================================
    // MÉTODOS DE ADMINISTRACIÓN (Panel Web)
    // ==========================================

    /**
     * Lista todos los usuarios activos del sistema.
     */
    async ObtenerTodosLosUsuarios() {
        return await db.query(usuariosQueries.OBTENER_TODOS_LOS_USUARIOS);
    }

    /**
     * Obtiene la información de un usuario activo específico.
     * @param {number} id ID del usuario.
     */
    async ObtenerUsuarioPorId(id) {
        return await db.query(usuariosQueries.OBTENER_USUARIO_POR_ID, [id]);
    }

    /**
     * Obtiene la información de un usuario sin validar deleted_at.
     * @param {number} id ID del usuario.
     */
    async ObtenerUsuarioPorIdAdmin(id) {
        return await db.query(usuariosQueries.OBTENER_USUARIO_POR_ID_ADMIN, [id]);
    }

    /**
     * Busca usuarios cuyo correo coincida con el término de búsqueda para administración.
     * @param {string} correo Filtro de búsqueda por correo.
     */
    async BuscarUsuariosPorCorreoAdmin(correo) {
        return await db.query(usuariosQueries.BUSCAR_USUARIOS_POR_CORREO_ADMIN, [`%${correo}%`]);
    }

    /**
     * Actualiza la información de un usuario construyendo la consulta dinámicamente.
     * @param {number} id ID del usuario.
     * @param {object} datos Nuevos datos del usuario.
     */
    async ActualizarUsuarioAdmin(id, datos) {
        const campos = [];
        const valores = [];

        if (datos.nombre !== undefined) {
            valores.push(datos.nombre);
            campos.push(`nombre = $${valores.length}`);
        }

        if (datos.correo !== undefined) {
            valores.push(datos.correo);
            campos.push(`correo = $${valores.length}`);
        }

        if (datos.rol !== undefined) {
            valores.push(datos.rol);
            campos.push(`rol = $${valores.length}`);
        }

        if (datos.password !== undefined) {
            valores.push(datos.password);
            campos.push(`password = $${valores.length}`);
            campos.push('token_version = token_version + 1');
            campos.push('reset_token_hash = NULL');
            campos.push('reset_token_expires = NULL');
            campos.push('codigo_recuperacion = NULL');
            campos.push('codigo_expiracion = NULL');
            campos.push('codigo_verificacion = false');
        }

        if (campos.length === 0) {
            return await this.ObtenerUsuarioPorId(id);
        }

        valores.push(id);
        const query = usuariosQueries.GENERAR_ACTUALIZACION_ADMIN(campos, valores.length);

        return db.withTransaction(async client => {
            if(datos.rol === 'USUARIO') {
                const admins=(await client.query("SELECT id FROM usuarios WHERE rol IN ('ADMIN','ADMINISTRADOR') AND deleted_at IS NULL ORDER BY id FOR UPDATE")).rows;
                if(admins.length===1 && admins[0].id===id) throw require('../utils/validation').bad('Debe permanecer al menos un administrador activo.',409);
            }
            return client.query(query,valores);
        });
    }

    /**
     * Realiza un borrado lógico (Soft Delete) del usuario.
     * @param {number} id ID del usuario a deshabilitar.
     */
    async DeshabilitarUsuario(id) {
        return db.withTransaction(async client => {
            const admins=(await client.query("SELECT id FROM usuarios WHERE rol IN ('ADMIN','ADMINISTRADOR') AND deleted_at IS NULL ORDER BY id FOR UPDATE")).rows;
            if(admins.length===1 && admins[0].id===id) throw require('../utils/validation').bad('Debe permanecer al menos un administrador activo.',409);
            return client.query(usuariosQueries.DESHABILITAR_USUARIO,[id]);
        });
    }

    /**
     * Registra la fecha/hora del último inicio de sesión exitoso.
     * @param {number} id ID del usuario que inició sesión.
     */
    async ActualizarUltimoLogin(id) {
        return await db.query(usuariosQueries.ACTUALIZAR_ULTIMO_LOGIN, [id]);
    }

    /**
     * Reactiva (des-elimina) un usuario previamente deshabilitado.
     * @param {number} id ID del usuario a reactivar.
     */
    async ReactivarUsuario(id) {
        return await db.query(usuariosQueries.REACTIVAR_USUARIO, [id]);
    }

    /**
     * Lista usuarios de forma paginada, ordenable y filtrable para administración,
     * incluyendo conteo de movimientos y balance total por usuario.
     * @param {object} opts { page, limit, sortBy, sortDir, rol, estado, q }
     */
    async ListarUsuariosPaginado({ page = 1, limit = 20, sortBy = 'id', sortDir = 'asc', rol, estado, q } = {}) {
        const { condiciones, valores, agregar, paginar } = crearConstructorCondiciones();

        if (rol) agregar('u.rol = ?', rol);

        if (estado === 'activo') condiciones.push('u.deleted_at IS NULL');
        if (estado === 'inactivo') condiciones.push('u.deleted_at IS NOT NULL');

        if (q) agregar('(u.nombre ILIKE ? OR u.correo ILIKE ?)', `%${q}%`);

        const ordenColumna = usuariosQueries.COLUMNAS_ORDENABLES_USUARIOS[sortBy] || 'u.id';
        const ordenDireccion = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        const { indexLimit, indexOffset } = paginar(page, limit);

        const query = usuariosQueries.GENERAR_LISTADO_PAGINADO_USUARIOS({
            condiciones, ordenColumna, ordenDireccion, indexLimit, indexOffset,
        });

        const resultado = await db.query(query, valores);
        return construirResultadoPaginado(resultado, page, limit);
    }
}

module.exports = new UsuariosModel();
