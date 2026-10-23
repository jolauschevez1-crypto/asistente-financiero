const {param,body}=require('express-validator');
const v=require('../utils/validation');
const id=()=>param('id').isInt({min:1,max:2147483647}).withMessage('Identificador inválido.');
const amount=()=>body('monto').custom(value=>{v.money(value);return true;});
const fields=()=>['categoria','descripcion','cuenta_origen','cuenta_destino','metodo_pago'].map(name=>body(name).optional({values:'falsy'}).custom(value=>{v.text(value,name,name==='descripcion'?255:100);return true;}));
module.exports={validarIdMovimiento:[id()],validarEdicionMovimiento:[id(),amount(),...fields()],validarCreacionMovimiento:[body('tipo').isIn(['INGRESO','GASTO','TRANSFERENCIA']).withMessage('Tipo de movimiento inválido.'),amount(),...fields()],validarCreacionCuenta:[body('nombre').custom(value=>{v.text(value,'Nombre de cartera',100);return true;})]};
