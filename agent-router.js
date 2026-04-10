// ============================================================
//  NECROSIS AI — AGENT ROUTER (agent-router.js)
//  Routes user requests ke agent yang paling tepat,
//  handle pre/post processing, tool calls, special modes
// ============================================================

'use strict';

const AIEngine = require('./ai-engine');
const Memory   = require('./memory');

// ── AGENT DEFINITIONS ─────────────────────────────────────────
const AGENTS = {

  // ── GENERAL ASSISTANT ──────────────────────────────────────
  necrosis_ai: {
    id:          'necrosis_ai',
    name:        'Necrosis AI',
    icon:        '🤖',
    description: 'General purpose AI assistant',
    modelAlias:  '1.5-Beta',
    maxTokens:   4096,
    temperature: 0.75,
    // Keyword patterns yang trigger agent ini
    patterns:    [],  // default catch-all
    preProcess:  null,
    postProcess: null,
  },

  // ── PROGRAMMER AGENT ───────────────────────────────────────
  programmer: {
    id:          'programmer',
    name:        'Code Expert',
    icon:        '💻',
    description: 'Code generation, debugging, review',
    modelAlias:  'N2.0-Pro',
    maxTokens:   8192,
    temperature: 0.3, // lower = more deterministic for code
    patterns:    [
      /\b(kode|code|bug|error|debug|function|class|api|script|program|javascript|python|java|php|css|html|sql|bash|terminal|git|npm|node)\b/i,
      /```[\s\S]*```/,
    ],
    preProcess:  _codeAgentPreProcess,
    postProcess: _codeAgentPostProcess,
  },

  // ── THINKING / REASONING AGENT ─────────────────────────────
  thinking: {
    id:          'thinking',
    name:        'Deep Thinker',
    icon:        '🧠',
    description: 'Step-by-step reasoning and analysis',
    modelAlias:  'N2.0-Pro',
    maxTokens:   6144,
    temperature: 0.5,
    patterns:    [
      /\b(analisis|analisa|analyze|explain|jelaskan|kenapa|mengapa|why|how|bagaimana|compare|bandingkan|pros cons|kelebihan|kekurangan|strategi)\b/i,
    ],
    preProcess:  _thinkingAgentPreProcess,
    postProcess: null,
  },

  // ── SEARCH / RESEARCH AGENT ────────────────────────────────
  search: {
    id:          'search',
    name:        'Research Agent',
    icon:        '🔍',
    description: 'Information search and research',
    modelAlias:  '1.5-Beta',
    maxTokens:   4096,
    temperature: 0.4,
    patterns:    [
      /\b(cari|search|berita|news|terbaru|latest|update|info|informasi|siapa|apa itu|what is|who is|kapan|when|dimana|where)\b/i,
    ],
    preProcess:  _searchAgentPreProcess,
    postProcess: _searchAgentPostProcess,
  },

  // ── CURHAT / EMOTIONAL SUPPORT AGENT ──────────────────────
  curhat: {
    id:          'curhat',
    name:        'Empathy AI',
    icon:        '💙',
    description: 'Emotional support and companionship',
    modelAlias:  '1.5-Beta',
    maxTokens:   2048,
    temperature: 0.85,
    patterns:    [
      /\b(curhat|galau|sedih|stress|bosan|kesepian|ngerasa|perasaan|cerita|cerita|suka|cinta|broken heart|putus|kehilangan)\b/i,
    ],
    preProcess:  null,
    postProcess: null,
  },

  // ── IMAGE GENERATOR AGENT ──────────────────────────────────
  createimg: {
    id:          'createimg',
    name:        'Image Creator',
    icon:        '🎨',
    description: 'AI image generation',
    modelAlias:  '1.5-Beta',
    maxTokens:   512,
    temperature: 0.9,
    patterns:    [
      /\b(gambar|image|foto|photo|buat gambar|generate image|create image|ilustrasi|portrait|landscape|anime|realistic)\b/i,
    ],
    preProcess:  _imageAgentPreProcess,
    postProcess: _imageAgentPostProcess,
  },

  // ── SUMMARIZER AGENT ───────────────────────────────────────
  summarizer: {
    id:          'summarizer',
    name:        'Summarizer',
    icon:        '📝',
    description: 'Summarize text or conversation',
    modelAlias:  'N1.0-F',
    maxTokens:   1024,
    temperature: 0.3,
    patterns:    [
      /\b(ringkas|summarize|summary|singkat|tldr|TL;DR)\b/i,
    ],
    preProcess:  null,
    postProcess: null,
  },

  // ── TRANSLATOR AGENT ───────────────────────────────────────
  translator: {
    id:          'translator',
    name:        'Translator',
    icon:        '🌐',
    description: 'Multi-language translation',
    modelAlias:  'N1.0-F',
    maxTokens:   2048,
    temperature: 0.2,
    patterns:    [
      /\b(terjemahkan|translate|translation|bahasa inggris|english|bahasa indonesia|japanese|korean|arabic|french|spanish)\b/i,
    ],
    preProcess:  null,
    postProcess: null,
  },
};

