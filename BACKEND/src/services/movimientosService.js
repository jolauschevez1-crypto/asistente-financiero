const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');

class MovimientosService {
    /**
     * Registra un movimiento financiero para un usuario.
     * @param {Object} data - Datos del movimiento (usuario_id, telegram_id, etc).
     */
    async registrarMovimiento(data, validarSaldo = true) {
        const {
            usuario_id,
            telegram_id,
            username,
            nombre,
            tipo,
            categoria,
            monto,
            cuenta_origen,
            cuenta_destino,
            descripcion,
            metodo_pago
        } = data;
        const tipoNormalizado = String(tipo || '').toUpperCase();

        // 1. Validaciones básicas
        if (!usuario_id && !telegram_id) {
            throw new Error('Se requiere un usuario autenticado o un ID de Telegram.');
        }
        if (!tipo || !['INGRESO', 'GASTO', 'TRANSFERENCIA'].includes(tipoNormalizado)) {
            throw new Error(`Tipo de movimiento no válido: ${tipo}`);
        }
        if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
            throw new Error('El monto debe ser un número mayor a cero.');
        }

        // 2. Buscar o crear el usuario en la BD
        let usuario;
        if (usuario_id) {
            usuario = await movimientosModel.buscarUsuarioPorId(usuario_id);
            if (!usuario) {
                throw new Error('No se encontró el usuario autenticado.');
            }
        } else {
            usuario = await movimientosModel.buscarOCrearUsuario(telegram_id, username, nombre);
        }

        // 3. Normalizar cuentas por tipo
        let cuentaOrigenNorm = cuenta_origen;
        let cuentaDestinoNorm = cuenta_destino;

        if (tipoNormalizado === 'GASTO' && !cuentaOrigenNorm) {
            cuentaOrigenNorm = 'Efectivo'; // Fallback
        } else if (tipoNormalizado === 'INGRESO' && !cuentaOrigenNorm) {
            // Usaremos cuenta_origen para registrar dónde entra el ingreso
            cuentaOrigenNorm = cuenta_destino || 'Efectivo';
        }

        // 4. Preparar payload para la BD
        const payload = {
            usuario_id: usuario.id,
            tipo: tipoNormalizado,
            categoria: categoria || 'Otros',
            monto: require('../utils/validation').money(monto),
            cuenta_origen: cuentaOrigenNorm,
            cuenta_destino: cuentaDestinoNorm,
            descripcion: descripcion || (tipoNormalizado === 'TRANSFERENCIA' ? `Transferencia a ${cuentaDestinoNorm}` : `Movimiento de ${categoria || 'Otros'}`),
            metodo_pago: metodo_pago || (tipoNormalizado === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO')
        };

        logger.debug('Registrando movimiento con payload:', payload);
        const resultado = await movimientosModel.registrarMovimiento(payload);

        return {
            status: 'OK',
            usuario,
            movimiento: resultado
        };
    }

    /**
     * Duplica un movimiento existente: crea uno NUEVO (mismo usuario/tipo/categoria/monto/
     * cuentas/descripcion/metodo_pago, fecha = NOW()) reutilizando el mismo camino de
     * registrarMovimiento (con su misma validación de saldo), para que los saldos de las
     * cuentas se actualicen correctamente en vez de copiar la fila cruda.
     * @param {number} movimientoId ID del movimiento origen.
     */
    async duplicarMovimiento(movimientoId) {
        const original = await movimientosModel.obtenerMovimientoCompletoPorId(movimientoId);
        if (!original) {
            const error = new Error('Movimiento no encontrado o eliminado; no se puede duplicar.');
            error.status = 404;
            throw error;
        }

        return await this.registrarMovimiento({
            usuario_id: original.usuario_id,
            tipo: original.tipo,
            categoria: original.categoria,
            monto: Number(original.monto),
            cuenta_origen: original.cuenta_origen,
            cuenta_destino: original.cuenta_destino,
            descripcion: original.descripcion,
            metodo_pago: original.metodo_pago,
        });
    }

    /**
     * Crea una cuenta nueva para un usuario.
     */
    async crearCuenta(data) {
        const { usuario_id, nombre } = data;
        if (!usuario_id) throw new Error('Se requiere un usuario autenticado.');
        return await movimientosModel.crearCuentaParaUsuario(nombre, usuario_id);
    }

    /**
     * Asegura la existencia de un usuario (y crea cuentas si no existen).
     * No registra ningún movimiento ficticio.
     */
    async asegurarUsuario(telegramId, username, nombre) {
        if (!telegramId) throw new Error('El ID de Telegram es requerido.');
        return await movimientosModel.buscarOCrearUsuario(telegramId, username, nombre);
    }

    /**
     * Obtiene las cuentas del usuario y sus saldos.
     */
    async listarCuentasUsuario(identificador) {
        if (!identificador) throw new Error('Se requiere un identificador de usuario.');

        let usuario = null;
        if (typeof identificador === 'number' || /^\d+$/.test(String(identificador))) {
            usuario = await movimientosModel.buscarUsuarioPorId(Number(identificador));
        }

        if (!usuario) {
            usuario = await movimientosModel.buscarOCrearUsuario(identificador);
        }

        // Cada cartera tiene su moneda: los saldos se agrupan por moneda y nunca se suman entre sí.
        const cuentas = await movimientosModel.listarCuentas(usuario.id);
        const porMoneda = new Map();
        for (const c of cuentas) porMoneda.set(c.moneda, (porMoneda.get(c.moneda) || 0) + Math.round(Number(c.saldo_actual) * 100));
        const balances = [...porMoneda].map(([moneda, centavos]) => ({ moneda, total: require('../finance/validation').money(centavos) }));
        const balanceTotal = balances.length === 1 ? Number(balances[0].total) : (balances.length ? null : 0);

        return {
            cuentas,
            balances,
            balanceTotal
        };
    }
}

module.exports = new MovimientosService();
