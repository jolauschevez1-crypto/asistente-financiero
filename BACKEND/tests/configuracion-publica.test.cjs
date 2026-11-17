// Regresion del hallazgo ZAP H-01: GET /api/configuracion (sin sesion) no debe exponer claves sensibles.
const test = require('node:test');
const assert = require('node:assert/strict');
const { mapConfiguracionPublica, CLAVES_SENSIBLES } = require('../src/dtos/configuracionDto');

const config = {
  nombre_sistema: 'Asistente Financiero', logo_url: '', tema: 'claro', color_principal: 'cyan', idioma: 'es', moneda: 'USD',
  ia_modelo: 'modelo', ia_api_key: 'gsk_FICTICIA_0000ABCD', telegram_bot_token: '000:FICTICIO_WXYZ', clave_nueva_privada: 'x',
};

test('la configuracion publica solo contiene claves permitidas', () => {
  const publica = mapConfiguracionPublica(config);
  assert.deepEqual(Object.keys(publica).sort(), ['color_principal', 'idioma', 'logo_url', 'moneda', 'nombre_sistema', 'tema']);
  assert.equal(publica.nombre_sistema, 'Asistente Financiero');
});

test('la configuracion publica no revela claves sensibles ni sus ultimos caracteres', () => {
  const texto = JSON.stringify(mapConfiguracionPublica(config));
  for (const clave of CLAVES_SENSIBLES) assert.ok(!texto.includes(clave), clave);
  assert.ok(!texto.includes('ABCD') && !texto.includes('WXYZ') && !texto.includes('****'));
  assert.ok(!texto.includes('clave_nueva_privada') && !texto.includes('ia_modelo'));
});

test('configuracion vacia o nula no falla', () => {
  assert.deepEqual(mapConfiguracionPublica({}), {});
  assert.deepEqual(mapConfiguracionPublica(null), {});
});
