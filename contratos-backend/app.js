const express = require('express');
const path = require('node:path');
const {fields, validate, render} = require('./contract');
function createApp(pool, pdf) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'32kb'}));
  app.use((req,res,next) => { res.set('X-Content-Type-Options','nosniff'); res.set('Referrer-Policy','same-origin'); if(req.path.startsWith('/api')) res.set('Cache-Control','no-store'); next(); });
  app.get('/api/health', async (req,res) => { await pool.query('SELECT 1'); res.json({status:'ok'}); });
  app.get('/api/contratos', async (req,res) => { const result = await pool.query('SELECT * FROM contratos ORDER BY created_at DESC, id DESC'); res.json(result.rows); });
  app.param('id', (req,res,next,id) => { if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) return res.status(400).json({error:'Identificador inválido.'}); next(); });
  app.post('/api/contratos', async (req,res) => {
    const {errors,value} = validate(req.body);
    if(errors.length) return res.status(400).json({error:errors.join(' ')});
    const result = await pool.query(`INSERT INTO contratos (${fields.join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,fields.map(f=>value[f]));
    res.status(201).location('/api/contratos/'+result.rows[0].id).json(result.rows[0]);
  });
  app.put('/api/contratos/:id', async (req,res) => {
    const {errors,value} = validate(req.body);
    if(errors.length) return res.status(400).json({error:errors.join(' ')});
    const result = await pool.query(`UPDATE contratos SET ${fields.map((f,i)=>`${f}=$${i+1}`).join(',')} WHERE id=$${fields.length+1} RETURNING *`,[...fields.map(f=>value[f]),req.params.id]);
    if(!result.rowCount) return res.status(404).json({error:'Contrato no encontrado.'});
    res.json(result.rows[0]);
  });
  app.delete('/api/contratos/:id', async (req,res) => { const result = await pool.query('DELETE FROM contratos WHERE id=$1',[req.params.id]); if(!result.rowCount) return res.status(404).json({error:'Contrato no encontrado.'}); res.status(204).end(); });
  async function get(req,res,next) { const result = await pool.query('SELECT * FROM contratos WHERE id=$1',[req.params.id]); if(!result.rowCount) return res.status(404).json({error:'Contrato no encontrado.'}); req.contract=result.rows[0]; next(); }
  app.get('/api/contratos/:id',get,(req,res)=>res.json(req.contract));
  app.get('/api/contratos/:id/html',get,(req,res)=>res.type('html').send(render(req.contract)));
  app.get('/api/contratos/:id/pdf',get,async(req,res)=> { const buffer = await pdf(render(req.contract)); res.set('Content-Disposition',`attachment; filename="contrato-${req.contract.id}.pdf"`).type('pdf').send(Buffer.from(buffer)); });
  app.use('/api', (req,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
  app.use(express.static(path.join(__dirname,'../contratos-frontend')));
  app.use((error,req,res,next)=> { console.error(error.message); res.status(error.status === 400 ? 400 : error.status === 413 ? 413 : error.status === 503 ? 503 : 500).json({error:error.status === 400 ? 'JSON inválido.' : error.status === 413 ? 'Petición demasiado grande.' : error.status === 503 ? error.message : 'No se pudo completar la operación.'}); });
  return app;
}
module.exports = {createApp};
