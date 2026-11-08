const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Pool,types}=require('pg');
const {createApp}=require('../contratos-backend/app');
types.setTypeParser(1082,v=>v);
test('CRUD contra PostgreSQL real (base exclusiva de pruebas)',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
 const server=createApp(pool,async()=>Buffer.from('%PDF-test')).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}/api/contratos`;
 const data={nombre:'Prueba integración',dni:'12345678Z',residencia:'Calle Test',trastero:1,superficie:4,fechainicio:'2026-11-08',fechafinal:'2027-11-08',fechafirma:'2026-11-08',preciooriginal:50,iva:10.5};
 let id;
 try {
  let r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,201);let c=await r.json();id=c.id;assert.equal(c.preciototal,'60.50');
  r=await fetch(base+'/'+id);assert.equal(r.status,200);assert.equal((await r.json()).fechainicio,data.fechainicio);
  r=await fetch(base);assert.ok((await r.json()).some(c=>c.id===id));
  r=await fetch(base+'/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,nombre:'Actualizado',preciooriginal:100})});assert.equal(r.status,200);c=await r.json();assert.equal(c.nombre,'Actualizado');assert.equal(c.preciototal,'110.50');
  r=await fetch(base+'/'+id+'/html');assert.ok((await r.text()).includes('Actualizado'));
  r=await fetch(base+'/'+id+'/pdf');assert.equal(r.headers.get('content-type'),'application/pdf');
  r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,400);
  r=await fetch(base+'/abc');assert.equal(r.status,400);
  r=await fetch(base+'/'+id,{method:'DELETE'});assert.equal(r.status,204);
  r=await fetch(base+'/'+id);assert.equal(r.status,404);
 }finally{if(id)await pool.query('DELETE FROM contratos WHERE id=$1',[id]);await new Promise(resolve=>server.close(resolve));await pool.end();}
});
