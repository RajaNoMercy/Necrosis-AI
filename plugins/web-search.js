// ============================================================
//  NECROSIS AI — PLUGIN: WEB SEARCH (web-search.js)
//  Adds real-time web context to AI responses
//  Sources: DuckDuckGo Instant Answer, Wikipedia, Open APIs
// ============================================================

(function initWebSearch() {
  'use strict';

  // ── Search providers ──────────────────────────────────────
  var PROVIDERS = {
    duckduckgo: {
      name: 'DuckDuckGo',
      search: async function (query) {
        var url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) +
          '&format=json&no_html=1&skip_disambig=1';
        var res  = await fetch(url);
        var data = await res.json();
        var results = [];
        if (data.AbstractText) {
          results.push({ title: data.Heading || query, snippet: data.AbstractText, url: data.AbstractURL });
        }
        (data.RelatedTopics || []).slice(0, 3).forEach(function (t) {
          if (t.Text) results.push({ title: t.Text.split(' - ')[0], snippet: t.Text, url: t.FirstURL });
        });
        return results;
      },
    },

    wikipedia: {
      name: 'Wikipedia',
      search: async function (query) {
        var url = 'https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
          encodeURIComponent(query) + '&format=json&origin=*&srlimit=3';
        var res  = await fetch(url);
        var data = await res.json();
        return (data.query?.search || []).map(function (item) {
          return {
            title:   item.title,
            snippet: item.snippet.replace(/<[^>]*>/g, ''),
            url:     'https://id.wikipedia.org/wiki/' + encodeURIComponent(item.title),
          };
        });
      },
    },
  };

  // ── Main search function ──────────────────────────────────
  async function search(query, options) {
    options = options || {};
    var provider = options.provider || 'duckduckgo';
    var prov     = PROVIDERS[provider] || PROVIDERS.duckduckgo;
    var results  = [];

    try {
      results = await prov.search(query);
    } catch (e) {
      // Fallback to other provider
      try {
        var fallbackKey = Object.keys(PROVIDERS).find(function (k) { return k !== provider; });
        if (fallbackKey) results = await PROVIDERS[fallbackKey].search(query);
      } catch (e2) { /* all failed */ }
    }

    return results;
  }

  // ── Format search results as context for AI ──────────────
  function formatAsContext(results, query) {
    if (!results || results.length === 0) {
      return '[PENCARIAN WEB]: Tidak ada hasil untuk "' + query + '"';
    }
    var lines = ['[HASIL PENCARIAN WEB untuk: "' + query + '"]'];
    results.slice(0, 3).forEach(function (r, i) {
      lines.push((i + 1) + '. ' + r.title);
      if (r.snippet) lines.push('   ' + r.snippet.substring(0, 200));
      if (r.url) lines.push('   Sumber: ' + r.url);
    });
    lines.push('[Gunakan informasi di atas sebagai konteks tambahan untuk menjawab pertanyaan user.]');
    return lines.join('\n');
  }

  // ── Render search results card in chat ────────────────────
  function renderSearchCard(results, query, container) {
    var card = document.createElement('div');
    card.className = 'search-results-card';
    card.style.cssText = 'background:rgba(0,168,255,0.06);border:1px solid rgba(0,168,255,0.2);' +
      'border-radius:10px;padding:12px 14px;margin:8px 0;font-size:12px;';

    var header = document.createElement('div');
    header.style.cssText = 'color:#00a8ff;font-weight:600;margin-bottom:8px;font-size:12px;';
    header.innerHTML = '<i class="fas fa-globe"></i> Hasil Pencarian: "' + query + '"';
    card.appendChild(header);

    (results || []).slice(0, 3).forEach(function (r) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);';
      item.innerHTML =
        '<div style="color:var(--light);font-weight:500;">' + r.title + '</div>' +
        '<div style="color:var(--gray);margin-top:2px;">' + (r.snippet || '').substring(0, 120) + '...</div>' +
        (r.url ? '<a href="' + r.url + '" target="_blank" style="color:#00a8ff;font-size:11px;">' +
          '<i class="fas fa-external-link-alt"></i> ' + r.url.substring(0, 50) + '</a>' : '');
      card.appendChild(item);
    });

    if (container) container.appendChild(card);
    return card;
  }

  // ── Detect if message is a search query ──────────────────
  function isSearchQuery(message) {
    var patterns = [
      /\b(cari|search|berita|news|terbaru|latest|update|info|siapa|apa itu|what is|who is|kapan|where|berapa)\b/i,
      /\b(2024|2025|hari ini|sekarang|today|current|terkini)\b/i,
    ];
    return patterns.some(function (p) { return p.test(message); });
  }

  // ── Extract search query from message ────────────────────
  function extractQuery(message) {
    return message
      .replace(/^(cari|search|carikan|find|beritahu saya tentang|apa itu|siapa itu)\s+/i, '')
      .trim()
      .substring(0, 100);
  }

  // ── Integration with sendMessage ─────────────────────────
  // Called before AI response when mode=search
  window.WebSearchPlugin = {
    search,
    formatAsContext,
    renderSearchCard,
    isSearchQuery,
    extractQuery,

    // Full flow: search → format → prepend to AI context
    getContextForMessage: async function (message) {
      if (!isSearchQuery(message)) return null;
      var query   = extractQuery(message);
      var results = await search(query);
      if (!results.length) return null;
      return {
        context: formatAsContext(results, query),
        results: results,
        query:   query,
      };
    },
  };

  console.log('[Plugin] ✅ Web Search loaded');
})();
