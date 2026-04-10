// ============================================================
//  NECROSIS AI — AI ENGINE v3.0 (ai-engine.js)
//  FIXED BUGS:
//  #1 node-fetch race condition (lazy singleton)
//  #2 TextDecoder re-imported inside hot stream loop
//  #3 HuggingFace streaming not handled (no graceful fallback)
//  #4 HuggingFace streaming fallback for HF format
//  #5 Gemini streaming properly chunked
// ============================================================

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config', 'env') });

// FIX #1: node-fetch singleton — no race condition, no repeated dynamic imports
let _fetchFn = null;
let _fetchPromise = null;

async function getFetch() {
  if (_fetchFn) return _fetchFn;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = import('node-fetch')
    .then(m => {
      _fetchFn = m.default;
      return _fetchFn;
    })
    .catch(err => {
      console.error('[AI-Engine] ❌ Failed to load node-fetch:', err.message);
      throw new Error('node-fetch initialization failed');
    });
  return _fetchPromise;
}

const fetch = (...args) => getFetch().then(f => f(...args)).catch(err => {
  console.error('[AI-Engine] ❌ Fetch error:', err);
  throw err;
});

// FIX #2: TextDecoder hoisted at module level — not inside hot loop
const { TextDecoder } = require('util');
const _decoder = new TextDecoder();

