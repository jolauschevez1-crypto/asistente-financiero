const bcrypt = require('bcryptjs');
const usuariosModel = require('../models/usuariosModel');
const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');
const db = require('../config/db');
const validation = require('../utils/validation');
const { registrarAuditoria } = require('../utils/auditoria');
const { mapUsuario, mapUsuarios } = require('../dtos/usuarioDto');
function formatUtcIso(val) {
    if (!val) return null;
    if (val instanceof Date) {
        return val.toISOString();
    }
    const str = String(val).trim();
    if (!str.endsWith('Z') && !str.includes('+')) {
        return new Date(str.replace(' ', 'T') + 'Z').toISOString();
    }
    return new Date(str).toISOString();
}

class UsuariosController {
    /**
     * Lista usuarios de forma paginada, ordenable y filtrable (rol, estado, busqueda por texto).
     * @route GET /api/usuarios
     */
    async listarUsuarios(req, res, next) {
        try {
            const { page = 1, limit = 20, sortBy = 'id', sortDir = 'asc', rol, estado, q } = req.query;

            const resultado = await usuariosModel.ListarUsuariosPaginado({
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 20, 100),
                sortBy, sortDir, rol, estado, q,
            });

            res.status(200).json({
                success: true,
                data: mapUsuarios(resultado.data),
                meta: { total: resultado.total, page: resultado.page, limit: resultado.limit },
            });
        } catch (error) {
            logger.error('Error al listar usuarios:', error);
            next(error);
        }
    }

    /**
     * Obtiene un usuario por id (incluye deshabilitados, uso administrativo).
     * @route GET /api/usuarios/:id
     */
    async obtenerUsuarioPorId(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const resultado = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            res.status(200).json({ success: true, data: mapUsuario(resultado.rows[0]) });
        } catch (error) {
            logger.error('Error al obtener usuario por id:', error);
            next(error);
        }
    }

    /**
     * Busca usuarios cuyo correo coincida (parcial) con el termino de busqueda.
     * @route GET /api/usuarios/buscar
     */
    async buscarUsuariosPorCorreo(req, res, next) {
        try {
            const correo = String(req.query.correo || '').trim();
            if (!correo) return res.status(400).json({ message: 'El correo es requerido' });

            const resultados = await usuariosModel.BuscarUsuariosPorCorreoAdmin(correo);
            res.status(200).json({ success: true, data: mapUsuarios(resultados.rows) });
        } catch (error) {
            logger.error('Error al buscar usuarios por correo:', error);
            next(error);
        }
    }

    /**
     * Actualiza nombre/correo/rol/password de un usuario.
     * @route PUT /api/usuarios/:id
     */
    async actualizarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const { nombre, correo, password, rol } = req.body;
            const datos = {};
            const current=(await usuariosModel.ObtenerUsuarioPorId(idUsuario)).rows[0];
            if(!current) return res.status(404).json({message:'Usuario no encontrado'});
            if(nombre !== undefined) { validation.text(nombre,'Nombre',100); if(!/^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u.test(nombre.trim())) throw validation.bad('El nombre solo admite letras, espacios, guiones y apóstrofes.'); if(nombre.trim().length<2) throw validation.bad('El nombre debe tener al menos 2 caracteres.'); }
            if(correo !== undefined && (typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length>254)) throw validation.bad('Correo inválido.');
            if(rol !== undefined && !['USUARIO','ADMIN','ADMINISTRADOR'].includes(rol)) throw validation.bad('Rol inválido.');
            if(password) validation.password(password,{...current,nombre:nombre??current.nombre,correo:correo??current.correo});

            if (nombre !== undefined) datos.nombre = nombre.trim();
            if (correo !== undefined) datos.correo = correo.trim().toLowerCase();
            if (rol !== undefined) datos.rol = rol;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                datos.password = await bcrypt.hash(password, salt);
            }

            const resultado = await usuariosModel.ActualizarUsuarioAdmin(idUsuario, datos);
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            logger.info(`Usuario ${idUsuario} actualizado por admin.`);
            await registrarAuditoria(req, { accion: 'USUARIO_ACTUALIZADO', entidad: 'usuarios', entidadId: idUsuario, detalle: { campos: Object.keys(datos) } });
            res.status(200).json({
                success: true,
                data: mapUsuario(resultado.rows[0]),
                message: 'Usuario actualizado correctamente'
            });
        } catch (error) {
            if (error.code === '23505') return res.status(400).json({ message: 'El correo ya esta registrado' });
            logger.error('Error al actualizar usuario:', error);
            next(error);
        }
    }

    /**
     * Lista el historial de movimientos de un usuario (vista administrativa).
     * @route GET /api/usuarios/:id/movimientos
     */
    async listarMovimientosUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const { page, limit } = req.query;

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            if (page === undefined && limit === undefined) {
                const historial = await movimientosModel.obtenerHistorialPorUsuarioAdmin(idUsuario);
                return res.status(200).json({ success: true, data: historial });
            }

            const resultado = await movimientosModel.obtenerHistorialPaginado({
                usuarioId: idUsuario,
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 100, 100),
            });
            res.status(200).json({
                success: true,
                data: resultado.data,
                meta: { total: resultado.total, page: resultado.page, limit: resultado.limit },
            });
        } catch (error) {
            logger.error('Error al listar movimientos de usuario:', error);
            next(error);
        }
    }

    /**
     * Lista las cuentas y el balance total de un usuario (vista administrativa).
     * @route GET /api/usuarios/:id/cuentas
     */
    async listarCuentasUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const cuentas = await movimientosModel.listarCuentas(idUsuario);
            const balanceTotal = await movimientosModel.obtenerBalanceTotal(idUsuario);
            const balances = await movimientosModel.obtenerBalancesPorMoneda(idUsuario);

            res.status(200).json({
                success: true,
                data: {
                    moneda: existe.rows[0].moneda,
                    balance_total: balanceTotal,
                    balances_por_moneda: balances,
                    cuentas
                }
            });
        } catch (error) {
            logger.error('Error al listar cuentas de usuario:', error);
            next(error);
        }
    }

    /**
     * Edita un movimiento puntual de un usuario (vista administrativa).
     * @route PUT /api/usuarios/:id/movimientos/:movimientoId
     */
    async actualizarMovimientoUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const idMovimiento = parseInt(req.params.movimientoId);
            const { categoria, monto, cuenta_origen, cuenta_destino, descripcion, metodo_pago } = req.body;

            const movimiento = await movimientosModel.editarMovimiento(idMovimiento, idUsuario, {
                categoria,
                monto,
                cuenta_origen,
                cuenta_destino,
                descripcion,
                metodo_pago
            });

            logger.info(`Movimiento ${idMovimiento} del usuario ${idUsuario} actualizado por admin.`);
            await registrarAuditoria(req, { accion: 'MOVIMIENTO_EDITADO_ADMIN', entidad: 'movimientos', entidadId: idMovimiento, detalle: { usuarioAfectado: idUsuario } });
            res.status(200).json({
                success: true,
                data: movimiento,
                message: 'Movimiento actualizado correctamente'
            });
        } catch (error) {
            logger.error('Error al actualizar movimiento de usuario:', error);
            next(error);
        }
    }

    /**
     * Elimina un movimiento puntual de un usuario (vista administrativa).
     * @route DELETE /api/usuarios/:id/movimientos/:movimientoId
     */
    async eliminarMovimientoUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const idMovimiento = parseInt(req.params.movimientoId);

            const resultado = await movimientosModel.eliminarMovimientoWeb(idMovimiento, idUsuario);
            logger.info(`Movimiento ${idMovimiento} del usuario ${idUsuario} eliminado por admin.`);
            await registrarAuditoria(req, { accion: 'MOVIMIENTO_ELIMINADO_ADMIN', entidad: 'movimientos', entidadId: idMovimiento, detalle: { usuarioAfectado: idUsuario } });
            res.status(200).json({ success: true, message: resultado.message });
        } catch (error) {
            logger.error('Error al eliminar movimiento de usuario:', error);
            next(error);
        }
    }

    /**
     * Deshabilita (soft-delete) un usuario.
     * @route DELETE /api/usuarios/:id
     */
    async deshabilitarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            if(idUsuario === req.usuario.id) throw validation.bad('No puedes deshabilitar tu propia cuenta administrativa.',409);

            const existe = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            await usuariosModel.DeshabilitarUsuario(idUsuario);
            logger.info(`Usuario ${idUsuario} deshabilitado por admin.`);
            await registrarAuditoria(req, { accion: 'USUARIO_DESHABILITADO', entidad: 'usuarios', entidadId: idUsuario });
            res.status(200).json({ success: true, message: 'Usuario deshabilitado correctamente' });
        } catch (error) {
            logger.error('Error al deshabilitar usuario:', error);
            next(error);
        }
    }

    /**
     * Reactiva un usuario previamente deshabilitado.
     * @route PUT /api/usuarios/:id/reactivar
     */
    async reactivarUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const resultado = await usuariosModel.ReactivarUsuario(idUsuario);
            logger.info(`Usuario ${idUsuario} reactivado por admin.`);
            await registrarAuditoria(req, { accion: 'USUARIO_REACTIVADO', entidad: 'usuarios', entidadId: idUsuario });
            res.status(200).json({ success: true, data: mapUsuario(resultado.rows[0]), message: 'Usuario reactivado correctamente' });
        } catch (error) {
            logger.error('Error al reactivar usuario:', error);
            next(error);
        }
    }

    /**
     * Restablece la contrasena de un usuario (accion administrativa).
     * @route PUT /api/usuarios/:id/password
     */
    async restablecerPassword(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);
            const { password } = req.body;
            const current=(await usuariosModel.ObtenerUsuarioPorId(idUsuario)).rows[0];
            if(!current) return res.status(404).json({message:'Usuario no encontrado'});
            validation.password(password,current);

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const resultado = await usuariosModel.ActualizarUsuarioAdmin(idUsuario, { password: hash });
            if (resultado.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            logger.info(`Password del usuario ${idUsuario} restablecida por admin.`);
            await registrarAuditoria(req, { accion: 'PASSWORD_RESET_ADMIN', entidad: 'usuarios', entidadId: idUsuario });
            res.status(200).json({ success: true, message: 'Contrasena restablecida correctamente' });
        } catch (error) {
            logger.error('Error al restablecer password de usuario:', error);
            next(error);
        }
    }

    /**
     * Obtiene balance total, resumen del mes y gastos por categoria de un usuario.
     * @route GET /api/usuarios/:id/estadisticas
     */
    async obtenerEstadisticasUsuario(req, res, next) {
        try {
            const idUsuario = parseInt(req.params.id);

            const existe = await usuariosModel.ObtenerUsuarioPorIdAdmin(idUsuario);
            if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const [balanceTotal, balancesPorMoneda, resumenMes, gastosCategoriaMes] = await Promise.all([
                movimientosModel.obtenerBalanceTotal(idUsuario),
                movimientosModel.obtenerBalancesPorMoneda(idUsuario),
                movimientosModel.obtenerResumenMes(idUsuario),
                movimientosModel.obtenerGastosCategoriaMes(idUsuario),
            ]);

            const valorO = resultado => resultado;

            res.status(200).json({
                success: true,
                data: {
                    moneda: existe.rows[0].moneda,
                    balanceTotal: valorO(balanceTotal, 0),
                    balancesPorMoneda,
                    resumenMes: valorO(resumenMes, []),
                    gastosCategoriaMes: valorO(gastosCategoriaMes, []),
                },
            });
        } catch (error) {
            logger.error('Error al obtener estadisticas de usuario:', error);
            next(error);
        }
    }

    /**
     * Obtiene el perfil propio del usuario autenticado.
     * @route GET /api/usuarios/me/perfil
     */
    async obtenerMiPerfil(req, res, next) {
        try {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            const idUsuario = req.usuario.id;
            const resUser = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            if (resUser.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

            const u = resUser.rows[0];
            res.status(200).json({
                id: u.id,
                nombre: u.nombre,
                correo: u.correo,
                rol: u.rol,
                moneda: u.moneda,
                tieneGoogle: !!u.google_id,
                tienePassword: !!(u.password_hash || u.password),
                telegram_id: u.telegram_id || null,
                telegramId: u.telegram_id || null,
                createdAt: u.created_at || null,
                fotoUrl: u.foto_url || null,
                ultimoLogin: u.ultimo_login || null,
                fechaNacimiento: u.fecha_nacimiento instanceof Date ? u.fecha_nacimiento.toISOString().slice(0,10) : u.fecha_nacimiento || null
            });
        } catch (error) {
            logger.error('Error al obtener mi perfil:', error);
            next(error);
        }
    }

    /**
     * Actualiza datos basicos del perfil propio (nombre).
     * @route PUT /api/usuarios/me/perfil
     */
    async actualizarMiPerfil(req, res, next) {
        try {
            const idUsuario = req.usuario.id;
            const { nombre, fechaNacimiento } = req.body;
            validation.text(nombre,'Nombre',100); if(!/^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u.test(nombre.trim())) throw validation.bad('El nombre solo admite letras, espacios, guiones y apóstrofes.');
            const birthday = validation.birthDate(fechaNacimiento);

            if (!nombre || nombre.trim().length < 2) {
                return res.status(400).json({ message: 'El nombre debe tener al menos 2 caracteres.' });
            }

            const resultado = fechaNacimiento === undefined
                ? await db.query('UPDATE usuarios SET nombre = $1 WHERE id = $2 RETURNING *', [nombre.trim(), idUsuario])
                : await db.query('UPDATE usuarios SET nombre = $1,fecha_nacimiento=$2 WHERE id = $3 RETURNING *',[nombre.trim(),birthday,idUsuario]);
            const u = resultado.rows[0];

            await registrarAuditoria(req, { accion: 'PERFIL_ACTUALIZADO', entidad: 'usuarios', entidadId: idUsuario });

            res.status(200).json({
                id: u.id,
                nombre: u.nombre,
                correo: u.correo,
                rol: u.rol,
                moneda: u.moneda,
                tieneGoogle: !!u.google_id,
                tienePassword: !!(u.password_hash || u.password),
                createdAt: u.created_at || null,
                fotoUrl: u.foto_url || null,
                ultimoLogin: u.ultimo_login || null,
                fechaNacimiento: u.fecha_nacimiento instanceof Date ? u.fecha_nacimiento.toISOString().slice(0,10) : u.fecha_nacimiento || null
            });
        } catch (error) {
            logger.error('Error al actualizar mi perfil:', error);
            next(error);
        }
    }

    /**
     * Cambia la contraseña del perfil propio.
     * @route PUT /api/usuarios/me/password
     */
    async cambiarMiPassword(req, res, next) {
        try {
            const idUsuario = req.usuario.id;
            const { passwordActual, nuevaPassword } = req.body;



            const resUser = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            const u = resUser.rows[0];
            if(!u) throw validation.bad('Usuario no encontrado.',404);
            validation.password(nuevaPassword,u);

            if (u.password_hash) {
                if (typeof passwordActual !== 'string' || !passwordActual || Buffer.byteLength(passwordActual,'utf8') > 72) {
                    return res.status(400).json({ message: 'Debes ingresar tu contraseña actual.' });
                }
                const valida = await bcrypt.compare(passwordActual, u.password_hash);
                if (!valida) {
                    return res.status(400).json({ message: 'La contraseña actual es incorrecta.' });
                }
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(nuevaPassword, salt);

            const changed=await db.query('UPDATE usuarios SET password = $1,token_version=token_version+1,reset_token_hash=NULL,reset_token_expires=NULL,codigo_recuperacion=NULL,codigo_expiracion=NULL,codigo_verificacion=false WHERE id = $2 AND password IS NOT DISTINCT FROM $3 RETURNING id', [hash, idUsuario,u.password_hash || null]);
            if(!changed.rows.length) throw validation.bad('La contraseña cambió durante la operación. Inicia sesión nuevamente.',409);
            res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
        } catch (error) {
            logger.error('Error al cambiar contraseña:', error);
            next(error);
        }
    }

    /**
     * Vincula el Google ID token a la cuenta autenticada y guarda la foto por defecto si el usuario no tiene ninguna.
     * @route POST /api/usuarios/me/vincular-google
     */
    async vincularGoogleMiPerfil(req, res, next) {
        if(process.env.GOOGLE_ENABLED !== 'true') return res.status(503).json({message:'Google está desactivado en modo local.'});
        try {
            const idUsuario = req.usuario.id;
            const { credential, token } = req.body;
            const googleToken = credential || token;

            if (!googleToken) {
                return res.status(400).json({ message: 'El token de Google es requerido.' });
            }

            let googleId, pictureUrl;
            const { OAuth2Client } = require('google-auth-library');
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            try {
                const ticket = await client.verifyIdToken({
                    idToken: googleToken,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                googleId = payload.sub;
                pictureUrl = payload.picture || null;
            } catch (err) {
                return res.status(400).json({ message: 'Token de Google inválido.' });
            }

            // Verificar si el google_id ya esta en uso por otro usuario
            const existe = await usuariosModel.BuscarPorGoogleId(googleId);
            if (existe.rows.length > 0 && existe.rows[0].id !== idUsuario) {
                return res.status(400).json({ message: 'Esta cuenta de Google ya está vinculada a otro usuario.' });
            }

            await db.query(`
                UPDATE usuarios 
                SET google_id = $1, 
                    foto_url = COALESCE(NULLIF(foto_url, ''), $2) 
                WHERE id = $3
            `, [googleId, pictureUrl, idUsuario]);

            res.status(200).json({ success: true, message: 'Cuenta de Google vinculada con éxito.' });
        } catch (error) {
            logger.error('Error al vincular Google:', error);
            next(error);
        }
    }

    /**
     * Desvincula el Google ID de la cuenta autenticada.
     * @route DELETE /api/usuarios/me/vincular-google
     */
    async desvincularGoogleMiPerfil(req, res, next) {
        try {
            const idUsuario = req.usuario.id;
            const resUser = await usuariosModel.ObtenerUsuarioPorId(idUsuario);
            const u = resUser.rows[0];

            if (!u.password_hash) {
                return res.status(400).json({ message: 'No puedes desvincular Google si no tienes una contraseña establecida para iniciar sesión.' });
            }

            await db.query('UPDATE usuarios SET google_id = NULL WHERE id = $1', [idUsuario]);
            res.status(200).json({ success: true, message: 'Cuenta de Google desvinculada.' });
        } catch (error) {
            logger.error('Error al desvincular Google:', error);
            next(error);
        }
    }

    /**
     * Sube o actualiza la foto de perfil en Cloudinary y la guarda en PostgreSQL.
     * @route POST /api/usuarios/me/avatar
     */
    async subirAvatarCloudinary(req,res,next) {
        try {
            const image=req.body.imagen;
            const match=typeof image==='string' && /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
            if(!match) throw validation.bad('Selecciona una imagen PNG o JPEG válida.');
            const bytes=Buffer.from(match[2],'base64');
            if(bytes.length>2*1024*1024) throw validation.bad('La imagen no puede superar 2 MB.');
            const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
            const jpg=bytes.length>4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes.at(-2)===255 && bytes.at(-1)===217;
            if((match[1]==='png'&&!png)||(match[1]==='jpeg'&&!jpg)) throw validation.bad('El contenido no corresponde al formato de imagen.');
            const fotoUrl=`data:image/${match[1]};base64,${bytes.toString('base64')}`;
            await db.query('UPDATE usuarios SET foto_url=$1 WHERE id=$2',[fotoUrl,req.usuario.id]);
            res.json({success:true,message:'Foto de perfil guardada en esta computadora.',fotoUrl});
        } catch(error) {next(error);}
    }

    /**
     * Elimina la foto de perfil en PostgreSQL (resetea foto_url a NULL).
     * @route DELETE /api/usuarios/me/avatar
     */
    async eliminarAvatar(req, res, next) {
        try {
            const idUsuario = req.usuario.id;
            await db.query('UPDATE usuarios SET foto_url = NULL WHERE id = $1', [idUsuario]);

            res.status(200).json({
                success: true,
                message: 'Foto de perfil eliminada correctamente.',
                fotoUrl: null
            });
        } catch (error) {
            logger.error('Error al eliminar avatar:', error);
            next(error);
        }
    }
}

module.exports = new UsuariosController();
