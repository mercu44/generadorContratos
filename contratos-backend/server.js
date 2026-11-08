const {Pool, types} = require('pg');
const puppeteer = require('puppeteer');
const {createApp} = require('./app');
types.setTypeParser(1082, value=>value);
const pool = new Pool({connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:5000});
pool.on('error', error=>console.error('PostgreSQL:',error.message));
let browser;
let busy = false;
async function pdf(html) {
  if (busy) { const error = new Error('El generador PDF está ocupado. Vuelve a intentarlo.'); error.status = 503; throw error; }
  busy = true;
  let page;
  try {
    if(!browser?.connected) browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || undefined, args:process.env.CHROMIUM_NO_SANDBOX === 'true' ? ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] : []});
    page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request',request=>request.abort());
    await page.setContent(html,{waitUntil:'load',timeout:15000});
    return await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,timeout:30000});
  } finally { if(page) await page.close(); busy=false; }
}
const server=createApp(pool,pdf).listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Aplicación en http://localhost:'+(process.env.PORT || 3000)));
async function stop() { server.close(async()=> { if(browser) await browser.close(); await pool.end(); process.exit(0); }); }
process.on('SIGTERM',stop); process.on('SIGINT',stop);
