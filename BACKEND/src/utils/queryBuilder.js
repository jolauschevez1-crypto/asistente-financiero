/**
 * @file queryBuilder.js
 * @description Utilidades compartidas para construir listados paginados/filtrables con SQL
 * parametrizado. Centraliza el patron condiciones/valores/indices de LIMIT-OFFSET duplicado
 * entre usuariosModel.ListarUsuariosPaginado y movimientosModel.listarMovimientosGlobalPaginado,
 * sin cambiar la semantica de ningun filtro existente: cada modelo sigue decidiendo QUE
 * condiciones agregar y en que orden, esta utilidad solo centraliza COMO se numeran los
 * placeholders parametrizados ($1, $2, ...) y como se arma la respuesta paginada final.
 */

/**
 * Crea un acumulador de condiciones SQL parametrizadas. El caller agrega condiciones con
 * `agregar(sql, valor)` usando '?' como marcador de posicion (se reemplaza por $N); para
 * condiciones literales sin parametro (ej. "m.deleted_at IS NULL") se sigue usando
 * `condiciones.push(...)` directamente sobre el arreglo devuelto.
 * @returns {{
 *   condiciones: string[],
 *   valores: unknown[],
 *   agregar: (condicionSql: string, valor: unknown) => void,
 *   paginar: (page: number, limit: number) => { indexLimit: number, indexOffset: number },
 * }}
 */
function crearConstructorCondiciones() {
    const condiciones = [];
    const valores = [];

    /**
     * Agrega una condicion parametrizada. Si `condicionSql` repite '?' varias veces
     * (ej. una busqueda OR sobre varias columnas), todas las ocurrencias se resuelven
     * al mismo indice, ya que corresponden a un unico valor (`valor`).
     */
    function agregar(condicionSql, valor) {
        valores.push(valor);
        const indice = valores.length;
        condiciones.push(condicionSql.split('?').join(`$${indice}`));
    }

    /**
     * Agrega los valores de LIMIT/OFFSET a `valores` y devuelve los indices de
     * placeholder correspondientes, para pasarlos a la query paginada.
     */
    function paginar(page, limit) {
        valores.push(limit);
        const indexLimit = valores.length;
        valores.push((page - 1) * limit);
        const indexOffset = valores.length;
        return { indexLimit, indexOffset };
    }

    return { condiciones, valores, agregar, paginar };
}

/**
 * Construye la respuesta estandar de un listado paginado a partir del resultado crudo de
 * `pg` (que incluye `total_registros` por fila via COUNT(*) OVER()).
 * @param {import('pg').QueryResult} resultado
 * @param {number} page
 * @param {number} limit
 * @returns {{ data: object[], total: number, page: number, limit: number }}
 */
function construirResultadoPaginado(resultado, page, limit) {
    const total = resultado.rows[0] ? parseInt(resultado.rows[0].total_registros) : 0;
    return {
        data: resultado.rows.map(({ total_registros, ...fila }) => fila),
        total,
        page: Number(page),
        limit: Number(limit),
    };
}

module.exports = { crearConstructorCondiciones, construirResultadoPaginado };
