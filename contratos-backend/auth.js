const { randomBytes, createHash, scryptSync, timingSafeEqual } = require('node:crypto');

// Un único usuario. Solo se conserva una derivación de la contraseña en memoria.
const passwordHash = scryptSync('andres', 'contratos-andres-v1', 64);
const lifetime = 8 * 60 * 60 * 1000;
const cookieName = 'contratos_session';
const digest = token => createHash('sha256').update(token).digest('hex');

function createAuth() {
  const sessions = new Map();
  let attempts = 0;
  let windowEnd = 0;
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/' };
  function authenticate(req, res, next) {
    const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    const now = Date.now();
    for (const [key, expires] of sessions) if (expires <= now) sessions.delete(key);
    const key = token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : null;
    req.sessionKey = key && sessions.has(key) ? key : null;
    next();
  }
  function requireAuth(req, res, next) {
    if (!req.sessionKey) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    next();
  }
  function login(req, res) {
    if (Date.now() > windowEnd) { attempts = 0; windowEnd = Date.now() + 60000; }
    if (++attempts > 20) return res.status(429).set('Retry-After', '60').json({ error: 'Demasiados intentos. Espera un minuto.' });
    const { usuario, password } = req.body || {};
    const validPassword = typeof password === 'string' && password.length <= 128 && timingSafeEqual(scryptSync(password, 'contratos-andres-v1', 64), passwordHash);
    if (usuario !== 'andres' || !validPassword) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    if (req.sessionKey) sessions.delete(req.sessionKey);
    while (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString('hex');
    sessions.set(digest(token), Date.now() + lifetime);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
    res.json({ usuario: 'andres' });
  }
  function logout(req, res) {
    if (req.sessionKey) sessions.delete(req.sessionKey);
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  }
  return { authenticate, requireAuth, login, logout };
}
module.exports = { createAuth };
