const movimientosModel = require('../models/movimientosModel');
const logger = require('../utils/logger');

class ReportesService {
  /**
   * Obtiene y formatea el balance general y de cada cuenta.
   */
  async obtenerBalance(telegramId, username, nombre) {
    const usuario = await movimientosModel.buscarOCrearUsuario(telegramId, username, nombre);
    const cuentas = await movimientosModel.listarCuentas(usuario.id);
    const balanceTotal = await movimientosModel.obtenerBalanceTotal(usuario.id);

    // Formatear texto para Telegram
    let textoTelegram = `*📊 Balance General*\n`;
    textoTelegram += `Balance Total: *$${balanceTotal.toFixed(2)}*\n\n`;
    textoTelegram += `*Desglose por cuenta:*\n`;

    cuentas.forEach(c => {
      const saldo = parseFloat(c.saldo_actual);
      textoTelegram += `• ${c.nombre}: *$${saldo.toFixed(2)}*\n`;
    });

    return {
      success: true,
      balanceTotal,
      cuentas,
      textoTelegram
    };
  }

  /**
   * Obtiene movimientos del día de hoy.
   */
  async obtenerReporteHoy(telegramId, username, nombre) {
    const usuario = await movimientosModel.buscarOCrearUsuario(telegramId, username, nombre);
    const movimientos = await movimientosModel.obtenerResumenHoy(usuario.id);

    let totalGastos = 0;
    let totalIngresos = 0;
    let listado = '';

    movimientos.forEach(m => {
      const monto = parseFloat(m.monto);
      if (m.tipo === 'GASTO') {
        totalGastos += monto;
        listado += `🔴 *$${monto.toFixed(2)}* - ${m.descripcion || 'Gasto'} (${m.categoria || 'Sin Cat.'}) de _${m.cuenta_origen || 'Efectivo'}_\n`;
      } else if (m.tipo === 'INGRESO') {
        totalIngresos += monto;
        listado += `🟢 *$${monto.toFixed(2)}* - ${m.descripcion || 'Ingreso'} (${m.categoria || 'Sin Cat.'}) a _${m.cuenta_origen || 'Efectivo'}_\n`;
      } else if (m.tipo === 'TRANSFERENCIA') {
        listado += `🔵 *$${monto.toFixed(2)}* - Transferencia de _${m.cuenta_origen}_ a _${m.cuenta_destino}_\n`;
      }
    });

    let textoTelegram = `*📅 Resumen Financiero de Hoy*\n\n`;
    textoTelegram += `🟢 Total Ingresos: *$${totalIngresos.toFixed(2)}*\n`;
    textoTelegram += `🔴 Total Gastos: *$${totalGastos.toFixed(2)}*\n`;
    textoTelegram += `Saldo del día: *$${(totalIngresos - totalGastos).toFixed(2)}*\n\n`;
    
    if (movimientos.length > 0) {
      textoTelegram += `*Detalle de hoy:*\n${listado}`;
    } else {
      textoTelegram += `_No has registrado movimientos el día de hoy._`;
    }

    return {
      success: true,
      totalIngresos,
      totalGastos,
      balanceDia: totalIngresos - totalGastos,
      movimientos,
      textoTelegram
    };
  }

  /**
   * Obtiene movimientos del mes actual.
   */
  async obtenerReporteMes(telegramId, username, nombre) {
    const usuario = await movimientosModel.buscarOCrearUsuario(telegramId, username, nombre);
    const movimientos = await movimientosModel.obtenerResumenMes(usuario.id);

    let totalGastos = 0;
    let totalIngresos = 0;

    movimientos.forEach(m => {
      const monto = parseFloat(m.monto);
      if (m.tipo === 'GASTO') {
        totalGastos += monto;
      } else if (m.tipo === 'INGRESO') {
        totalIngresos += monto;
      }
    });

    let textoTelegram = `*📅 Resumen Financiero del Mes*\n\n`;
    textoTelegram += `🟢 Total Ingresado: *$${totalIngresos.toFixed(2)}*\n`;
    textoTelegram += `🔴 Total Gastado: *$${totalGastos.toFixed(2)}*\n`;
    textoTelegram += `Balance del Mes: *$${(totalIngresos - totalGastos).toFixed(2)}*\n`;
    textoTelegram += `Número de operaciones: *${movimientos.length}*\n`;

    return {
      success: true,
      totalIngresos,
      totalGastos,
      balanceMes: totalIngresos - totalGastos,
      totalOperaciones: movimientos.length,
      textoTelegram
    };
  }

  /**
   * Obtiene la distribución de gastos por categoría del mes en curso.
   */
  async obtenerReporteCategorias(telegramId, username, nombre) {
    const usuario = await movimientosModel.buscarOCrearUsuario(telegramId, username, nombre);
    const distribucion = await movimientosModel.obtenerGastosCategoriaMes(usuario.id);

    let totalGastado = 0;
    distribucion.forEach(d => {
      totalGastado += parseFloat(d.total);
    });

    let textoTelegram = `*🍕 Gastos por Categoría (Este Mes)*\n`;
    textoTelegram += `Total Gastado: *$${totalGastado.toFixed(2)}*\n\n`;

    if (distribucion.length > 0) {
      distribucion.forEach(d => {
        const total = parseFloat(d.total);
        const porcentaje = totalGastado > 0 ? (total / totalGastado) * 100 : 0;
        textoTelegram += `• *${d.categoria}*: $${total.toFixed(2)} (_${porcentaje.toFixed(1)}%_)\n`;
      });
    } else {
      textoTelegram += `_No hay gastos registrados en este mes todavía._`;
    }

    return {
      success: true,
      totalGastado,
      categorias: distribucion,
      textoTelegram
    };
  }
}

module.exports = new ReportesService();
