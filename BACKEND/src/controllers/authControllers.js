const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validation = require('../utils/validation');
const currency = require('../finance/currency');
const usuariosModel = require('../models/usuariosModel');
// Asumo que tu compañero creó un servicio para enviar los correos
const authService = require('../services/authService');
const logger = require('../utils/logger');
const { registrarAuditoria } = require('../utils/auditoria');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==========================================
// 1. LOGIN Y REGISTRO
// ==========================================

/**
 * Autentica o registra un usuario autenticado mediante el ID Token oficial de Google.
 * @route POST /api/auth/google
 */
exports.loginConGoogle = async (req, res, next) => {
    if(process.env.GOOGLE_ENABLED !== 'true') return res.status(503).json({message:'El acceso con Google aún no está configurado. Usa correo y contraseña.'});
    try {
        const { credential, idToken } = req.body;
        const tokenGoogle = credential || idToken;

        if (!tokenGoogle) {
            return res.status(400).json({ message: 'El token de autenticación de Google es requerido.' });
        }

        // Verificación criptográfica oficial con el Client ID de Google Cloud Console
        let ticket;
        try {
            ticket = await googleClient.verifyIdToken({
                idToken: tokenGoogle,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
        } catch (err) {
            logger.warn('Intento de login con Google fallido: verificación de token rechazada.');
            return res.status(400).json({ message: 'El token de Google es inválido o ha expirado.' });
        }

        const payload = ticket.getPayload();
        const { sub: googleId, email: correo, name: nombre, picture: fotoUrl } = payload;

        if (!correo || payload.email_verified !== true || !googleId) {
            return res.status(400).json({ message: 'No se pudo obtener el correo asociado a la cuenta de Google.' });
        }

        // 1. Buscar usuario por google_id
        let resGoogle = await usuariosModel.BuscarPorGoogleId(googleId);
        let usuario = resGoogle.rows[0];

        // 2. Si no existe por google_id, buscar por correo
        if (!usuario) {
            const resCorreo = await usuariosModel.BuscarPorCorreo(correo);
            if (resCorreo.rows.length > 0) {
                usuario = resCorreo.rows[0];
                if (usuario.google_id && usuario.google_id !== googleId) return res.status(409).json({message:'Esta cuenta ya está vinculada a otra identidad de Google.'});
                if (!correo.toLowerCase().endsWith('@gmail.com') && !payload.hd) return res.status(409).json({message:'Entra con tu contraseña. Este correo externo requiere verificar su propiedad antes de vincularlo.'});
                // Vincular google_id y asignar foto_url SOLO SI el usuario no tiene ninguna foto establecida
                const resUpdate = await require('../config/db').query(`
                    UPDATE usuarios 
                    SET google_id = $1, 
                        foto_url = COALESCE(NULLIF(foto_url, ''), $2) 
                    WHERE id = $3 
                    RETURNING *;
                `, [googleId, fotoUrl || null, usuario.id]);
                usuario = resUpdate.rows[0];
                logger.info(`Cuenta existente vinculada a Google ID para el correo ${correo}.`);
            } else {
                // Registrar nuevo usuario desde Google guardando foto_url por defecto
                const resNew = await require('../config/db').query(`
                    INSERT INTO usuarios (nombre, correo, google_id, foto_url, rol)
                    VALUES ($1, $2, $3, $4, 'USUARIO')
                    RETURNING id, nombre, correo, rol, created_at, foto_url, moneda, token_version;
                `, [nombre || correo.split('@')[0], correo, googleId, fotoUrl || null]);
                usuario = resNew.rows[0];
                logger.info(`Nuevo usuario creado mediante Google Sign-In: ${correo}.`);
                await registrarAuditoria(req, { accion: 'REGISTRO_GOOGLE', entidad: 'usuarios', entidadId: usuario.id, detalle: { correo } });
            }
        } else if (fotoUrl && (!usuario.foto_url || usuario.foto_url.trim() === '')) {
            // Asignar foto de Google SOLO SI la cuenta no tiene foto previa
            await require('../config/db').query('UPDATE usuarios SET foto_url = $1 WHERE id = $2', [fotoUrl, usuario.id]);
            usuario.foto_url = fotoUrl;
        }

        await usuariosModel.ActualizarUltimoLogin(usuario.id);

        const jwtPayload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol || 'USUARIO', version: usuario.token_version || 0 };
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('ERROR CRÍTICO: La variable JWT_SECRET no está definida en las variables de entorno.');
        }

        const token = jwt.sign(jwtPayload, secret, { algorithm: 'HS256', expiresIn: '30m' });
        const refreshToken = jwt.sign({ id: usuario.id, version: usuario.token_version || 0 }, process.env.REFRESH_JWT_SECRET, {
            algorithm: 'HS256',
            expiresIn: '30m',
        });

        logger.info(`Login con Google exitoso: usuario ${usuario.id} (${usuario.correo}).`);
        req.usuario = { id: usuario.id, correo: usuario.correo, rol: usuario.rol || 'USUARIO' };
        await registrarAuditoria(req, { accion: 'LOGIN_GOOGLE', entidad: 'usuarios', entidadId: usuario.id });

        res.status(200).json({
            message: 'Login con Google exitoso',
            token,
            refreshToken,
            usuario: { moneda: usuario.moneda, id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol || 'USUARIO', foto_url: usuario.foto_url || null, telegram_id: usuario.telegram_id || null, telegramId: usuario.telegram_id || null }
        });
    } catch (error) {
        logger.error('Error en login con Google:', error);
        next(error);
    }
};