// ─────────────────────────────────────────────────────────────
// ROUTER — MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────

/**
 * Route request ke agent yang tepat dan proses.
 * @param {Object} req
 * @param {string}   req.sessionId
 * @param {string}   req.message       – pesan user
 * @param {string}   [req.mode]        – mode yang dipilih user
 * @param {string}   [req.modelAlias]
 * @param {string}   [req.responseStyle]
 * @param {string}   [req.customPrompt]
 * @param {string}   [req.language]
 * @param {string}   [req.userName]
 * @param {boolean}  [req.stream]
 * @param {Function} [req.onChunk]     – streaming callback
 * @param {AbortSignal} [req.signal]
 * @returns {Promise<RouterResult>}
 */
async function route(req) {
  const {
    sessionId,
    message,
    mode,
    modelAlias,
    responseStyle = 'friendly',
    customPrompt  = '',
    language      = 'id',
    userName      = 'User',
    stream        = false,
    onChunk,
    signal,
  } = req;

  // ── 1. Resolve Agent ──────────────────────────────────────
  const agent = _resolveAgent(message, mode);

  // ── 2. Add user message to memory ────────────────────────
  Memory.addMessage(sessionId, 'user', message, { mode, agent: agent.id });

  // ── 3. Build system prompt ────────────────────────────────
  const systemPrompt = AIEngine.buildSystemPrompt({
    mode:          agent.id,
    responseStyle,
    userName,
    customPrompt,
    language,
  });

  // ── 4. Pre-process ────────────────────────────────────────
  let processedMessage = message;
  let agentContext     = {};
  if (agent.preProcess) {
    const pre = await agent.preProcess(message, req);
    processedMessage = pre.message || message;
    agentContext     = pre.context || {};
  }

  // ── 5. Build context (memory) ─────────────────────────────
  // Temporarily add processed message as last user msg
  const contextMsgs = Memory.buildContextMessages(sessionId, systemPrompt);
  // FIX #6: Replace last user message if pre-processed (more reliable logic)
  if (processedMessage !== message && contextMsgs.length > 0) {
    // Find the last user message from the end (iterate backwards)
    let replaced = false;
    for (let i = contextMsgs.length - 1; i >= 0; i--) {
      if (contextMsgs[i].role === 'user') {
        contextMsgs[i].content = processedMessage;
        replaced = true;
        break;
      }
    }
    if (!replaced && contextMsgs.length > 0) {
      // If no user message found (shouldn't happen), append as user
      contextMsgs.push({ role: 'user', content: processedMessage });
    }
  }

  // ── 6. Call AI ────────────────────────────────────────────
  const effectiveModel = modelAlias || agent.modelAlias;
  let responseText     = '';

  if (stream && onChunk) {
    await AIEngine.streamAI(contextMsgs, {
      modelAlias:  effectiveModel,
      maxTokens:   agent.maxTokens,
      temperature: agent.temperature,
      signal,
      onChunk,
      onDone: (full) => { responseText = full; },
    });
  } else {
    const result = await AIEngine.callAI(contextMsgs, {
      modelAlias:  effectiveModel,
      maxTokens:   agent.maxTokens,
      temperature: agent.temperature,
      signal,
    });
    responseText = result.text;
  }

  // ── 7. Post-process ───────────────────────────────────────
  let finalResponse = responseText;
  let extra         = {};
  if (agent.postProcess) {
    const post = await agent.postProcess(responseText, message, agentContext);
    finalResponse = post.text    || responseText;
    extra         = post.extra   || {};
  }

  // ── 8. Save AI response to memory ────────────────────────
  Memory.addMessage(sessionId, 'assistant', finalResponse, {
    agent: agent.id,
    model: effectiveModel,
  });

  // ── 9. Auto-summarize if needed ───────────────────────────
  if (Memory.needsSummarization(sessionId)) {
    _autoSummarize(sessionId).catch(e =>
      console.error('[Router] Auto-summarize failed:', e.message)
    );
  }

  return {
    text:      finalResponse,
    agent:     agent.id,
    agentName: agent.name,
    agentIcon: agent.icon,
    model:     effectiveModel,
    extra,
  };
}

// ─────────────────────────────────────────────────────────────
// AGENT RESOLVER
// ─────────────────────────────────────────────────────────────

function _resolveAgent(message, forcedMode) {
  // If mode explicitly set by user — use it
  if (forcedMode && AGENTS[forcedMode]) {
    return AGENTS[forcedMode];
  }

  // Auto-detect based on patterns
  for (const [id, agent] of Object.entries(AGENTS)) {
    if (!agent.patterns || agent.patterns.length === 0) continue;
    for (const pattern of agent.patterns) {
      if (pattern.test(message)) {
        return agent;
      }
    }
  }

  // Default
  return AGENTS.necrosis_ai;
}

// ─────────────────────────────────────────────────────────────
// PRE/POST PROCESSORS
// ─────────────────────────────────────────────────────────────

