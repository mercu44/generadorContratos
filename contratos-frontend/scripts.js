const $ = selector => document.querySelector(selector);
const money = value => Number(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const message = (text, error=false) => { $('#mensaje').textContent=text; $('#mensaje').className=error?'error':'success'; };
async function api(url, options={}) {
  const response=await fetch(url,options);
  if(!response.ok) { const body=await response.json().catch(()=>({})); throw new Error(body.error || 'No se pudo completar la operación.'); }
  return response.status===204 ? null : response.json();
}
const form=$('#formulario');
if(form) {
  const editing=location.pathname.endsWith('editar.html');
  const id=new URLSearchParams(location.search).get('id');
  const updateTotal=()=>$('#total').textContent=money(Number(form.preciooriginal.value)+Number(form.iva.value));
  form.addEventListener('input',updateTotal);
  if(editing) {
    $('#campos').disabled=true; $('#guardar').disabled=true;
    (async()=> {
      try {
        if(!id || !/^\d+$/.test(id)) throw new Error('Falta un identificador de contrato válido.');
        const data=await api('/api/contratos/'+id);
        for(const field of form.querySelectorAll('[name]')) field.value=data[field.name];
        updateTotal(); $('#campos').disabled=false; $('#guardar').disabled=false;
      } catch(error) { message(error.message,true); }
    })();
  } else { const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); form.fechafirma.value=now.toISOString().slice(0,10); }
  form.addEventListener('submit',async event=> {
    event.preventDefault(); $('#guardar').disabled=true;
    try {
      await api('/api/contratos'+(editing?'/'+id:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      sessionStorage.setItem('notice',editing?'Contrato actualizado.':'Contrato creado.'); location.href='/';
    } catch(error) { message(error.message,true); $('#guardar').disabled=false; }
  });
}
if($('#contratos')) {
  let contracts=[];
  const notice=sessionStorage.getItem('notice'); if(notice) {message(notice);sessionStorage.removeItem('notice');}
  function draw() {
    const query=$('#buscar').value.toLocaleLowerCase('es');
    const visible=contracts.filter(c=>`${c.nombre} ${c.dni} ${c.trastero}`.toLocaleLowerCase('es').includes(query));
    $('#contratos').replaceChildren();
    $('#estado').textContent=visible.length ? `${visible.length} contrato(s)` : contracts.length ? 'No hay resultados para esta búsqueda.' : 'Todavía no hay contratos. Crea el primero para empezar.';
    for(const c of visible) {
      const row=document.createElement('tr');
      for(const text of [`${c.nombre} · ${c.dni}`,`N.º ${c.trastero} · ${c.superficie} m²`,`${c.fechainicio} → ${c.fechafinal}`,money(c.preciototal)]) { const cell=document.createElement('td');cell.textContent=text;row.append(cell); }
      const actions=document.createElement('td');actions.className='row-actions';
      for(const [label,url] of [['Editar',`/editar.html?id=${c.id}`],['PDF',`/api/contratos/${c.id}/pdf`]]) {const a=document.createElement('a');a.textContent=label;a.href=url;actions.append(a);}
      const view=document.createElement('button'); view.textContent='Ver';view.type='button';view.onclick=()=>{$('#documento').src=`/api/contratos/${c.id}/html`;$('#vista').showModal();}; actions.append(view);
      const remove=document.createElement('button');remove.type='button';remove.textContent='Eliminar';remove.className='danger';
      remove.onclick=async()=> {if(!confirm(`¿Eliminar definitivamente el contrato de ${c.nombre}?`))return;remove.disabled=true;try {await api('/api/contratos/'+c.id,{method:'DELETE'});contracts=contracts.filter(item=>item.id!==c.id);draw();message('Contrato eliminado.');}catch(error){message(error.message,true);remove.disabled=false;}};
      actions.append(remove);row.append(actions);$('#contratos').append(row);
    }
  }
  $('#buscar').addEventListener('input',draw);
  $('#cerrar').onclick=()=>{$('#vista').close();$('#documento').removeAttribute('src');};
  (async()=>{try{contracts=await api('/api/contratos');draw();}catch(error){$('#estado').textContent='No se pudo cargar el archivo. Recarga la página para reintentar.';message(error.message,true);}})();
}
