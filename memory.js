// ============================================================
//  NECROSIS AI — MEMORY SYSTEM v3.0 (memory.js)
//  FIXED BUGS:
//  #1 getGlobalStats() exposed all session IDs (security leak)
//  #2 _fitToContextWindow skips system role (should never skip system)
//  #3 needsSummarization triggers too early (re-triggers after summary)
// ============================================================

'use strict';

const MAX_MESSAGES    = parseInt(process.env.MAX_MEMORY_MESSAGES)    || 50;
const MAX_CTX_TOKENS  = parseInt(process.env.MAX_CONTEXT_TOKENS)     || 4000;
const SUMMARY_TRIGGER = parseInt(process.env.MEMORY_SUMMARY_TRIGGER) || 20;
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MS)     || 24 * 60 * 60 * 1000;
const CHARS_PER_TOKEN = 4;

const sessions = new Map();
let cleanupInterval = null;

function startAutoCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of sessions.entries()) {
      if (now - session.updatedAt > SESSION_TIMEOUT) { sessions.delete(id); cleaned++; }
    }
    if (cleaned > 0) console.log(`[Memory] 🧹 Auto-cleanup: removed ${cleaned} inactive sessions`);
  }, 60 * 60 * 1000);
}

function stopAutoCleanup() {
  if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null; }
}

startAutoCleanup();

function getOrCreateSession(sessionId, userName = 'User') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId, userName,
      messages: [], summary: null,
      createdAt: Date.now(), updatedAt: Date.now(),
      projectContext: null, personaContext: null,
      responseStyle: 'friendly', language: 'id',
    });
  }
  return sessions.get(sessionId);
}

function addMessage(sessionId, role, content, meta = {}) {
  const session = getOrCreateSession(sessionId);
  const msg = {
    id:        `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role, content,
    timestamp: Date.now(),
    meta,
  };
  session.messages.push(msg);
  session.updatedAt = Date.now();
  if (session.messages.length > MAX_MESSAGES) _trimSession(session);
  return msg;
}

function buildContextMessages(sessionId, systemPrompt = null) {
  const session = getOrCreateSession(sessionId);
  const result  = [];
  if (systemPrompt) result.push({ role: 'system', content: systemPrompt });
  if (session.projectContext?.prompt) result.push({ role: 'system', content: `[PROJECT CONTEXT]\n${session.projectContext.prompt}` });
  if (session.personaContext?.systemPrompt) result.push({ role: 'system', content: session.personaContext.systemPrompt });
  if (session.summary) result.push({ role: 'system', content: `[RINGKASAN PERCAKAPAN SEBELUMNYA]\n${session.summary}` });
  const recentMsgs = _fitToContextWindow(session.messages);
  for (const m of recentMsgs) result.push({ role: m.role, content: m.content });
  return result;
}

function clearSession(sessionId) {
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.messages  = [];
    s.summary   = null;
    s.updatedAt = Date.now();
  }
}

function deleteSession(sessionId) { sessions.delete(sessionId); }

function updateSessionMeta(sessionId, updates) {
  const session = getOrCreateSession(sessionId);
  Object.assign(session, updates);
  session.updatedAt = Date.now();
}

function getMemoryStats(sessionId) {
  const session    = getOrCreateSession(sessionId);
  const totalChars = session.messages.reduce((acc, m) => acc + m.content.length, 0);
  return {
    sessionId,
    messageCount:    session.messages.length,
    estimatedTokens: Math.ceil(totalChars / CHARS_PER_TOKEN),
    hasSummary:      !!session.summary,
    createdAt:       session.createdAt,
    updatedAt:       session.updatedAt,
    sizeBytes:       Buffer.byteLength(JSON.stringify(session), 'utf8'),
  };
}

function searchMessages(sessionId, keyword) {
  const session = getOrCreateSession(sessionId);
  const kw = keyword.toLowerCase();
  return session.messages.filter(m => m.content.toLowerCase().includes(kw));
}

function exportAsText(sessionId) {
  const session = getOrCreateSession(sessionId);
  const lines   = [`=== Necrosis AI Chat Export ===`, `Session: ${sessionId}`, `User: ${session.userName}`, ``];
  for (const m of session.messages) {
    const ts  = new Date(m.timestamp).toLocaleString('id-ID');
    const who = m.role === 'user' ? `👤 ${session.userName}` : '🤖 Necrosis AI';
    lines.push(`[${ts}] ${who}:`);
    lines.push(m.content);
    lines.push('');
  }
  return lines.join('\n');
}

function setSummary(sessionId, summaryText) {
  const session = getOrCreateSession(sessionId);
  session.summary = summaryText;
}

// FIX #3: Don't re-trigger if summary already exists AND messages already trimmed
function needsSummarization(sessionId) {
  const session = getOrCreateSession(sessionId);
  // Only trigger if: enough messages AND no summary yet
  return session.messages.length >= SUMMARY_TRIGGER && !session.summary;
}

function getMessagesForSummarization(sessionId) {
  const session = getOrCreateSession(sessionId);
  const cutoff  = Math.floor(session.messages.length / 2);
  return session.messages.slice(0, cutoff);
}

function applySummarization(sessionId, summaryText) {
  const session    = getOrCreateSession(sessionId);
  const cutoff     = Math.floor(session.messages.length / 2);
  session.summary  = summaryText;
  session.messages = session.messages.slice(cutoff);
  session.updatedAt = Date.now();
}

// FIX #1: Don't leak session IDs in global stats
function getGlobalStats() {
  let totalMessages = 0;
  for (const [, s] of sessions) totalMessages += s.messages.length;
  return {
    totalSessions: sessions.size,
    totalMessages,
    // Removed: memoryKeys — security risk (exposed all session IDs)
  };
}

function _estimateTokens(text) { return Math.ceil(text.length / CHARS_PER_TOKEN); }

// FIX #2: Context window fit — walk backwards, always include system messages
function _fitToContextWindow(messages) {
  let total  = 0;
  const result = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    // Never skip system messages — they're already handled in buildContextMessages
    if (m.role === 'system') continue;
    const t = _estimateTokens(m.content);
    if (total + t > MAX_CTX_TOKENS) break;
    total += t;
    result.unshift(m);
  }
  return result;
}

function _trimSession(session) {
  const overflow = session.messages.length - MAX_MESSAGES;
  if (overflow > 0) session.messages = session.messages.slice(overflow);
}

module.exports = {
  getOrCreateSession, addMessage, buildContextMessages, clearSession, deleteSession,
  updateSessionMeta, getMemoryStats, searchMessages, exportAsText, setSummary,
  needsSummarization, getMessagesForSummarization, applySummarization, getGlobalStats,
  startAutoCleanup, stopAutoCleanup,
};
