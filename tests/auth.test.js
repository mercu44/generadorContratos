const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../contratos-backend/app');

test('login, protección de todas las rutas, validación y cierre de sesión',async()=>{
  let queries=0;
  const pool={query:async()=>{queries++;return {rows:[],rowCount:0};}};
  const server=createApp(pool,async()=>Buffer.from('pdf')).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const [method,path] of [['GET',''],['POST',''],['PUT','/1'],['DELETE','/1'],['GET','/1'],['GET','/1/html'],['GET','/1/pdf']]) {
      const r=await fetch(base+'/api/contratos'+path,{method});assert.equal(r.status,401);
    }
    assert.equal(queries,0);
    let r=await fetch(base+'/crear.html',{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/login.html');
    const login=data=>fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    r=await login({usuario:'andres',password:'mal'});assert.equal(r.status,401);
    r=await login({usuario:'otro',password:'andres'});assert.equal(r.status,401);
    r=await login({usuario:'andres',password:'andres'});assert.equal(r.status,200);
    const setCookie=r.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);
    const headers={Cookie:setCookie.split(';')[0]};
    r=await fetch(base+'/api/session',{headers});assert.deepEqual(await r.json(),{usuario:'andres'});
    r=await fetch(base+'/api/contratos',{headers});assert.equal(r.status,200);
    r=await fetch(base+'/api/contratos',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({})});assert.equal(r.status,400);assert.ok((await r.json()).fieldErrors.nombre);
    r=await fetch(base+'/api/logout',{method:'POST',headers:{...headers,Origin:'https://otro.example'}});assert.equal(r.status,403);
    r=await fetch(base+'/api/logout',{method:'POST',headers});assert.equal(r.status,204);
    r=await fetch(base+'/api/contratos',{headers});assert.equal(r.status,401);
    r=await fetch(base+'/api/contratos',{headers:{Cookie:'contratos_session=inventada'}});assert.equal(r.status,401);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
