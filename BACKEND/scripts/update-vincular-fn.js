const db = require('../src/config/db');

const sql = `
CREATE OR REPLACE FUNCTION fx_vincular_cuenta_web(
    p_telegram_id BIGINT,
    p_correo VARCHAR(100),
    p_password TEXT
)
RETURNS TABLE (
    id INT,
    nombre VARCHAR(100),
    correo VARCHAR(100),
    rol VARCHAR(50)
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_existente INT;
BEGIN
    SELECT u.id INTO v_usuario_existente 
    FROM usuarios u 
    WHERE u.correo = p_correo AND u.deleted_at IS NULL;

    IF v_usuario_existente IS NOT NULL THEN
        -- Eliminar registro temporal creado por el bot para este telegram_id
        DELETE FROM usuarios 
        WHERE telegram_id = p_telegram_id AND (usuarios.correo IS NULL OR usuarios.correo = '') AND usuarios.id <> v_usuario_existente;

        -- Vincular el telegram_id al registro del usuario existente en la Web
        RETURN QUERY 
        UPDATE usuarios 
        SET telegram_id = p_telegram_id,
            password = COALESCE(NULLIF(p_password, ''), usuarios.password)
        WHERE usuarios.id = v_usuario_existente AND deleted_at IS NULL
        RETURNING usuarios.id, usuarios.nombre, usuarios.correo, usuarios.rol;
    ELSE
        -- Si el correo es completamente nuevo
        RETURN QUERY 
        UPDATE usuarios 
        SET correo = p_correo, 
            password = p_password 
        WHERE telegram_id = p_telegram_id AND deleted_at IS NULL
        RETURNING usuarios.id, usuarios.nombre, usuarios.correo, usuarios.rol;
    END IF;
END;
$$;
`;

(async () => {
    try {
        await db.query(sql);
        console.log('OK: Función fx_vincular_cuenta_web actualizada correctamente.');
        process.exit(0);
    } catch (err) {
        console.error('Error al actualizar fx_vincular_cuenta_web:', err);
        process.exit(1);
    }
})();
