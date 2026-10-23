function bad(message, status = 400) { return Object.assign(new Error(message), { status, expose: true }); }
function money(value) {
    if (!['string', 'number'].includes(typeof value) || !/^\d+(\.\d{1,2})?$/.test(String(value))) throw bad('El monto debe ser decimal positivo con máximo dos decimales.');
    const [whole, part = ''] = String(value).split('.');
    const cents = BigInt(whole) * 100n + BigInt(part.padEnd(2, '0'));
    if (cents <= 0n || cents > 99999999999n) throw bad('El monto debe estar entre $0.01 y $999,999,999.99.');
    return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
function text(value, name, max = 100, required = true) {
    if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > max || /[\u0000-\u001f]/.test(value)) throw bad(`${name}: ingresa texto válido de hasta ${max} caracteres.`);
    return value.trim();
}
function password(value, identity = {}) {
    if (typeof value !== 'string' || value.length < 10 || Buffer.byteLength(value, 'utf8') > 72) throw bad('La contraseña debe tener al menos 10 caracteres y máximo 72 bytes.');
    const normalize = s => String(s || '').normalize('NFKC').trim().toLowerCase().replace(/\s/g,'');
    if ([identity.nombre, identity.username, identity.correo, identity.correo?.split('@')[0]].some(v => v && normalize(v) === normalize(value))) throw bad('La contraseña no puede ser igual al nombre, usuario o correo.');
    return true;
}
function birthDate(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw bad('Fecha de nacimiento inválida.');
    const date = new Date(`${value}T12:00:00Z`);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > today || value < '1900-01-01') throw bad('La fecha de nacimiento debe ser real, desde 1900 y no futura.');
    return value;
}
module.exports = { bad, money, text, password, birthDate };
