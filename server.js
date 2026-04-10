// ============================================================
//  NECROSIS AI — SERVER v3.0 (server.js)
//  FIXED BUGS:
//  #1 PORT validation crash
//  #2 CORS credentials for session cookies
//  #3 Rate limit skip for auth routes
//  #4 Static files expose config/data dirs
//  #5 Catch-all route placement
//  #6 Global error handler 4-param signature
//  #7 WS duplicate close listener memory leak
//  #8 Uncaught exception handlers missing
// ============================================================

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config', 'env') });

const express             = require('express');
const cors                = require('cors');
const helmet              = require('helmet');
const compression         = require('compression');
const morgan              = require('morgan');
const rateLimit           = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http                = require('http');
const { v4: uuidv4 }      = require('uuid');

const AIEngine    = require('./ai-engine');
const Memory      = require('./memory');
const AgentRouter = require('./agent-router');

// Auth — optional, skip if deps not installed yet
let authRouter = null, setupSession = null;
try {
  const auth = require('./auth');
  authRouter   = auth.router;
  setupSession = auth.setupSession;
  console.log('[Auth] ✅ OAuth login enabled (Google / Facebook / Twitter)');
} catch (e) {
  console.warn('[Auth] ⚠️  Disabled. Run npm install to enable OAuth.');
}

const app    = express();
const server = http.createServer(app);

// FIX #1: PORT parse once, validate properly
const RAW_PORT = parseInt(process.env.PORT, 10);
const PORT     = (!isNaN(RAW_PORT) && RAW_PORT >= 1024 && RAW_PORT <= 65535) ? RAW_PORT : 3000;
const IS_DEV   = process.env.NODE_ENV !== 'production';

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(compression());
app.use(morgan(IS_DEV ? 'dev' : 'combined'));
app.use(cors({
  origin:      process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || '*',
  methods:     ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,  // FIX #2: required for session cookies
}));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session must be set up BEFORE routes
if (setupSession) setupSession(app);

// ── RATE LIMITING ─────────────────────────────────────────────
// FIX #8: Parse env vars with validation and logging
const RATE_LIMIT_WINDOW_MS = (() => {
  const raw = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
  const val = (!isNaN(raw) && raw > 0) ? raw : 60_000;
  if (isNaN(raw)) console.log(`[Server] ℹ️  RATE_LIMIT_WINDOW_MS not set, using default: ${val}ms`);
  return val;
})();

const RATE_LIMIT_MAX_REQUESTS = (() => {
  const raw = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
  const val = (!isNaN(raw) && raw > 0) ? raw : 30;
  if (isNaN(raw)) console.log(`[Server] ℹ️  RATE_LIMIT_MAX_REQUESTS not set, using default: ${val}`);
  return val;
})();

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max:      RATE_LIMIT_MAX_REQUESTS,
  message:  { error: 'Terlalu banyak request. Coba lagi dalam 1 menit.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => req.path.startsWith('/auth/'), // FIX #3
});
app.use('/api/', limiter);

// ── AUTH ROUTES ───────────────────────────────────────────────
if (authRouter) app.use('/auth', authRouter);

app.get('/api/me', (req, res) => {
  if (!req.isAuthenticated?.()) return res.status(401).json({ authenticated: false });
  const { id, display_name, email, avatar_url, provider, created_at, last_login } = req.user;
  res.json({ authenticated: true, user: { id, display_name, email, avatar_url, provider, created_at, last_login } });
});

// ── FIX #4: Block sensitive paths before static serving ──────
app.use((req, res, next) => {
  const blocked = ['/config', '/data', '/auth.js', '/db.js', '/.env'];
  if (blocked.some(b => req.path === b || req.path.startsWith(b + '/'))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

app.use(express.static(__dirname, { index: 'index.html', maxAge: IS_DEV ? 0 : '1d', dotfiles: 'deny' }));

// ─────────────────────────────────────────────────────────────
//  API ROUTES
// ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok', version: '3.0.0', name: 'Necrosis AI Server',
    timestamp: new Date().toISOString(),
    providers: AIEngine.getAvailableProviders(),
    agents:    AgentRouter.getAgentList(),
    memory:    Memory.getGlobalStats(),
    auth:      !!authRouter,
  });
});

app.get('/api/models', (req, res) => {
  res.json({ models: AIEngine.getModelList(), providers: AIEngine.getAvailableProviders() });
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId = uuidv4(), mode = 'necrosis_ai', modelAlias = '1.5-Beta',
          responseStyle = 'friendly', customPrompt = '', language = 'id', userName = 'User' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message diperlukan.' });
  const sid  = req.user?.id ? `user_${req.user.id}_${sessionId}` : sessionId;
  const name = req.user?.display_name || userName;
  try {
    const result = await AgentRouter.route({ sessionId: sid, message: message.trim(), mode, modelAlias, responseStyle, customPrompt, language, userName: name, stream: false });
    res.json({ success: true, sessionId: sid, ...result });
  } catch (err) {
    console.error('[/api/chat]', err.message);
    res.status(500).json({ error: err.message || 'Gagal memproses chat.' });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId = uuidv4(), mode = 'necrosis_ai', modelAlias = '1.5-Beta',
          responseStyle = 'friendly', customPrompt = '', language = 'id', userName = 'User' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message diperlukan.' });
  const sid  = req.user?.id ? `user_${req.user.id}_${sessionId}` : sessionId;
  const name = req.user?.display_name || userName;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {} };
  const ac   = new AbortController();
  req.on('close', () => ac.abort());

  try {
    send('meta', { sessionId: sid, status: 'start' });
    let fullText = '';
    const result = await AgentRouter.route({
      sessionId: sid, message: message.trim(), mode, modelAlias, responseStyle, customPrompt, language, userName: name,
      stream: true, signal: ac.signal,
      onChunk: (chunk) => { fullText += chunk; send('chunk', { text: chunk }); },
    });
    send('done', { text: result.text || fullText, agent: result.agent, agentName: result.agentName, extra: result.extra });
  } catch (err) {
    if (!ac.signal.aborted) send('error', { message: err.message });
  } finally {
    res.end();
  }
});

