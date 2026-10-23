module.exports = {
    SELECT_ALL: 'SELECT clave, valor FROM configuracion ORDER BY clave ASC',
    UPSERT: `INSERT INTO configuracion (clave, valor, actualizado_en) VALUES ($1, $2, NOW())
        ON CONFLICT (clave) DO UPDATE SET valor = $2, actualizado_en = NOW()`,
};
