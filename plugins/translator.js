// ============================================================
//  NECROSIS AI — PLUGIN: TRANSLATOR (translator.js)
//  Auto-detect language + translate via AI or MyMemory API
//  Supports 20+ bahasa, inline translation button di setiap pesan
// ============================================================

(function initTranslator() {
  'use strict';

  // ── Language map ──────────────────────────────────────────
  var LANGUAGES = {
    'id': 'Indonesia', 'en': 'Inggris', 'ja': 'Jepang', 'ko': 'Korea',
    'zh': 'China', 'ar': 'Arab', 'fr': 'Prancis', 'de': 'Jerman',
    'es': 'Spanyol', 'pt': 'Portugis', 'ru': 'Rusia', 'it': 'Italia',
    'th': 'Thailand', 'vi': 'Vietnam', 'ms': 'Melayu', 'nl': 'Belanda',
    'sv': 'Swedia', 'tr': 'Turki', 'pl': 'Polandia', 'hi': 'Hindi',
  };

  // ── MyMemory API (free, no key) ───────────────────────────
  async function translateViaMyMemory(text, toLang, fromLang) {
    fromLang = fromLang || 'auto';
    var langPair = (fromLang === 'auto' ? 'id' : fromLang) + '|' + toLang;
    var url = 'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text.substring(0, 500)) + '&langpair=' + langPair;
    var res  = await fetch(url);
    var data = await res.json();
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    }
    throw new Error(data.responseDetails || 'Translation failed');
  }

  // ── AI-based translation (Groq) ───────────────────────────
  async function translateViaAI(text, toLang) {
    var apiKey = window._groqKeyGlobal || '';
    if (!apiKey) return null;
    var langName = LANGUAGES[toLang] || toLang;
    try {
      var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Kamu adalah penerjemah. Terjemahkan teks berikut ke bahasa ' + langName + '. Balas HANYA dengan terjemahan, tanpa penjelasan.' },
            { role: 'user', content: text.substring(0, 1000) },
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });
      var data = await res.json();
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || null;
    } catch (e) { return null; }
  }

  // ── Main translate function ───────────────────────────────
  async function translate(text, toLang, fromLang) {
    if (!text || !toLang) return null;
    // Try AI first (higher quality), fallback to MyMemory
    var result = await translateViaAI(text, toLang);
    if (!result) result = await translateViaMyMemory(text, toLang, fromLang);
    return result;
  }

  // ── Language detector (simple heuristic) ─────────────────
  function detectLanguage(text) {
    var lower = text.toLowerCase();
    if (/[あ-ん]|[ア-ン]/.test(text)) return 'ja';
    if (/[가-힣]/.test(text)) return 'ko';
    if (/[ก-ฮ]/.test(text)) return 'th';
    if (/[أ-ي]/.test(text)) return 'ar';
    if (/[а-я]/.test(lower)) return 'ru';
    if (/\b(the|is|are|was|were|have|has|i|you|he|she|we|they)\b/.test(lower)) return 'en';
    if (/\b(yang|dan|atau|ini|itu|dengan|untuk|dari|ke|di)\b/.test(lower)) return 'id';
    return 'unknown';
  }

  // ── Inline translate button on messages ──────────────────
  var chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    chatContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.translate-btn');
      if (!btn) return;

      var msgEl = btn.closest('.message, .ai, .user');
      if (!msgEl) return;

      var text   = msgEl.querySelector('.message-text, .msg-content')?.innerText ||
                   msgEl.innerText.replace(/[👤🤖\n]+/g, ' ').trim();
      if (!text || text.length < 5) return;

      // Show language picker
      showLangPicker(btn, text, msgEl);
    });
  }

  function showLangPicker(anchorBtn, text, msgEl) {
    // Remove existing picker
    document.querySelectorAll('.necro-lang-picker').forEach(function (el) { el.remove(); });

    var picker = document.createElement('div');
    picker.className = 'necro-lang-picker';
    picker.style.cssText = 'position:absolute;z-index:999;background:var(--sidebar-bg);' +
      'border:1px solid var(--border);border-radius:10px;padding:8px;' +
      'display:flex;flex-wrap:wrap;gap:4px;max-width:280px;box-shadow:0 4px 20px rgba(0,0,0,0.5);';

    Object.entries(LANGUAGES).forEach(function (entry) {
      var code = entry[0], name = entry[1];
      var opt = document.createElement('button');
      opt.textContent = name;
      opt.style.cssText = 'background:var(--dark);border:1px solid var(--border);color:var(--gray);' +
        'padding:3px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-family:Poppins,sans-serif;';
      opt.addEventListener('mouseenter', function () { this.style.borderColor = 'var(--primary)'; this.style.color = 'var(--light)'; });
      opt.addEventListener('mouseleave', function () { this.style.borderColor = 'var(--border)'; this.style.color = 'var(--gray)'; });
      opt.addEventListener('click', async function () {
        picker.remove();
        var loading = document.createElement('div');
        loading.style.cssText = 'font-size:12px;color:var(--gray);padding:6px 0;';
        loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menerjemahkan ke ' + name + '...';
        msgEl.appendChild(loading);

        try {
          var translated = await translate(text, code);
          loading.remove();
          if (translated) showTranslationResult(msgEl, translated, name);
        } catch (err) {
          loading.remove();
          if (typeof window.toast === 'function') window.toast('❌ Gagal menerjemahkan: ' + err.message);
        }
      });
      picker.appendChild(opt);
    });

    // Close on outside click
    setTimeout(function () {
      document.addEventListener('click', function handler(e) {
        if (!picker.contains(e.target) && e.target !== anchorBtn) {
          picker.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);

    anchorBtn.parentNode.appendChild(picker);
  }

  function showTranslationResult(msgEl, text, langName) {
    // Remove existing translation
    msgEl.querySelector('.translation-result')?.remove();

    var result = document.createElement('div');
    result.className = 'translation-result';
    result.style.cssText = 'background:rgba(0,100,200,0.1);border:1px solid rgba(0,100,200,0.25);' +
      'border-radius:8px;padding:10px 12px;margin-top:8px;font-size:13px;';
    result.innerHTML =
      '<div style="color:#00a8ff;font-size:11px;font-weight:600;margin-bottom:4px;">' +
      '<i class="fas fa-language"></i> Terjemahan (' + langName + ')</div>' +
      '<div style="color:var(--light);line-height:1.5;">' + text + '</div>' +
      '<button style="background:none;border:none;color:var(--gray);cursor:pointer;font-size:11px;margin-top:4px;" ' +
      'onclick="this.closest(\'.translation-result\').remove()">✕ Tutup</button>';
    msgEl.appendChild(result);
  }

  // ── Global API ────────────────────────────────────────────
  window.TranslatorPlugin = {
    translate,
    detectLanguage,
    languages: LANGUAGES,
  };

  console.log('[Plugin] ✅ Translator loaded');
})();
