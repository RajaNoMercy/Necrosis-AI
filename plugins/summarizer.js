// ============================================================
//  NECROSIS AI — PLUGIN: SUMMARIZER (summarizer.js)
//  Ringkas percakapan aktif menggunakan AI
//  Modes: brief, detailed, bullet points
// ============================================================

(function initSummarizer() {
  'use strict';

  var CHATS_KEY = 'necrosis_ai_chats';

  function getAllChats()  { try { return JSON.parse(localStorage.getItem(CHATS_KEY)) || []; } catch(e) { return []; } }
  function getGroqKey()   { return window._groqKeyGlobal || ''; }
  function getChatIdx()   { return parseInt(localStorage.getItem('currentChatIndex') || '-1'); }

  function toast(msg, dur) {
    if (typeof window.toast === 'function') { window.toast(msg, dur); return; }
  }

  // ── Build summary prompt ──────────────────────────────────
  function buildPrompt(messages, mode) {
    var convo = messages.map(function (m) {
      return (m.sender === 'user' ? 'User' : 'AI') + ': ' + (m.text || '').substring(0, 300);
    }).join('\n\n');

    var instruction = {
      brief:   'Buat ringkasan sangat singkat (maks 3 kalimat) dari percakapan berikut:',
      detailed:'Buat ringkasan komprehensif mencakup semua topik penting dari percakapan berikut:',
      bullets: 'Buat ringkasan dalam format poin-poin bullet (maks 7 poin) dari percakapan berikut:',
    }[mode] || 'Buat ringkasan percakapan berikut (maks 150 kata):';

    return instruction + '\n\n' + convo;
  }

  // ── Call AI for summary ───────────────────────────────────
  async function summarize(mode) {
    mode = mode || 'brief';
    var apiKey = getGroqKey();
    if (!apiKey) { toast('⚠️ API Key tidak tersedia'); return null; }

    var chats = getAllChats();
    var idx   = getChatIdx();
    if (idx < 0 || !chats[idx]) { toast('⚠️ Tidak ada chat aktif'); return null; }

    var msgs = (chats[idx].messages || []).filter(function (m) { return !m.isInitial && m.text; });
    if (msgs.length < 3) { toast('⚠️ Chat terlalu pendek untuk diringkas'); return null; }

    var prompt = buildPrompt(msgs, mode);

    // Try server first
    if (window.NecrosisAPI?.isServerMode()) {
      var result = await window.NecrosisAPI.summarize();
      if (result) return result;
    }

    // Fallback: direct API
    try {
      var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
          temperature: 0.3,
        }),
      });
      var data = await res.json();
      return (data.choices && data.choices[0] && data.choices[0].message &&
        data.choices[0].message.content) || null;
    } catch (e) {
      toast('❌ Gagal meringkas: ' + e.message);
      return null;
    }
  }

  // ── Show summary in chat ──────────────────────────────────
  function showSummaryCard(summaryText) {
    var container = document.getElementById('chat-container');
    if (!container) return;

    var card = document.createElement('div');
    card.className = 'summary-card';
    card.style.cssText = 'background:linear-gradient(135deg,rgba(0,200,100,0.08),rgba(0,100,200,0.08));' +
      'border:1px solid rgba(0,200,100,0.25);border-radius:12px;padding:14px 16px;' +
      'margin:10px 20px;font-size:13px;';

    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
      '<b style="color:#00c864"><i class="fas fa-compress-alt"></i> Ringkasan Chat</b>' +
      '<button style="background:none;border:none;color:var(--gray);cursor:pointer;font-size:16px;" ' +
      'onclick="this.closest(\'.summary-card\').remove()">&times;</button>' +
      '</div>' +
      '<div style="color:var(--light);line-height:1.6;white-space:pre-wrap;">' + summaryText + '</div>' +
      '<div style="font-size:11px;color:var(--gray);margin-top:8px;">' +
      '<i class="fas fa-info-circle"></i> Diringkas oleh Necrosis AI</div>';

    container.appendChild(card);
    container.scrollTop = container.scrollHeight;
  }

  // ── Bind summarize button ─────────────────────────────────
  var summarizeBtn = document.getElementById('summarize-chat-btn');
  if (summarizeBtn) {
    // Only attach if server patch hasn't taken over
    if (!window.NecrosisAPI?.isServerMode()) {
      summarizeBtn.addEventListener('click', async function () {
        var btn = this;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Meringkas...';
        toast('🔄 Meringkas percakapan...');

        var summary = await summarize('brief');
        if (summary) {
          showSummaryCard(summary);
          toast('✅ Ringkasan berhasil dibuat!');
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-compress-alt"></i> Ringkas Chat';
      });
    }
  }

  // ── Global API ────────────────────────────────────────────
  window.SummarizerPlugin = {
    summarize,
    showSummaryCard,
    modes: ['brief', 'detailed', 'bullets'],
  };

  console.log('[Plugin] ✅ Summarizer loaded');
})();
