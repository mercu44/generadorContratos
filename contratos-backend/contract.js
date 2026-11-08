const fs = require('node:fs');
const path = require('node:path');
const fields = ['nombre', 'dni', 'residencia', 'trastero', 'superficie', 'fechainicio', 'fechafinal', 'fechafirma', 'preciooriginal', 'iva'];
function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { errors: ['Se esperaba un objeto JSON.'] };
  const value = {};
  for (const [field, max] of [['nombre',160], ['dni',30], ['residencia',350]]) {
    if (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > max) errors.push(`${field}: obligatorio, máximo ${max} caracteres.`);
    else value[field] = data[field].trim();
  }
  for (const [field, max, positive] of [['trastero',34,true], ['superficie',999999.99,true], ['preciooriginal',99999999.99,false], ['iva',99999999.99,false]]) {
    const raw = data[field];
    const number = Number(raw);
    if (!['string','number'].includes(typeof raw) || String(raw).trim() === '' || !Number.isFinite(number) || number > max || (positive ? number <= 0 : number < 0) || (field === 'trastero' ? !Number.isInteger(number) : !/^\d+(\.\d{1,2})?$/.test(String(raw)))) errors.push(`${field}: introduce un número válido${field === 'trastero' ? ' del 1 al 34' : ' con hasta dos decimales'}.`);
    else value[field] = number;
  }
  for (const field of ['fechainicio','fechafinal','fechafirma']) {
    const raw = data[field];
    const date = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(raw + 'T00:00:00Z') : null;
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== raw || raw < '1900-01-01' || raw > '9999-12-31') errors.push(`${field}: fecha válida requerida (AAAA-MM-DD).`);
    else value[field] = raw;
  }
  if (value.fechainicio && value.fechafinal && value.fechafinal <= value.fechainicio) errors.push('La fecha final debe ser posterior a la inicial.');
  return { errors, value };
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(contract) {
  const data = {...contract};
  for (const field of ['fechainicio','fechafinal','fechafirma']) data[field] = new Intl.DateTimeFormat('es-ES', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(contract[field] + 'T00:00:00Z'));
  for (const field of ['preciooriginal','iva','preciototal','superficie']) data[field] = Number(contract[field]).toLocaleString('es-ES', {minimumFractionDigits:2,maximumFractionDigits:2});
  return fs.readFileSync(path.join(__dirname,'../contrato.html'),'utf8').replace(/{{\s*(\w+)\s*}}/g, (_, key) => escape(data[key] ?? '')).replace('</style>', `
    @page { size: A4; margin: 18mm; }
    body { margin: 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; }
    .titulo { font-size: 18pt; }
    .clausula, .firma { break-inside: avoid; }
    .firma { padding-bottom: 30px; }
    </style>`);
}
module.exports = { fields, validate, render };