app.post('/api/title', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message diperlukan.' });
  try { res.json({ title: await AgentRouter.generateTitle(message) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/optimize-prompt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt diperlukan.' });
  try { res.json({ optimized: await AgentRouter.optimizePrompt(prompt) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/summarize', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan.' });
  try {
    const msgs = Memory.getMessagesForSummarization(sessionId);
    const prompt = AIEngine.buildSummarizationPrompt(msgs);
    const { text } = await AIEngine.callAI([{ role: 'user', content: prompt }], { modelAlias: 'N1.0-F', maxTokens: 400, temperature: 0.3 });
    Memory.applySummarization(sessionId, text);
    res.json({ summary: text });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/memory/:sessionId', (req, res) => res.json(Memory.getMemoryStats(req.params.sessionId)));

app.delete('/api/memory/:sessionId', (req, res) => {
  Memory.clearSession(req.params.sessionId);
  res.json({ success: true, message: 'Memory cleared.' });
});

app.post('/api/memory/export', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan.' });
  const text = Memory.exportAsText(sessionId);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="necrosis-chat-${sessionId}.txt"`);
  res.send(text);
});

app.post('/api/memory/update', (req, res) => {
  const { sessionId, ...updates } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId diperlukan.' });
  Memory.updateSessionMeta(sessionId, updates);
  res.json({ success: true });
});

app.post('/api/search/messages', (req, res) => {
  const { sessionId, keyword } = req.body;
  if (!sessionId || !keyword) return res.status(400).json({ error: 'sessionId & keyword diperlukan.' });
  res.json({ results: Memory.searchMessages(sessionId, keyword) });
});

// FIX #5: Catch-all LAST — after all API routes, skip /auth
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// FIX #6: Error handler — 4 params required by Express
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({ error: IS_DEV ? err.message : 'Internal server error.' });
});

// ─────────────────────────────────────────────────────────────
//  WEBSOCKET
// ─────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  ws.send(JSON.stringify({ type: 'connected', sessionId }));

  ws.on('message', async (raw) => {
    let data;
    try { data = JSON.parse(raw); }
    catch { ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' })); return; }

    if (data.type === 'chat') {
      const { message, mode = 'necrosis_ai', modelAlias = '1.5-Beta', responseStyle = 'friendly',
              customPrompt = '', language = 'id', userName = 'User' } = data;
      if (!message?.trim()) { ws.send(JSON.stringify({ type: 'error', message: 'Message kosong.' })); return; }

      const sid = data.sessionId || sessionId;
      const ac  = new AbortController();

      // FIX #7: Use .once to avoid duplicate listeners / memory leak
      const onClose = () => { ac.abort(); };
      ws.once('close', onClose);

      try {
        ws.send(JSON.stringify({ type: 'start', sessionId: sid }));
        await AgentRouter.route({
          sessionId: sid, message: message.trim(), mode, modelAlias, responseStyle,
          customPrompt, language, userName, stream: true, signal: ac.signal,
          onChunk: (chunk) => {
            if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'chunk', text: chunk }));
          },
        });
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'done', sessionId: sid }));
      } catch (err) {
        if (!ac.signal.aborted && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'error', message: err.message }));
      } finally {
        ws.removeListener('close', onClose);
      }
    }

    if (data.type === 'clear_memory') {
      Memory.clearSession(data.sessionId || sessionId);
      ws.send(JSON.stringify({ type: 'memory_cleared' }));
    }
  });

  ws.on('error', (err) => console.error('[WS] Error:', err.message));
  ws.on('close', () => console.log(`[WS] Closed: ${sessionId}`));
});

// ─────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  const pad = s => String(s).padEnd(5);
  console.log(`
╔══════════════════════════════════════════════════════╗
║         🔥  NECROSIS AI SERVER v3.0  🔥              ║
╠══════════════════════════════════════════════════════╣
║  HTTP   → http://localhost:${pad(PORT)}                     ║
║  WS     → ws://localhost:${pad(PORT)}                     ║
║  Mode   → ${IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION '}                            ║
║  Auth   → ${authRouter ? 'OAuth AKTIF (Google/FB/Twitter) ' : 'Disabled (npm install dulu)'}  ║
║  Login  → http://localhost:${pad(PORT)}/login.html            ║
╚══════════════════════════════════════════════════════╝`);
});

// FIX #8: Global crash guards
process.on('uncaughtException',  (err) => console.error('[Server] 💥 Uncaught:', err.message));
process.on('unhandledRejection', (r)   => console.error('[Server] 💥 Unhandled:', r));

const gracefulShutdown = () => {
  console.log('\n[Server] 🛑 Shutting down...');
  Memory.stopAutoCleanup();
  wss.close();
  server.close(() => { console.log('[Server] ✅ Done'); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT',  gracefulShutdown);

module.exports = { app, server };
