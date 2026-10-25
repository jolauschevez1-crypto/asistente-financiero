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
// Política v3: 10-72 bytes (más estricta que el mínimo de 8 pedido), al menos una mayúscula, una
// minúscula, un número y un carácter especial, y sin contener el nombre, usuario o correo.
const PASSWORD_RULES = [
    [v => /\p{Lu}/u.test(v), 'una letra mayúscula'],
    [v => /\p{Ll}/u.test(v), 'una letra minúscula'],
    [v => /\d/.test(v), 'un número'],
    [v => /[^\p{L}\p{N}\s]/u.test(v), 'un carácter especial (por ejemplo ! @ # $ %)'],
];
function passwordProblems(value, identity = {}) {
    const problems = [];
    if (typeof value !== 'string') return ['La contraseña es obligatoria.'];
    if (value.length < 10) problems.push('Debe tener al menos 10 caracteres.');
    if (Buffer.byteLength(value, 'utf8') > 72) problems.push('Debe tener como máximo 72 bytes.');
    if (/\s/.test(value)) problems.push('No puede contener espacios.');
    const missing = PASSWORD_RULES.filter(([test]) => !test(value)).map(([, label]) => label);
    if (missing.length) problems.push(`Le falta ${missing.join(', ')}.`);
    const normalize = s => String(s || '').normalize('NFKC').trim().toLowerCase().replace(/\s/g, '');
    const pass = normalize(value);
    const ids = [identity.nombre, identity.username, identity.correo, identity.correo?.split('@')[0],
        ...String(identity.nombre || '').split(/\s+/)].map(normalize).filter(v => v.length >= 4);
    if (ids.some(v => pass === v || pass.includes(v))) problems.push('No puede ser igual ni contener tu nombre, usuario o correo.');
    return problems;
}
function password(value, identity = {}) {
    const problems = passwordProblems(value, identity);
    if (problems.length) throw bad(`Contraseña no válida. ${problems.join(' ')}`);
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
module.exports = { bad, money, text, password, passwordProblems, birthDate };
