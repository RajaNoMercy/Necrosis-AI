// ============================================================
//  NECROSIS AI — API FALLBACK v3 (api-fallback.js)
//  Baca API keys dari /api/keys (config/env di server)
//  Groq 429 → auto fallback ke Gemini/Cerebras/Mistral/dll
// ============================================================

(function() {
  'use strict';

  // ── Keys cache (diisi dari /api/keys) ─────────────────────
  var KEYS = {
    groq:       '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',
    gemini:     'AIzaSyCdu81Olwbogaq6hzWpQxpNUKKVkgTLFiA',
    cerebras:   'csk-w8nfdj9fncftdnchm3kn8d2v5x6k5vf4ypv62d6v66mt29fk',
    mistral:    '',
    openrouter: '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',
    sambanova:  '',
    nvidia:     '',
  };

  var keysLoaded = false;

  // Load keys dari server
  async function loadKeys() {
    try {
      var res  = await fetch('/api/keys');
      if (!res.ok) return;
      var data = await res.json();
      Object.assign(KEYS, data);
      // Sync groq key ke window global
      if (KEYS.groq) window._groqKeyGlobal = KEYS.groq;
      keysLoaded = true;
      console.log('[APIFallback] ✅ Keys loaded from /api/keys:', 
        Object.keys(KEYS).filter(function(k) { return !!KEYS[k]; }).join(', '));
    } catch(e) {
      console.warn('[APIFallback] Could not load /api/keys:', e.message);
    }
  }

  // ── Providers ─────────────────────────────────────────────
  var PROVIDERS = [
    {
      name:   'Gemini',
      getKey: function() { return KEYS.gemini || localStorage.getItem('fb_gemini') || ''; },
      url:    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
      model:  'gemini-2.0-flash-lite',
      format: 'gemini',
    },
    {
      name:   'Cerebras',
      getKey: function() { return KEYS.cerebras || localStorage.getItem('fb_cerebras') || ''; },
      url:    'https://api.cerebras.ai/v1/chat/completions',
      model:  'llama-3.3-70b',
      format: 'openai',
    },
    {
      name:   'Mistral',
      getKey: function() { return KEYS.mistral || localStorage.getItem('fb_mistral') || ''; },
      url:    'https://api.mistral.ai/v1/chat/completions',
      model:  'mistral-small-latest',
      format: 'openai',
    },
    {
      name:   'OpenRouter',
      getKey: function() { return KEYS.openrouter || localStorage.getItem('fb_openrouter') || ''; },
      url:    'https://openrouter.ai/api/v1/chat/completions',
      model:  'meta-llama/llama-3.1-8b-instruct:free',
      format: 'openai',
    },
    {
      name:   'SambaNova',
      getKey: function() { return KEYS.sambanova || localStorage.getItem('fb_sambanova') || ''; },
      url:    'https://api.sambanova.ai/v1/chat/completions',
      model:  'Meta-Llama-3.3-70B-Instruct',
      format: 'openai',
    },
    {
      name:   'NVIDIA',
      getKey: function() { return KEYS.nvidia || localStorage.getItem('fb_nvidia') || ''; },
      url:    'https://integrate.api.nvidia.com/v1/chat/completions',
      model:  'meta/llama-3.3-70b-instruct',
      format: 'openai',
    },
  ];

  function getAvailable() {
    return PROVIDERS.filter(function(p) { return !!p.getKey(); });
  }

  // ── Helpers ───────────────────────────────────────────────
  function toast(msg) {
    var n = document.getElementById('copy-notification');
    if (!n) return;
    n.querySelector('span').textContent = msg;
    n.classList.add('show');
    clearTimeout(n._ftid);
    n._ftid = setTimeout(function() { n.classList.remove('show'); }, 3000);
  }

  function sleep(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
  }

  // ── Call provider → return text ───────────────────────────
  async function callProvider(prov, messages, maxTokens) {
    var key = prov.getKey();
    if (!key) throw new Error(prov.name + ': no key');

    if (prov.format === 'gemini') {
      var contents = [], sys = null;
      messages.forEach(function(m) {
        if (m.role === 'system') sys = { parts: [{ text: m.content }] };
        else contents.push({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          parts: [{ text: m.content }] 
        });
      });
      var body = { 
        contents: contents, 
        generationConfig: { maxOutputTokens: maxTokens || 2048 } 
      };
      if (sys) body.systemInstruction = sys;

      var res = await window._realFetch(prov.url + '?key=' + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Gemini ' + res.status);
      var d = await res.json();
      return d.candidates[0].content.parts[0].text || '';

    } else {
      var headers = { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + key 
      };
      if (prov.format === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'Necrosis AI';
      }
      var res2 = await window._realFetch(prov.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
          model: prov.model, 
          messages: messages, 
          max_tokens: maxTokens || 2048, 
          temperature: 0.7 
        }),
      });
      if (!res2.ok) throw new Error(prov.name + ' ' + res2.status);
      var d2 = await res2.json();
      return d2.choices[0].message.content || '';
    }
  }

  // ── Convert text → fake SSE stream ───────────────────────
  function textToStream(text) {
    var encoder = new TextEncoder();
    var i = 0, CHUNK = 4;
    var stream = new ReadableStream({
      async pull(ctrl) {
        if (i >= text.length) {
          ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
          ctrl.close();
          return;
        }
        var chunk = text.slice(i, i + CHUNK);
        i += CHUNK;
        var sse = 'data: ' + JSON.stringify({
          choices: [{ delta: { content: chunk }, finish_reason: null }]
        }) + '\n\n';
        ctrl.enqueue(encoder.encode(sse));
        await sleep(5);
      }
    });
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }

  // ── PATCH fetch ───────────────────────────────────────────
  window._realFetch = window.fetch.bind(window);

  function applyPatch() {
    var _prev = window.fetch;

    window.fetch = async function(url, options) {
      // Hanya intercept Groq calls
      if (typeof url !== 'string' || !url.includes('api.groq.com')) {
        return _prev(url, options);
      }

      // Call Groq dulu
      var res;
      try {
        res = await _prev(url, options);
      } catch(e) {
        res = { ok: false, status: 0, statusText: e.message };
      }

      // Berhasil → return
      if (res && res.ok) return res;

      // Hanya fallback untuk 429/503/500/network error
      var status = res ? res.status : 0;
      if (status !== 429 && status !== 503 && status !== 500 && status !== 0) {
        return res;
      }

      toast('⚠️ Groq ' + (status || 'error') + '! Switching provider...');
      console.warn('[APIFallback] Groq failed (' + status + '), trying fallbacks...');

      // Parse request body
      var messages = [], isStream = false, maxTokens = 2048;
      try {
        var body = JSON.parse(options.body);
        messages  = body.messages || [];
        isStream  = body.stream === true;
        maxTokens = body.max_tokens || 2048;
      } catch(e) { return res; }

      // Coba semua provider yang punya key
      var available = getAvailable();
      if (!available.length) {
        toast('❌ Tidak ada fallback API! Tambah key di config/env.');
        return res;
      }

      for (var i = 0; i < available.length; i++) {
        var prov = available[i];
        try {
          toast('🔄 Mencoba ' + prov.name + '...');
          var text = await callProvider(prov, messages, maxTokens);
          if (!text) continue;

          toast('✅ Berhasil via ' + prov.name + '!');
          console.log('[APIFallback] ✅ Fallback:', prov.name);

          if (isStream) return textToStream(text);

          return new Response(
            JSON.stringify({ choices: [{ message: { role: 'assistant', content: text } }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );

        } catch(err) {
          console.warn('[APIFallback]', prov.name, 'failed:', err.message);
          await sleep(300);
        }
      }

      toast('❌ Semua provider gagal! Cek config/env kamu.');
      return res;
    };

    console.log('[APIFallback] ✅ Patch applied, providers available:', 
      getAvailable().map(function(p) { return p.name; }).join(', ') || 'none yet');
  }

  // ── Init: load keys dulu, baru patch ─────────────────────
  async function init() {
    await loadKeys();
    // Delay biar semua script lain selesai patch dulu
    setTimeout(applyPatch, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.APIFallback = { KEYS, PROVIDERS, getAvailable };
  console.log('[Plugin] ✅ API Fallback v3 loaded');
})();
