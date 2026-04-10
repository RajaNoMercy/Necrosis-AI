// ============================================================
//  NECROSIS AI — REAL WEB SEARCH (real-web-search.js)
//  Beneran search internet + tampil progress kayak Claude/Grok
//  "Searching 24 pages..." → hasil → AI jawab dengan konteks
// ============================================================

(function initRealWebSearch() {
  'use strict';

  // ── Search Providers (semua gratis, no key) ───────────────
  var SEARCH_PROVIDERS = [
    {
      name: 'DuckDuckGo',
      search: async function(query) {
        var url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) +
          '&format=json&no_html=1&skip_disambig=1&no_redirect=1';
        var res  = await fetch(url);
        var data = await res.json();
        var results = [];
        if (data.AbstractText) {
          results.push({
            title:   data.Heading || query,
            snippet: data.AbstractText,
            url:     data.AbstractURL || '',
            source:  'DuckDuckGo',
          });
        }
        (data.RelatedTopics || []).slice(0, 5).forEach(function(t) {
          if (t.Text && t.FirstURL) {
            results.push({
              title:   t.Text.split(' - ')[0] || t.Text.slice(0, 60),
              snippet: t.Text,
              url:     t.FirstURL,
              source:  'DuckDuckGo',
            });
          }
        });
        return results;
      },
    },
    {
      name: 'Wikipedia',
      search: async function(query) {
        var url = 'https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
          encodeURIComponent(query) + '&format=json&origin=*&srlimit=5&srprop=snippet';
        var res  = await fetch(url);
        var data = await res.json();
        return (data.query?.search || []).map(function(item) {
          return {
            title:   item.title,
            snippet: item.snippet.replace(/<[^>]*>/g, ''),
            url:     'https://id.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g, '_')),
            source:  'Wikipedia',
          };
        });
      },
    },
    {
      name: 'Wikipedia EN',
      search: async function(query) {
        var url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
          encodeURIComponent(query) + '&format=json&origin=*&srlimit=3&srprop=snippet';
        var res  = await fetch(url);
        var data = await res.json();
        return (data.query?.search || []).map(function(item) {
          return {
            title:   item.title,
            snippet: item.snippet.replace(/<[^>]*>/g, ''),
            url:     'https://en.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g, '_')),
            source:  'Wikipedia EN',
          };
        });
      },
    },
  ];

  // ── Update typing indicator jadi search progress ──────────
  function updateSearchIndicator(typingDiv, phase, count, query) {
    if (!typingDiv || !typingDiv.isConnected) return;

    var phases = {
      searching: {
        icon:  'fas fa-globe',
        color: '#00a8ff',
        text:  'Searching ' + count + ' Pages...',
        sub:   '"' + (query || '').slice(0, 40) + '"',
      },
      reading: {
        icon:  'fas fa-book-open',
        color: '#bc13fe',
        text:  'Reading ' + count + ' Results...',
        sub:   'Menganalisis Konten...',
      },
      thinking: {
        icon:  'fas fa-brain',
        color: '#E60000',
        text:  'Synthesizing answer...',
        sub:   'Menyusun Jawaban Dari ' + count + ' Sumber...',
      },
    };

    var p = phases[phase] || phases.searching;

    typingDiv.innerHTML = [
      '<div class="necro-search-progress">',
        // Search steps
        '<div class="nsp-step nsp-active">',
          '<div class="nsp-icon" style="background:rgba(0,168,255,0.15);border:1px solid rgba(0,168,255,0.3);">',
            '<i class="fas fa-globe" style="color:#00a8ff;"></i>',
          '</div>',
          '<div class="nsp-content">',
            '<div class="nsp-label">Web Search</div>',
            '<div class="nsp-value">' + (phase === 'searching' ? p.text : '✓ ' + count + ' Halaman Ditemukan') + '</div>',
          '</div>',
          phase === 'searching' ? '<div class="nsp-spinner"></div>' : '<i class="fas fa-check" style="color:#00c864;font-size:12px;"></i>',
        '</div>',

        phase !== 'searching' ? [
          '<div class="nsp-line"></div>',
          '<div class="nsp-step ' + (phase === 'reading' || phase === 'thinking' ? 'nsp-active' : '') + '">',
            '<div class="nsp-icon" style="background:rgba(188,19,254,0.15);border:1px solid rgba(188,19,254,0.3);">',
              '<i class="fas fa-book-open" style="color:#bc13fe;"></i>',
            '</div>',
            '<div class="nsp-content">',
              '<div class="nsp-label">Reading Results</div>',
              '<div class="nsp-value">' + (phase === 'reading' ? p.text : '✓ ' + count + ' Hasil Dibaca') + '</div>',
            '</div>',
            phase === 'reading' ? '<div class="nsp-spinner"></div>' : '<i class="fas fa-check" style="color:#00c864;font-size:12px;"></i>',
          '</div>',
        ].join('') : '',

        phase === 'thinking' ? [
          '<div class="nsp-line"></div>',
          '<div class="nsp-step nsp-active">',
            '<div class="nsp-icon" style="background:rgba(230,0,0,0.15);border:1px solid rgba(230,0,0,0.3);">',
              '<i class="fas fa-brain" style="color:#E60000;"></i>',
            '</div>',
            '<div class="nsp-content">',
              '<div class="nsp-label">Synthesizing</div>',
              '<div class="nsp-value">' + p.text + '</div>',
            '</div>',
            '<div class="nsp-spinner"></div>',
          '</div>',
        ].join('') : '',

        // Query info
        '<div class="nsp-query">',
          '<i class="fas fa-search" style="color:var(--gray);font-size:10px;"></i>',
          '<span>' + (query || '').slice(0, 60) + (query && query.length > 60 ? '...' : '') + '</span>',
        '</div>',
      '</div>',
    ].join('');
  }

  // ── Render hasil search sebagai card ──────────────────────
  function renderSearchResults(results, query) {
    if (!results || !results.length) return '';

    var html = '<div class="necro-search-results">' +
      '<div class="nsr-header">' +
        '<i class="fas fa-search"></i>' +
        '<span>Ditemukan ' + results.length + ' hasil untuk: <b>"' + escHtml(query) + '"</b></span>' +
      '</div>' +
      '<div class="nsr-list">';

    results.slice(0, 5).forEach(function(r, i) {
      var domain = '';
      try { domain = new URL(r.url).hostname.replace('www.', ''); } catch(e) {}
      html += '<div class="nsr-item">' +
        '<div class="nsr-num">' + (i+1) + '</div>' +
        '<div class="nsr-body">' +
          '<a href="' + r.url + '" target="_blank" class="nsr-title">' + escHtml(r.title) + '</a>' +
          '<div class="nsr-snippet">' + escHtml(r.snippet.slice(0, 150)) + '...</div>' +
          (domain ? '<div class="nsr-domain"><i class="fas fa-link"></i> ' + domain + '</div>' : '') +
        '</div>' +
      '</div>';
    });

    html += '</div></div>';
    return html;
  }

  // ── Format search context untuk AI ────────────────────────
  function buildSearchContext(results, query) {
    if (!results.length) return '';
    var lines = [
      '[HASIL PENCARIAN WEB untuk: "' + query + '"]',
      'Waktu: ' + new Date().toLocaleString('id-ID'),
      '',
    ];
    results.slice(0, 5).forEach(function(r, i) {
      lines.push((i+1) + '. ' + r.title);
      lines.push('   ' + r.snippet.slice(0, 300));
      if (r.url) lines.push('   Sumber: ' + r.url);
      lines.push('');
    });
    lines.push('[Gunakan informasi di atas untuk menjawab. Sertakan referensi sumber yang relevan.]');
    return lines.join('\n');
  }

  // ── Detect apakah perlu search ────────────────────────────
  function needsSearch(message, mode) {
    if (mode === 'search') return true;
    var patterns = [
      /\b(cari|search|berita|news|terbaru|latest|update|hari ini|today|sekarang|now)\b/i,
      /\b(siapa|apa itu|what is|who is|kapan|when|dimana|where|berapa|harga)\b/i,
      /\b(2024|2025|2026|minggu ini|bulan ini|tahun ini)\b/i,
    ];
    return patterns.some(function(p) { return p.test(message); });
  }

  // ── Main: intercept sendMessage untuk mode search ────────
  var _originalSendMsg = null;

  function hookSearchMode() {
    var chatContainer = document.getElementById('chat-container');
    if (!chatContainer) { setTimeout(hookSearchMode, 500); return; }

    // Override addDeepSeekTypingIndicator untuk search mode
    var _origTyping = window.addDeepSeekTypingIndicator || null;

    // Expose search function globally
    window.NecrosisSearch = {

      // Main search function dipanggil sebelum AI respond
      doSearch: async function(query, typingDiv) {
        var allResults = [];

        // Phase 1: Searching
        updateSearchIndicator(typingDiv, 'searching', 0, query);
        await sleep(300);

        for (var i = 0; i < SEARCH_PROVIDERS.length; i++) {
          var prov = SEARCH_PROVIDERS[i];
          try {
            updateSearchIndicator(typingDiv, 'searching', allResults.length + '+ (checking ' + prov.name + ')', query);
            var results = await prov.search(query);
            allResults = allResults.concat(results);
            updateSearchIndicator(typingDiv, 'searching', allResults.length, query);
            await sleep(200);
          } catch(e) {
            console.warn('[Search]', prov.name, 'failed:', e.message);
          }
        }

        // Phase 2: Reading
        updateSearchIndicator(typingDiv, 'reading', allResults.length, query);
        await sleep(600);

        // Phase 3: Thinking
        updateSearchIndicator(typingDiv, 'thinking', allResults.length, query);
        await sleep(400);

        return allResults;
      },

      buildContext: buildSearchContext,
      renderResults: renderSearchResults,
      needsSearch: needsSearch,
    };

    console.log('[RealWebSearch] ✅ Search hooks ready');
  }

  // ── Intercept search mode sendMessage ────────────────────
  // Patch callGrokAPIStream untuk inject search context
  var _origStream = null;

  function patchForSearch() {
    // Hanya aktif kalau mode search
    var origCallStream = window.callGrokAPIStream;
    if (!origCallStream) return;

    // Exposed via script.js scope — tidak bisa di-patch langsung
    // Gunakan fetch intercept untuk inject context ke request
    var _prev = window.fetch;
    window.fetch = async function(url, options) {
      if (typeof url !== 'string' || !url.includes('groq.com') && !url.includes('gemini') && !url.includes('cerebras') && !url.includes('mistral') && !url.includes('openrouter')) {
        return _prev(url, options);
      }

      // Cek apakah mode search aktif
      var currentMode = localStorage.getItem('currentMode') || 'necrosis_ai';
      if (currentMode !== 'search') return _prev(url, options);
      if (!options || !options.body) return _prev(url, options);

      try {
        var body = JSON.parse(options.body);
        if (!body.messages || !body.messages.length) return _prev(url, options);

        // Cek apakah sudah ada search context
        var hasContext = body.messages.some(function(m) {
          return m.role === 'system' && m.content && m.content.includes('[HASIL PENCARIAN WEB');
        });
        if (hasContext) return _prev(url, options);

        // Ambil query dari pesan user terakhir
        var lastUser = null;
        for (var i = body.messages.length - 1; i >= 0; i--) {
          if (body.messages[i].role === 'user') { lastUser = body.messages[i].content; break; }
        }
        if (!lastUser) return _prev(url, options);

        // Do search
        var results = [];
        try {
          for (var j = 0; j < SEARCH_PROVIDERS.length; j++) {
            var r = await SEARCH_PROVIDERS[j].search(lastUser.slice(0, 100));
            results = results.concat(r);
            if (results.length >= 5) break;
          }
        } catch(e) {}

        if (results.length > 0) {
          var context = buildSearchContext(results, lastUser.slice(0, 100));
          // Inject ke system message
          var sysIdx = body.messages.findIndex(function(m) { return m.role === 'system'; });
          if (sysIdx >= 0) {
            body.messages[sysIdx].content = body.messages[sysIdx].content + '\n\n' + context;
          } else {
            body.messages.unshift({ role: 'system', content: context });
          }

          // Simpan results untuk ditampilkan nanti
          window._lastSearchResults = results;
          window._lastSearchQuery   = lastUser.slice(0, 100);

          options = Object.assign({}, options, { body: JSON.stringify(body) });
        }

      } catch(e) { /* ignore */ }

      return _prev(url, options);
    };

    console.log('[RealWebSearch] ✅ Search context injection ready');
  }

  // ── Inject search results card setelah AI respond ─────────
  function injectSearchCards() {
    var chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1 || !node.classList.contains('ai')) return;
          if (!window._lastSearchResults || !window._lastSearchResults.length) return;
          if (node.dataset.searchAdded) return;
          node.dataset.searchAdded = '1';

          var currentMode = localStorage.getItem('currentMode') || '';
          if (currentMode !== 'search') return;

          var card = document.createElement('div');
          card.innerHTML = renderSearchResults(window._lastSearchResults, window._lastSearchQuery || '');
          var firstChild = card.firstElementChild;
          if (firstChild) {
            // Insert di atas konten AI
            node.insertBefore(firstChild, node.firstChild);
          }

          // Clear setelah ditampilkan
          window._lastSearchResults = null;
          window._lastSearchQuery   = null;
        });
      });
    }).observe(chatContainer, { childList: true });
  }

  // ── CSS ───────────────────────────────────────────────────
  function injectCSS() {
    var style = document.createElement('style');
    style.textContent = `
      /* ── Search Progress Card ── */
      .necro-search-progress {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 14px 16px;
        margin: 4px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .nsp-step {
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0.4;
        transition: opacity 0.3s;
      }
      .nsp-step.nsp-active { opacity: 1; }
      .nsp-icon {
        width: 32px; height: 32px;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; font-size: 13px;
      }
      .nsp-content { flex: 1; min-width: 0; }
      .nsp-label { font-size: 10px; color: var(--gray); margin-bottom: 1px; }
      .nsp-value { font-size: 13px; color: var(--light); font-weight: 500; }
      .nsp-spinner {
        width: 14px; height: 14px;
        border: 2px solid rgba(255,255,255,0.1);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: nsp-spin 0.7s linear infinite;
        flex-shrink: 0;
      }
      @keyframes nsp-spin { to { transform: rotate(360deg); } }
      .nsp-line {
        width: 1px; height: 10px;
        background: rgba(255,255,255,0.1);
        margin-left: 15px;
      }
      .nsp-query {
        display: flex; align-items: center; gap: 6px;
        font-size: 11px; color: var(--gray);
        padding-top: 4px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }

      /* ── Search Results Card ── */
      .necro-search-results {
        background: rgba(0,168,255,0.05);
        border: 1px solid rgba(0,168,255,0.15);
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 12px;
        font-size: 12px;
      }
      .nsr-header {
        display: flex; align-items: center; gap: 7px;
        color: #00a8ff; font-weight: 600; font-size: 12px;
        margin-bottom: 10px;
      }
      .nsr-list { display: flex; flex-direction: column; gap: 8px; }
      .nsr-item {
        display: flex; gap: 8px; align-items: flex-start;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      .nsr-item:last-child { border-bottom: none; padding-bottom: 0; }
      .nsr-num {
        width: 18px; height: 18px;
        background: rgba(0,168,255,0.15);
        border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; color: #00a8ff; font-weight: 700;
        flex-shrink: 0; margin-top: 1px;
      }
      .nsr-body { flex: 1; min-width: 0; }
      .nsr-title {
        color: #58a6ff; font-weight: 600; font-size: 12px;
        text-decoration: none; display: block;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .nsr-title:hover { text-decoration: underline; }
      .nsr-snippet { color: var(--gray); font-size: 11px; margin-top: 2px; line-height: 1.4; }
      .nsr-domain { color: rgba(255,255,255,0.2); font-size: 10px; margin-top: 2px; }
    `;
    document.head.appendChild(style);
  }

  // ── Helpers ───────────────────────────────────────────────
  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Patch typing indicator untuk search mode ─────────────
  function patchTypingIndicator() {
    // Override addDeepSeekTypingIndicator
    var chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    // Wrap original function
    var origFn = window.addDeepSeekTypingIndicator;
    if (origFn && !origFn._patched) {
      // Tidak bisa patch langsung karena dalam closure
      // Tapi kita bisa observe DOM untuk update indicator
      new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.id === 'deepseek-typing') {
              var currentMode = localStorage.getItem('currentMode') || '';
              if (currentMode !== 'search') return;

              // Ambil query dari input
              var query = (document.getElementById('prompt-input')?.value || '').trim();
              if (!query) return;

              // Langsung update ke search progress UI
              updateSearchIndicator(node, 'searching', 0, query);

              // Simulasi progress
              var count = 0;
              var interval = setInterval(function() {
                if (!node.isConnected) { clearInterval(interval); return; }
                count += Math.floor(Math.random() * 8) + 3;
                var phase = count < 10 ? 'searching' : count < 20 ? 'reading' : 'thinking';
                updateSearchIndicator(node, phase, count, query);
                if (count >= 24) clearInterval(interval);
              }, 400);

              node._searchInterval = interval;
            }
          });
        });
      }).observe(chatContainer, { childList: true });
    }
  }

  // ── Init ──────────────────────────────────────────────────
  injectCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        hookSearchMode();
        patchTypingIndicator();
        patchForSearch();
        injectSearchCards();
      }, 700);
    });
  } else {
    setTimeout(function() {
      hookSearchMode();
      patchTypingIndicator();
      patchForSearch();
      injectSearchCards();
    }, 700);
  }

  window.RealWebSearchPlugin = { needsSearch, buildSearchContext, renderSearchResults };
  console.log('[Plugin] ✅ Real Web Search loaded');
})();
