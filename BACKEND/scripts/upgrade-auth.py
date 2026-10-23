from pathlib import Path
p=Path('src/controllers/authControllers.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace("const jwt = require('jsonwebtoken');","const jwt = require('jsonwebtoken');\nconst validation = require('../utils/validation');")
s=s.replace('exports.loginConGoogle = async (req, res, next) => {','exports.loginConGoogle = async (req, res, next) => {\n    if(process.env.GOOGLE_ENABLED !== \'true\') return res.status(503).json({message:\'Google está desactivado en modo local. Usa correo y contraseña.\'});')
s=s.replace('await bcrypt.compare(password, usuario.password)','usuario.password && await bcrypt.compare(password, usuario.password)')
s=s.replace("const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol };","const payload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol, version: usuario.token_version };")
s=s.replace("const jwtPayload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol || 'USUARIO' };","const jwtPayload = { id: usuario.id, correo: usuario.correo, rol: usuario.rol || 'USUARIO', version: usuario.token_version || 0 };")
s=s.replace('jwt.sign({ id: usuario.id },','jwt.sign({ id: usuario.id, version: usuario.token_version || 0 },')
s=s.replace('const usuario = resultado.rows[0];\n\n        const token = jwt.sign(',"const usuario = resultado.rows[0];\n        if(Number(payload.version ?? -1) !== usuario.token_version) return res.status(401).json({message:'La sesión fue revocada. Inicia sesión nuevamente.'});\n\n        const token = jwt.sign(")
s=s.replace('{ id: usuario.id, correo: usuario.correo, rol: usuario.rol },','{ id: usuario.id, correo: usuario.correo, rol: usuario.rol, version: usuario.token_version },')
s=s.replace('const { nombre, correo, password } = req.body;',"const { nombre, correo, password, fechaNacimiento } = req.body;\n        validation.password(password,{nombre,correo});\n        validation.birthDate(fechaNacimiento);")
s=s.replace('RegistroCompleto({ nombre, correo, password: hashPassword })','RegistroCompleto({ nombre: nombre.trim(), correo, password: hashPassword, fechaNacimiento })')
s=s.replace('res.status(200).json({ message: resultado.message });','res.status(200).json(resultado);')
s=s.replace('const { correo, nuevaContrasena } = req.body;','const { correo, nuevaContrasena, resetToken } = req.body;')
s=s.replace('// 🔒 CIBERSEGURIDAD: Encriptamos la nueva contraseña antes de guardarla',"validation.password(nuevaContrasena, existe.rows[0]);\n        // Almacenar solamente el hash de la contraseña.")
s=s.replace('authService.cambiarContrasena(correo, hashPassword)','authService.cambiarContrasena(correo, hashPassword, resetToken)')
p.write_text(s,encoding='utf-8')
p=Path('src/controllers/usuariosController.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace("const db = require('../config/db');","const db = require('../config/db');\nconst validation = require('../utils/validation');\nconst { registrarAuditoria } = require('../utils/auditoria');")
s=s.replace('const datos = {};',"const datos = {};\n            const current=(await usuariosModel.ObtenerUsuarioPorId(idUsuario)).rows[0];\n            if(!current) return res.status(404).json({message:'Usuario no encontrado'});\n            if(nombre !== undefined) { validation.text(nombre,'Nombre',100); if(nombre.trim().length<2) throw validation.bad('El nombre debe tener al menos 2 caracteres.'); }\n            if(correo !== undefined && (typeof correo !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(correo) || correo.length>254)) throw validation.bad('Correo inválido.');\n            if(rol !== undefined && !['USUARIO','ADMIN','ADMINISTRADOR'].includes(rol)) throw validation.bad('Rol inválido.');\n            if(password) validation.password(password,{...current,nombre:nombre??current.nombre,correo:correo??current.correo});")
s=s.replace('if (nombre !== undefined) datos.nombre = nombre;','if (nombre !== undefined) datos.nombre = nombre.trim();').replace('if (correo !== undefined) datos.correo = correo;','if (correo !== undefined) datos.correo = correo.trim().toLowerCase();')
s=s.replace('monto: parseFloat(monto),','monto,')
a=s.index('    async restablecerPassword(');b=s.index('    /**',a);block=s[a:b]
block=block.replace('const { password } = req.body;',"const { password } = req.body;\n            const current=(await usuariosModel.ObtenerUsuarioPorId(idUsuario)).rows[0];\n            if(!current) return res.status(404).json({message:'Usuario no encontrado'});\n            validation.password(password,current);")
s=s[:a]+block+s[b:]
s=s.replace('Promise.allSettled([','Promise.all([').replace("const valorO = (resultado, porDefecto) => (resultado.status === 'fulfilled' ? resultado.value : porDefecto);","const valorO = resultado => resultado;")
s=s.replace('ultimoLogin: u.ultimo_login || null','ultimoLogin: u.ultimo_login || null,\n                fechaNacimiento: u.fecha_nacimiento instanceof Date ? u.fecha_nacimiento.toISOString().slice(0,10) : u.fecha_nacimiento || null')
s=s.replace("const { nombre } = req.body;\n\n            if (!nombre", "const { nombre, fechaNacimiento } = req.body;\n            validation.text(nombre,'Nombre',100);\n            const birthday = validation.birthDate(fechaNacimiento);\n\n            if (!nombre")
s=s.replace("const resultado = await db.query('UPDATE usuarios SET nombre = $1 WHERE id = $2 RETURNING *', [nombre.trim(), idUsuario]);","const resultado = fechaNacimiento === undefined\n                ? await db.query('UPDATE usuarios SET nombre = $1 WHERE id = $2 RETURNING *', [nombre.trim(), idUsuario])\n                : await db.query('UPDATE usuarios SET nombre = $1,fecha_nacimiento=$2 WHERE id = $3 RETURNING *',[nombre.trim(),birthday,idUsuario]);")
s=s.replace("            if (!nuevaPassword || nuevaPassword.length < 6) {\n                return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });\n            }",'')
a=s.index('    async cambiarMiPassword(');b=s.index('    /**',a);block=s[a:b].replace('const u = resUser.rows[0];','const u = resUser.rows[0];\n            if(!u) throw validation.bad(\'Usuario no encontrado.\',404);\n            validation.password(nuevaPassword,u);').replace("UPDATE usuarios SET password_hash = $1 WHERE id = $2","UPDATE usuarios SET password = $1,token_version=token_version+1,reset_token_hash=NULL,reset_token_expires=NULL WHERE id = $2")
s=s[:a]+block+s[b:]
s=s.replace('    async vincularGoogleMiPerfil(req, res, next) {',"    async vincularGoogleMiPerfil(req, res, next) {\n        if(process.env.GOOGLE_ENABLED !== 'true') return res.status(503).json({message:'Google está desactivado en modo local.'});")
a=s.index('    async subirAvatarCloudinary(');b=s.index('    /**',a)
s=s[:a]+'''    async subirAvatarCloudinary(req,res,next) {
        try {
            const image=req.body.imagen;
            const match=typeof image==='string' && /^data:image\\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
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

'''+s[b:]
p.write_text(s,encoding='utf-8')
p=Path('src/middlewares/sanitizarMiddleware.js');s=p.read_text(encoding='utf-8-sig').replace('valor[clave] = sanitizarProfundo(valor[clave]);',"if(!['password','passwordActual','nuevaPassword','nuevaContrasena','resetToken','token','refreshToken','credential','imagen'].includes(clave)) valor[clave] = sanitizarProfundo(valor[clave]);");p.write_text(s,encoding='utf-8')