// ── PROVIDER CONFIG ───────────────────────────────────────────
const PROVIDERS = {
  groq: {
    name: 'Groq', format: 'openai',
    url:    process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    key:    process.env.GROQ_API_KEY || '',
    models: {
      default: process.env.GROQ_MODEL_DEFAULT || 'llama-3.3-70b-versatile',
      fast:    process.env.GROQ_MODEL_FAST    || 'llama3-8b-8192',
      pro:     process.env.GROQ_MODEL_PRO     || 'llama-3.1-70b-versatile',
    },
    enabled: () => !!process.env.GROQ_API_KEY,
  },
  gemini: {
    name: 'Gemini', format: 'gemini',
    url:    process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
    key:    process.env.GEMINI_API_KEY || '',
    models: { default: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite' },
    enabled: () => !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('your'),
  },
  cerebras: {
    name: 'Cerebras', format: 'openai',
    url:    process.env.CEREBRAS_API_URL || 'https://api.cerebras.ai/v1/chat/completions',
    key:    process.env.CEREBRAS_API_KEY || '',
    models: { default: process.env.CEREBRAS_MODEL || 'llama-3.3-70b' },
    enabled: () => !!process.env.CEREBRAS_API_KEY && !process.env.CEREBRAS_API_KEY.startsWith('your'),
  },
  mistral: {
    name: 'Mistral AI', format: 'openai',
    url:    process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions',
    key:    process.env.MISTRAL_API_KEY || '',
    models: { default: process.env.MISTRAL_MODEL || 'mistral-small-latest' },
    enabled: () => !!process.env.MISTRAL_API_KEY && !process.env.MISTRAL_API_KEY.startsWith('your'),
  },
  openrouter: {
    name: 'OpenRouter', format: 'openrouter',
    url:     process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    key:     process.env.OPENROUTER_API_KEY || '',
    referer: process.env.OPENROUTER_REFERER || 'https://necrosis-ai.vercel.app',
    models: {
      default: process.env.OPENROUTER_MODEL     || 'meta-llama/llama-3.1-8b-instruct:free',
      pro:     process.env.OPENROUTER_MODEL_PRO || 'deepseek/deepseek-chat-v3-0324:free',
    },
    enabled: () => !!process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your'),
  },
  sambanova: {
    name: 'SambaNova', format: 'openai',
    url:    process.env.SAMBANOVA_API_URL || 'https://api.sambanova.ai/v1/chat/completions',
    key:    process.env.SAMBANOVA_API_KEY || '',
    models: { default: process.env.SAMBANOVA_MODEL || 'Meta-Llama-3.3-70B-Instruct' },
    enabled: () => !!process.env.SAMBANOVA_API_KEY && !process.env.SAMBANOVA_API_KEY.startsWith('your'),
  },
  nvidia: {
    name: 'NVIDIA NIM', format: 'openai',
    url:    process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
    key:    process.env.NVIDIA_API_KEY || '',
    models: { default: process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct' },
    enabled: () => !!process.env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY.startsWith('your'),
  },
  huggingface: {
    name: 'HuggingFace', format: 'huggingface',
    url:    process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models',
    key:    process.env.HUGGINGFACE_API_KEY || '',
    models: { default: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.3-70B-Instruct' },
    enabled: () => !!process.env.HUGGINGFACE_API_KEY && !process.env.HUGGINGFACE_API_KEY.startsWith('your'),
  },
};

const MODEL_MAP = {
  '1.5-Beta':     { provider: 'groq',        model: 'default' },
  'N1.0-F':       { provider: 'groq',        model: 'fast'    },
  'N2.0-Pro':     { provider: 'groq',        model: 'pro'     },
  'gemini-flash': { provider: 'gemini',      model: 'default' },
  'cerebras':     { provider: 'cerebras',    model: 'default' },
  'mistral':      { provider: 'mistral',     model: 'default' },
  'openrouter':   { provider: 'openrouter',  model: 'default' },
  'sambanova':    { provider: 'sambanova',   model: 'default' },
  'nvidia':       { provider: 'nvidia',      model: 'default' },
  'huggingface':  { provider: 'huggingface', model: 'default' },
};

const FALLBACK_ORDER = ['groq','gemini','cerebras','mistral','openrouter','sambanova','nvidia','huggingface'];

// ─────────────────────────────────────────────────────────────
// CALL AI (non-streaming, with fallback)
// ─────────────────────────────────────────────────────────────

async function callAI(messages, opts = {}) {
  const { modelAlias = '1.5-Beta', provider: forceProvider, maxTokens = 4096, temperature = 0.7, signal } = opts;
  // FIX #9: Validate modelAlias exists in MODEL_MAP, fallback to default
  if (!MODEL_MAP[modelAlias]) {
    console.warn(`[AI-Engine] ⚠️ Unknown modelAlias "${modelAlias}", using fallback "1.5-Beta"`);
  }
  const resolved       = MODEL_MAP[modelAlias] || MODEL_MAP['1.5-Beta'];
  if (!resolved || !PROVIDERS[resolved.provider]) {
    throw new Error(`Invalid model configuration: provider "${resolved?.provider}" not found`);
  }
  const primaryProvider = forceProvider || resolved.provider;
  const order = [primaryProvider, ...FALLBACK_ORDER.filter(p => p !== primaryProvider)]
    .filter(p => PROVIDERS[p]?.enabled());

  let lastError;
  for (const provName of order) {
    const prov     = PROVIDERS[provName];
    const modelKey = (provName === resolved.provider) ? resolved.model : 'default';
    const modelId  = prov.models[modelKey] || prov.models.default;
    try {
      const result = await _callProvider(prov, modelId, messages, { maxTokens, temperature, signal });
      return { ...result, provider: provName, model: modelId };
    } catch (err) {
      console.error(`[AI-Engine] ❌ ${prov.name} failed: ${err.message}`);
      lastError = err;
      if (signal?.aborted) throw err;
    }
  }
  throw lastError || new Error('All AI providers failed.');
}

// ─────────────────────────────────────────────────────────────
// STREAM AI (streaming, with fallback)
// ─────────────────────────────────────────────────────────────

async function streamAI(messages, opts = {}) {
  const { modelAlias = '1.5-Beta', provider: forceProvider, maxTokens = 4096, temperature = 0.7, signal, onChunk, onDone, onError } = opts;
  const resolved        = MODEL_MAP[modelAlias] || MODEL_MAP['1.5-Beta'];
  const primaryProvider = forceProvider || resolved.provider;
  const order = [primaryProvider, ...FALLBACK_ORDER.filter(p => p !== primaryProvider)]
    .filter(p => PROVIDERS[p]?.enabled());

  let lastError;
  for (const provName of order) {
    const prov     = PROVIDERS[provName];
    const modelKey = (provName === resolved.provider) ? resolved.model : 'default';
    const modelId  = prov.models[modelKey] || prov.models.default;
    try {
      await _streamProvider(prov, modelId, messages, { maxTokens, temperature, signal, onChunk, onDone });
      return;
    } catch (err) {
      console.error(`[AI-Engine] ❌ Stream ${prov.name} failed: ${err.message}`);
      lastError = err;
      if (signal?.aborted) throw err;
    }
  }
  const e = lastError || new Error('All streaming providers failed.');
  if (onError) onError(e); else throw e;
}

// ─────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────

function buildSystemPrompt(opts = {}) {
  const { mode = 'necrosis_ai', responseStyle = 'friendly', userName = 'User', customPrompt = '', language = 'id' } = opts;
  const BASE = `Kamu adalah Necrosis AI, asisten AI canggih yang dibangun oleh RajaStarboy. ` +
    `Nama user saat ini adalah ${userName}. ` +
    `Kamu berbicara dalam bahasa ${language === 'en' ? 'Inggris' : 'Indonesia'} kecuali diminta berbeda. ` +
    `Tanggal saat ini: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

  const MODES = {
    necrosis_ai: BASE + ` Kamu adalah asisten AI serbaguna yang cerdas, membantu, dan handal.`,
    programmer:  BASE + ` Kamu adalah expert programmer. Selalu berikan kode yang bersih, efisien, dan diberi komentar. Gunakan markdown code blocks.`,
    thinking:    BASE + ` Kamu adalah AI dengan kemampuan reasoning mendalam. Analisis masalah step-by-step dengan <thinking> tags sebelum menjawab.`,
    search:      BASE + ` Kamu adalah AI research assistant. Berikan informasi akurat, terstruktur, dan sertakan referensi bila memungkinkan.`,
    curhat:      BASE + ` Kamu adalah teman bicara yang empatik dan hangat. Dengarkan dengan sabar, validasi perasaan, dan berikan dukungan.`,
    createimg:   BASE + ` Kamu adalah AI image prompt engineer. Bantu user membuat deskripsi gambar yang detail dan kreatif.`,
  };
  const STYLES = {
    friendly:     `Gunakan bahasa santai, ramah, dan sering pakai emoji yang relevan. 😊`,
    professional: `Gunakan bahasa formal dan profesional. Hindari slang atau emoji berlebihan.`,
    hacker:       `Gunakan bahasa gaul hacker: "bro", "gas", "woi", emoji skull. Tetap helpful tapi dengan gaya badass.`,
    poet:         `Gunakan bahasa yang puitis, metaforis, dan penuh perasaan namun tetap informatif.`,
    anime:        `Gunakan gaya bicara anime/moe: "nyan~", ">_<", "desu", panggil user dengan "-kun/-chan". Tetap helpful.`,
  };
  let prompt = MODES[mode] || MODES.necrosis_ai;
  prompt += ' ' + (STYLES[responseStyle] || STYLES.friendly);
  if (customPrompt?.trim()) prompt += `\n\n[CUSTOM INSTRUKSI DARI USER]\n${customPrompt.trim()}`;
  return prompt;
}

function buildSummarizationPrompt(messages) {
  const convo = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n\n');
  return `Buat ringkasan singkat (max 200 kata) dari percakapan berikut. Fokus pada topik utama, keputusan, dan informasi penting:\n\n${convo}`;
}

function buildTitlePrompt(firstUserMessage) {
  return `Buatkan judul percakapan singkat (max 5 kata) untuk chat yang dimulai dengan: "${firstUserMessage.slice(0, 200)}". Hanya output judulnya saja, tanpa tanda kutip atau penjelasan.`;
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: PROVIDER CALLERS
// ─────────────────────────────────────────────────────────────

async function _callProvider(prov, modelId, messages, { maxTokens, temperature, signal }) {
  if (prov.format === 'gemini')      return _callGemini(prov, modelId, messages, { maxTokens, temperature, signal });
  if (prov.format === 'huggingface') return _callHuggingFace(prov, modelId, messages, { maxTokens, temperature, signal });

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${prov.key}`,
  };
  if (prov.format === 'openrouter') {
    headers['HTTP-Referer'] = prov.referer || 'https://necrosis-ai.vercel.app';
    headers['X-Title']      = 'Necrosis AI';
  }
  const res = await fetch(prov.url, {
    method: 'POST', headers, signal,
    body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`${prov.name} HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || '', usage: data.usage || {} };
}

async function _callHuggingFace(prov, modelId, messages, { maxTokens, temperature, signal }) {
  const url    = `${prov.url.replace(/\/$/, '')}/${modelId}`;
  const prompt = messages.map(m =>
    (m.role === 'system' ? '[SYS] ' : m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content
  ).join('\n') + '\nAssistant:';

  const res = await fetch(url, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${prov.key}` },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: maxTokens, temperature, return_full_text: false } }),
  });
  if (!res.ok) throw new Error(`HuggingFace HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json();
  const raw  = Array.isArray(data) ? (data[0]?.generated_text || '') : (data.generated_text || '');
  // FIX #3: strip echoed prompt if return_full_text accidentally came back true
  const text = raw.startsWith(prompt) ? raw.slice(prompt.length).trim() : raw.trim();
  return { text, usage: {} };
}

async function _callGemini(prov, modelId, messages, { maxTokens, temperature, signal }) {
  const contents = [];
  let systemInstruction = null;
  for (const m of messages) {
    if (m.role === 'system') { systemInstruction = { parts: [{ text: m.content }] }; }
    else { contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }); }
  }
  const url  = `${prov.url}/${modelId}:generateContent?key=${prov.key}`;
  const body = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature } };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json();
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', usage: {} };
}

async function _streamProvider(prov, modelId, messages, { maxTokens, temperature, signal, onChunk, onDone }) {
  // FIX #4: Gemini & HuggingFace don't support SSE streaming — fall back to non-stream
  if (prov.format === 'gemini' || prov.format === 'huggingface') {
    const { text } = await _callProvider(prov, modelId, messages, { maxTokens, temperature, signal });
    if (onChunk) onChunk(text);
    if (onDone)  onDone(text);
    return;
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${prov.key}` };
  if (prov.format === 'openrouter') {
    headers['HTTP-Referer'] = prov.referer || 'https://necrosis-ai.vercel.app';
    headers['X-Title']      = 'Necrosis AI';
  }

  const res = await fetch(prov.url, {
    method: 'POST', headers, signal,
    body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature, stream: true }),
  });
  if (!res.ok) throw new Error(`${prov.name} HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);

  let fullText = '';
  // FIX #2: Use module-level decoder + buffer
  let buf = '';

  try {
    const reader = res.body.getReader();
    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        // FIX #5: Use shared decoder — stream:true keeps state properly
        buf += _decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';  // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const chunk = line.slice(6).trim();
          if (chunk === '[DONE]') continue;
          try {
            const parsed = JSON.parse(chunk);
            const delta  = parsed.choices?.[0]?.delta?.content || '';
            if (delta) { fullText += delta; if (onChunk) onChunk(delta); }
          } catch { /* ignore malformed SSE lines */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    if (!signal?.aborted) throw err;
  }

  if (onDone) onDone(fullText);
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

function estimateTokens(text) { return Math.ceil(text.length / 4); }

function getAvailableProviders() {
  return FALLBACK_ORDER
    .filter(p => PROVIDERS[p]?.enabled())
    .map(p => ({ name: PROVIDERS[p].name, id: p, models: PROVIDERS[p].models }));
}

function getModelList() {
  return Object.entries(MODEL_MAP).map(([alias, { provider, model }]) => ({
    alias, provider,
    modelId: PROVIDERS[provider]?.models?.[model] || 'unknown',
  }));
}

module.exports = { callAI, streamAI, buildSystemPrompt, buildSummarizationPrompt, buildTitlePrompt, estimateTokens, getAvailableProviders, getModelList };