async function _codeAgentPreProcess(message) {
  // Inject code quality instructions
  return {
    message: message + '\n\n[INSTRUKSI CODE]: Selalu berikan kode yang lengkap, beri komentar pada bagian penting, dan jelaskan cara penggunaan.',
    context: { type: 'code' },
  };
}

function _codeAgentPostProcess(text) {
  // Detect language in code blocks and mark them
  const enhanced = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `\`\`\`${lang || 'plaintext'}\n${code}\`\`\``;
  });
  return { text: enhanced, extra: { hasCode: true } };
}

async function _thinkingAgentPreProcess(message) {
  return {
    message: `Tolong analisis pertanyaan ini step-by-step dengan reasoning yang mendalam:\n\n${message}`,
    context: { type: 'thinking' },
  };
}

async function _searchAgentPreProcess(message) {
  // Enhance search query
  return {
    message: `Berikan informasi komprehensif dan akurat tentang: ${message}\n\nStruktur jawaban: 1) Ringkasan singkat, 2) Detail lengkap, 3) Sumber/referensi yang relevan (jika ada).`,
    context: { type: 'search' },
  };
}

function _searchAgentPostProcess(text) {
  return { text, extra: { type: 'research' } };
}

async function _imageAgentPreProcess(message) {
  // Build an image generation prompt
  return {
    message: `Kamu adalah AI prompt engineer untuk image generation. 
    
User ingin membuat gambar dengan deskripsi: "${message}"

Tugasmu:
1. Buat prompt image generation yang detail dan efektif dalam bahasa Inggris (untuk Pollinations AI)
2. Format responmu PERSIS seperti ini (jangan tambah teks lain):
PROMPT: [prompt gambar dalam bahasa Inggris, detail, artistic, dengan style]
DESKRIPSI: [penjelasan singkat dalam bahasa Indonesia tentang gambar yang akan dibuat]`,
    context: { type: 'image', originalMessage: message },
  };
}

function _imageAgentPostProcess(text, message, context) {
  // FIX #2: Use context.originalMessage if available (more reliable)
  const originalMessage = context?.originalMessage || message;
  
  // Extract the PROMPT from AI response
  const promptMatch = text.match(/PROMPT:\s*(.+?)(?:\n|$)/i);
  const descMatch   = text.match(/DESKRIPSI:\s*(.+?)(?:\n|$)/i);

  if (promptMatch) {
    const imagePrompt   = promptMatch[1].trim();
    const description   = descMatch ? descMatch[1].trim() : 'Gambar sedang dibuat...';
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const imageUrl      = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

    return {
      text:  description,
      extra: {
        type:        'image',
        imageUrl,
        imagePrompt,
        description,
      },
    };
  }

  return { text, extra: { type: 'image_fallback' } };
}

// ─────────────────────────────────────────────────────────────
// AUTO SUMMARIZE
// ─────────────────────────────────────────────────────────────

async function _autoSummarize(sessionId) {
  const msgs = Memory.getMessagesForSummarization(sessionId);
  if (!msgs.length) return;

  const prompt     = AIEngine.buildSummarizationPrompt(msgs);
  const { text }   = await AIEngine.callAI([{ role: 'user', content: prompt }], {
    modelAlias: 'N1.0-F',
    maxTokens:  300,
    temperature: 0.3,
  });
  Memory.applySummarization(sessionId, text);
  console.log(`[Router] ✅ Auto-summarized session ${sessionId}`);
}

// ─────────────────────────────────────────────────────────────
// GENERATE CHAT TITLE
// ─────────────────────────────────────────────────────────────

async function generateTitle(firstMessage) {
  try {
    const prompt = AIEngine.buildTitlePrompt(firstMessage);
    const { text } = await AIEngine.callAI([{ role: 'user', content: prompt }], {
      modelAlias: 'N1.0-F',
      maxTokens:  30,
      temperature: 0.7,
    });
    return text.trim().replace(/^["']|["']$/g, '').slice(0, 60);
  } catch {
    return firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
  }
}

// ─────────────────────────────────────────────────────────────
// OPTIMIZE PROMPT
// ─────────────────────────────────────────────────────────────

async function optimizePrompt(rawPrompt) {
  const enhancePrompt = `Perbaiki dan perkuat prompt berikut agar menghasilkan respons AI yang lebih baik. 
Hanya outputkan prompt yang sudah diperbaiki, tanpa penjelasan tambahan:

"${rawPrompt}"`;

  const { text } = await AIEngine.callAI(
    [{ role: 'user', content: enhancePrompt }],
    { modelAlias: 'N1.0-F', maxTokens: 200, temperature: 0.5 }
  );
  return text.trim().replace(/^["']|["']$/g, '');
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  route,
  generateTitle,
  optimizePrompt,
  AGENTS,
  getAgentList: () => Object.values(AGENTS).map(a => ({
    id:          a.id,
    name:        a.name,
    icon:        a.icon,
    description: a.description,
  })),
};
