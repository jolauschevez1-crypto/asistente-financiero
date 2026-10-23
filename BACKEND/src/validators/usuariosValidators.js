const {param,body}=require('express-validator');
const v=require('../utils/validation');
const id=name=>param(name).isInt({min:1,max:2147483647}).withMessage('Identificador inválido.');
const amount=body('monto').custom(value=>{v.money(value);return true;});
module.exports={validarIdUsuario:[id('id')],validarIdUsuarioYMovimiento:[id('id'),id('movimientoId')],validarMontoMovimientoUsuario:[id('id'),id('movimientoId'),amount],validarPasswordUsuario:[id('id'),body('password').custom(value=>v.password(value))]};
