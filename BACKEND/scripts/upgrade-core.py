from pathlib import Path
p=Path('src/models/movimientosModel.js')
s=p.read_text(encoding='utf-8-sig')
a=s.index('    async registrarMovimiento(datos)');b=s.index('    /**',a)
s=s[:a]+'''    async registrarMovimiento(datos) { return require('../services/ledgerService').create(datos); }

'''+s[b:]
a=s.index('    async eliminarMovimientoWeb(');b=s.index('    /**',a)
s=s[:a]+'''    async eliminarMovimientoWeb(movimientoId, usuarioId) { return require('../services/ledgerService').remove(movimientoId, usuarioId); }

'''+s[b:]
a=s.index('    async editarMovimiento(');b=s.index('    /**',a)
s=s[:a]+'''    async editarMovimiento(movimientoId, usuarioId, datos) { return require('../services/ledgerService').edit(movimientoId, usuarioId, datos); }

'''+s[b:]
p.write_text(s,encoding='utf-8')
p=Path('src/services/movimientosService.js');s=p.read_text(encoding='utf-8-sig')
a=s.index('        // --- Validación de saldo ---');b=s.index('        // 4.',a);s=s[:a]+s[b:]
s=s.replace('monto: parseFloat(monto),',"monto: require('../utils/validation').money(monto),")
p.write_text(s,encoding='utf-8')
p=Path('src/controllers/movimientosController.js');s=p.read_text(encoding='utf-8-sig').replace('eliminarMovimientoWeb(movimientoId);','eliminarMovimientoWeb(movimientoId, req.usuario.id);').replace('monto: parseFloat(monto),','monto,');p.write_text(s,encoding='utf-8')
p=Path('src/utils/validation.js');s=p.read_text(encoding='utf-8-sig').replace('100000000000n','99999999999n').replace('$1,000,000,000.00','$999,999,999.99');p.write_text(s,encoding='utf-8')
p=Path('src/models/usuariosModel.js');s=p.read_text(encoding='utf-8-sig');a=s.index('    async RegistroCompleto(datos)');b=s.index('    /**',a)
s=s[:a]+'''    async RegistroCompleto(datos) {
        return db.withTransaction(async client => {
            const res = await client.query(usuariosQueries.REGISTRO_COMPLETO, [datos.nombre, datos.correo, datos.password]);
            const user = res.rows[0];
            if(datos.fechaNacimiento) await client.query('UPDATE usuarios SET fecha_nacimiento=$1 WHERE id=$2',[datos.fechaNacimiento,user.id]);
            return user;
        });
    }

'''+s[b:]
s=s.replace("campos.push(`password = $${valores.length}`);","campos.push(`password = $${valores.length}`);\n            campos.push('token_version = token_version + 1');\n            campos.push('reset_token_hash = NULL');\n            campos.push('reset_token_expires = NULL');")
p.write_text(s,encoding='utf-8')
p=Path('src/queries/usuariosQueries.js');s=p.read_text(encoding='utf-8-sig').replace('google_id, foto_url, password AS password_hash,','google_id, foto_url, fecha_nacimiento, token_version, password AS password_hash,');p.write_text(s,encoding='utf-8')
