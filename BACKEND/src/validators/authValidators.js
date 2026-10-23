const {body}=require('express-validator');
const v=require('../utils/validation');
const correo=()=>body('correo').isString().bail().trim().toLowerCase().isEmail().withMessage('Ingresa un correo válido.').isLength({max:254});
const password=(field)=>body(field).custom((value,{req})=>v.password(value,req.body));
module.exports={
 validarLogin:[correo(),body('password').isString().bail().isLength({min:1,max:1000})],
 validarRegistro:[body('nombre').custom(value=>{v.text(value,'Nombre',100);if(!/^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u.test(value.trim()))throw v.bad('El nombre solo admite letras, espacios, guiones y apóstrofes.');if(value.trim().length<2)throw v.bad('El nombre debe tener al menos 2 caracteres.');return true;}),correo(),password('password'),body('fechaNacimiento').optional({values:'falsy'}).custom(value=>{v.birthDate(value);return true;})],
 validarRecuperarPassword:[correo()],
 validarVerificarCodigo:[correo(),body('codigoIngresado').matches(/^\d{6}$/).withMessage('Ingresa el código de seis dígitos.')],
 validarCambiarPassword:[correo(),password('nuevaContrasena'),body('resetToken').matches(/^[a-f0-9]{64}$/).withMessage('Debes verificar un código vigente antes de cambiar la contraseña.')]
};