/**
 * Autentica un usuario por correo/password y emite un JWT.
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
    try {
        const { correo, password } = req.body;
        const resultado = await usuariosModel.BuscarPorCorreo(correo);

        if (resultado.rows.length === 0) {
            logger.warn(`Intento de login fallido para correo ${correo}: correo no encontrado.`);
            await registrarAuditoria(req, { accion: 'LOGIN_FALLIDO', entidad: 'usuarios', detalle: { correo } });
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        const usuario = resultado.rows[0];
        const passwordValida = usuario.password && await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            logger.warn(`Intento de login fallido para correo ${correo}: contraseña incorrecta.`);
            await registrarAuditoria(req, { accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: usuario.id, detalle: { correo } });
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        await usuariosModel.ActualizarUltimoLogin(usuario.id);

        const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol, version: usuario.token_version };
        const secret = process.env.JWT_SECRET
        if (!secret) {
    throw new Error('ERROR CRÍTICO: La variable JWT_SECRET no está definida en las variables de entorno.');
}
        const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '30m' });
        const refreshToken = jwt.sign({ id: usuario.id, version: usuario.token_version || 0 }, process.env.REFRESH_JWT_SECRET, {
            algorithm: 'HS256',
            expiresIn: '30m',
        });

        logger.info(`Login exitoso: usuario ${usuario.id} (${usuario.correo}).`);
        req.usuario = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
        await registrarAuditoria(req, { accion: 'LOGIN', entidad: 'usuarios', entidadId: usuario.id });
        res.status(200).json({
            message: 'Login exitoso',
            token,
            refreshToken,
            usuario: { moneda: usuario.moneda, id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol, foto_url: usuario.foto_url || null, telegram_id: usuario.telegram_id || null, telegramId: usuario.telegram_id || null }
        });
    } catch (error) {
        logger.error('Error en login:', error);
        next(error);
    }
};

/**
 * Emite un nuevo access token de corta duracion a partir de un refresh token vigente.
 * Re-valida al usuario contra la BD en cada llamada (via ObtenerUsuarioPorId, que ya excluye
 * usuarios con deleted_at) para que deshabilitar/eliminar un usuario corte su acceso aunque
 * su refresh token (stateless, sin tabla de revocacion) siga sin expirar.
 * @route POST /api/auth/refresh
 */
