/**
 * @file csv.js
 * @description Utilidades mínimas y sin dependencias para generar texto CSV con escape RFC 4180.
 */

const PATRON_FORMULA_PELIGROSA = /^[=+\-@\t\r]/;

/**
 * Neutraliza inyección de fórmulas (OWASP CSV Injection): si una celda de texto libre empieza
 * con =, +, -, @, tab o retorno de carro, Excel/LibreOffice la interpretaría como fórmula al
 * abrir el archivo. Anteponer una comilla simple la vuelve texto literal inerte. Solo debe
 * aplicarse a columnas de texto libre (descripcion, categoria, nombres) — nunca a columnas
 * numéricas como `monto`, que puede empezar legítimamente con "-" (montos negativos).
 * @param {unknown} valor
 * @returns {unknown} El valor sin cambios si no es texto peligroso, o con comilla antepuesta.
 */
function neutralizarCeldaTexto(valor) {
    if (valor === null || valor === undefined) return valor;
    const texto = String(valor);
    return PATRON_FORMULA_PELIGROSA.test(texto) ? `'${texto}` : texto;
}

function escaparCampoCsv(valor) {
    if (valor === null || valor === undefined) return '';
    const texto = String(valor);
    if (/[",\n\r]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
}

function filasACsv(encabezados, filas) {
    const lineas = [encabezados.map(escaparCampoCsv).join(',')];
    for (const fila of filas) {
        lineas.push(fila.map(escaparCampoCsv).join(','));
    }
    return lineas.join('\r\n');
}

module.exports = { escaparCampoCsv, filasACsv, neutralizarCeldaTexto };
