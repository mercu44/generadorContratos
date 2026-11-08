const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validate,render}=require('../contratos-backend/contract');
const sample={nombre:'Ana <script>alert(1)</script>',dni:'12345678Z',residencia:'Calle Mayor 1',trastero:3,superficie:'4.50',fechainicio:'2026-11-08',fechafinal:'2027-11-08',fechafirma:'2026-11-08',preciooriginal:'50.00',iva:'10.50'};
test('acepta datos completos y rechaza valores inválidos',()=>{
 assert.equal(validate(sample).errors.length,0);
 for(const invalid of [{trastero:35},{superficie:0},{iva:-1},{iva:true},{iva:'1.234'},{fechainicio:'2026-02-30'},{fechafinal:'2026-01-01'},{nombre:' '},{dni:'x'.repeat(31)}]) assert.ok(validate({...sample,...invalid}).errors.length,JSON.stringify(invalid));
 assert.ok(validate(null).errors.length);
});
test('sustituye campos, escapa HTML y conserva todas las cláusulas',()=>{
 const html=render({...sample,preciototal:'60.50'});
 assert.ok(!html.includes('{{'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('NOVENA. JURISDICCIÓN'));
 assert.ok(html.includes('60,50'));
});