exports.refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'refreshToken es requerido.' });
        }

        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET, { algorithms: ['HS256'] });
        } catch (error) {
            return res.status(403).json({ message: 'Refresh token inválido o expirado.' });
        }

        if (!payload.iat || Date.now()/1000 >= payload.iat + 1800) return res.status(401).json({message:'Tu sesión expiró. Inicia sesión nuevamente.',code:'SESSION_EXPIRED'});
        const resultado = await usuariosModel.ObtenerUsuarioPorId(payload.id);
        if (resultado.rows.length === 0) {
            return res.status(403).json({ message: 'Refresh token inválido o expirado.' });
        }
        const usuario = resultado.rows[0];
        if(Number(payload.version ?? -1) !== usuario.token_version) return res.status(401).json({message:'La sesión fue revocada. Inicia sesión nuevamente.'});

        const token = jwt.sign(
            { id: usuario.id, correo: usuario.correo, rol: usuario.rol, version: usuario.token_version, exp: payload.iat + 1800 },
            process.env.JWT_SECRET,
            { algorithm: 'HS256' },
        );

        logger.info(`Token refrescado: usuario ${usuario.id} (${usuario.correo}).`);
        res.status(200).json({ message: 'Token renovado', token });
    } catch (error) {
        logger.error('Error en refresh:', error);
        next(error);
    }
};

/**
 * Registra un nuevo usuario publico (self-service).
 * @route POST /api/auth/registro
 */
exports.registroPublico = async (req, res, next) => {
    try {
        const { nombre, correo, password, fechaNacimiento } = req.body;
        const moneda=currency.validate(req.body.moneda);
        validation.password(password,{nombre,correo});
        validation.birthDate(fechaNacimiento);

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = await usuariosModel.RegistroCompleto({ nombre: nombre.trim(), correo, password: hashPassword, fechaNacimiento, moneda });

        logger.info(`Registro publico exitoso: ${correo}.`);
        await registrarAuditoria(req, { accion: 'REGISTRO', entidad: 'usuarios', entidadId: nuevoUsuario?.id, detalle: { correo } });
        res.status(201).json({ message: 'Registro exitoso. Ya puede iniciar sesión.' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ message: 'El correo ya está registrado' });
        logger.error('Error en registro publico:', error);
        next(error);
    }
};

// ==========================================
// 2. RECUPERACIÓN DE CONTRASEÑA
// ==========================================

/**
 * Envia (o simula el envio de) un codigo de recuperacion de contraseña al correo indicado.
 * @route POST /api/auth/recuperar-password
 */
exports.solicitarRecuperacion = async (req, res, next) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ message: 'El correo es requerido' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resultado = await authService.solicitarRecuperacion(correo);
        logger.info(`Codigo de recuperacion solicitado para ${correo}.`);
        res.status(200).json(resultado);
    } catch (error) {
        logger.error('Error al solicitar recuperacion de password:', error);
        next(error);
    }
};

/**
 * Verifica el codigo de recuperacion enviado al correo del usuario.
 * @route POST /api/auth/verificar-codigo
 */
exports.verificarCodigo = async (req, res, next) => {
    try {
        const { correo, codigoIngresado } = req.body;
        if (!correo || !codigoIngresado) return res.status(400).json({ message: 'Correo y código son requeridos' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resultado = await authService.verificarCodigo(correo, codigoIngresado);
        res.status(200).json(resultado);
    } catch (error) {
        logger.error('Error al verificar codigo de recuperacion:', error);
        next(error);
    }
};

/**
 * Cambia la contraseña del usuario tras verificar el codigo de recuperacion.
 * @route POST /api/auth/cambiar-password
 */
exports.cambiarContrasena = async (req, res, next) => {
    try {
        const { correo, nuevaContrasena, resetToken } = req.body;
        if (!correo || !nuevaContrasena) return res.status(400).json({ message: 'Correo y nueva contraseña son requeridos' });

        const existe = await usuariosModel.BuscarPorCorreo(correo);
        if (existe.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        validation.password(nuevaContrasena, existe.rows[0]);
        // Almacenar solamente el hash de la contraseña.
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(nuevaContrasena, salt);

        await authService.cambiarContrasena(correo, hashPassword, resetToken);
        logger.info(`Contraseña actualizada via recuperacion para ${correo}.`);
        await registrarAuditoria(req, { accion: 'CAMBIO_PASSWORD', entidad: 'usuarios', entidadId: existe.rows[0].id, detalle: { correo } });
        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        logger.error('Error al cambiar password:', error);
        next(error);
    }
};
