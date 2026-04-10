// ============================================================
//  NECROSIS AI — PLUGIN: SYNTAX HIGHLIGHT (syntax-highlight.js)
//  Warnain semua code block dari AI menggunakan highlight.js
//  + Pilihan tema warna di Settings
// ============================================================

(function initSyntaxHighlight() {
  'use strict';

  var THEME_KEY = 'necrosis_code_theme';

  // ── Daftar tema highlight.js ────────────────────────────
  var THEMES = [
    { id: 'atom-one-dark',     name: '🌑 Atom Dark',      url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css' },
    { id: 'github-dark',       name: '🐙 GitHub Dark',    url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css' },
    { id: 'monokai',           name: '🎨 Monokai',        url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai.min.css' },
    { id: 'dracula',           name: '🧛 Dracula',        url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/dracula.min.css' },
    { id: 'nord',              name: '🧊 Nord',           url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/nord.min.css' },
    { id: 'tokyo-night-dark',  name: '🗼 Tokyo Night',    url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/tokyo-night-dark.min.css' },
    { id: 'vs2015',            name: '💙 VS Code Dark',   url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css' },
    { id: 'agate',             name: '🔥 Agate',          url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/agate.min.css' },
  ];

  var currentThemeId = localStorage.getItem(THEME_KEY) || 'atom-one-dark';

  // ── Load highlight.js core ──────────────────────────────
  var HLJS_JS = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';

  function loadHLJS(cb) {
    if (window.hljs) { cb(); return; }
    var s = document.createElement('script');
    s.src = HLJS_JS;
    s.onload = cb;
    document.head.appendChild(s);
  }

  // ── Load tema CSS ───────────────────────────────────────
  var themeLink = document.createElement('link');
  themeLink.rel  = 'stylesheet';
  themeLink.id   = 'hljs-theme-link';
  document.head.appendChild(themeLink);

  function applyTheme(themeId) {
    var theme = THEMES.find(function(t) { return t.id === themeId; }) || THEMES[0];
    themeLink.href = theme.url;
    currentThemeId = themeId;
    localStorage.setItem(THEME_KEY, themeId);

    // Update selector UI
    document.querySelectorAll('.code-theme-opt').forEach(function(el) {
      var isActive = el.dataset.theme === themeId;
      el.style.border     = isActive ? '2px solid var(--primary)' : '1px solid var(--border)';
      el.style.background = isActive ? 'rgba(230,0,0,0.12)' : 'var(--dark)';
      el.style.color      = isActive ? 'var(--primary)' : 'var(--light)';
    });

    // Re-highlight semua kode yang sudah ada
    if (window.hljs) {
      document.querySelectorAll('.ai pre code').forEach(function(el) {
        if (!el.dataset.highlighted) return;
        delete el.dataset.highlighted;
        window.hljs.highlightElement(el);
      });
    }
  }

  // Terapkan tema awal
  applyTheme(currentThemeId);

  // ── Inject code block yang keren ───────────────────────
  function enhanceCodeBlock(wrapper) {
    if (wrapper.dataset.enhanced) return;
    wrapper.dataset.enhanced = '1';

    var pre   = wrapper.querySelector('pre');
    var code  = wrapper.querySelector('code');
    var langEl = wrapper.querySelector('.code-language');
    if (!pre || !code) return;

    var lang = (langEl ? langEl.textContent : '').toLowerCase().replace('.', '') || 'plaintext';

    // ── Style wrapper ──
    wrapper.style.cssText = [
      'position:relative',
      'margin:10px 0',
      'border-radius:12px',
      'overflow:hidden',
      'border:1px solid rgba(255,255,255,0.08)',
      'box-shadow:0 4px 16px rgba(0,0,0,0.4)',
    ].join(';');

    // ── Header bar (bahasa + tombol) ──
    var existingHeader = wrapper.querySelector('.code-header');
    if (!existingHeader) {
      var header = document.createElement('div');
      header.className = 'code-header';
      header.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'padding:8px 14px',
        'background:rgba(0,0,0,0.35)',
        'border-bottom:1px solid rgba(255,255,255,0.06)',
      ].join(';');

      // Kiri: dots + nama bahasa
      var left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:8px;';
      left.innerHTML =
        '<div style="display:flex;gap:5px;">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:#ff5f56;"></div>' +
          '<div style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;"></div>' +
          '<div style="width:10px;height:10px;border-radius:50%;background:#27c93f;"></div>' +
        '</div>' +
        '<span style="font-size:11px;color:rgba(255,255,255,0.5);font-family:monospace;letter-spacing:1px;">' +
          getLangName(lang) +
        '</span>';

      // Kanan: tombol copy
      var copyBtn = document.createElement('button');
      copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
      copyBtn.style.cssText = [
        'background:rgba(255,255,255,0.08)',
        'border:1px solid rgba(255,255,255,0.12)',
        'color:rgba(255,255,255,0.6)',
        'padding:4px 10px',
        'border-radius:6px',
        'font-size:11px',
        'cursor:pointer',
        'font-family:Poppins,sans-serif',
        'transition:all 0.2s',
      ].join(';');

      copyBtn.addEventListener('click', function() {
        var text = code.innerText || code.textContent || '';
        navigator.clipboard.writeText(text).then(function() {
          copyBtn.innerHTML = '<i class="fas fa-check"></i> Disalin!';
          copyBtn.style.color = '#00c864';
          copyBtn.style.borderColor = 'rgba(0,200,100,0.4)';
          setTimeout(function() {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
            copyBtn.style.color = 'rgba(255,255,255,0.6)';
            copyBtn.style.borderColor = 'rgba(255,255,255,0.12)';
          }, 1500);
        });
      });

      header.appendChild(left);
      header.appendChild(copyBtn);
      wrapper.insertBefore(header, wrapper.firstChild);
    }

    // ── Style pre ──
    pre.style.cssText = [
      'margin:0',
      'padding:14px 16px',
      'overflow-x:auto',
      'font-size:13px',
      'line-height:1.6',
      'border-radius:0',
      'background:transparent',
      'white-space:pre',
      'word-wrap:normal',
    ].join(';');

    // ── Style code ──
    code.style.cssText = [
      'font-family:"Fira Code","Cascadia Code","JetBrains Mono",Consolas,monospace',
      'font-size:13px',
      'background:transparent',
    ].join(';');

    // Set language class untuk hljs
    if (lang && lang !== 'plaintext') {
      code.className = 'language-' + lang;
    }

    // ── Syntax highlight ──
    if (window.hljs && !code.dataset.highlighted) {
      try { window.hljs.highlightElement(code); }
      catch(e) {}
    }

    // ── Hide original copy-code-btn (dari script.js) ──
    wrapper.querySelectorAll('.copy-code-btn').forEach(function(btn) {
      // Kalau bukan dari header plugin ini, sembunyikan
      if (!btn.closest('.code-header')) {
        btn.style.display = 'none';
      }
    });

    // ── Hide original language badge ──
    if (langEl) langEl.style.display = 'none';
  }

  function getLangName(lang) {
    var names = {
      js: 'JavaScript', javascript: 'JavaScript',
      ts: 'TypeScript', typescript: 'TypeScript',
      py: 'Python', python: 'Python',
      java: 'Java', cpp: 'C++', c: 'C', cs: 'C#',
      html: 'HTML', css: 'CSS', scss: 'SCSS',
      php: 'PHP', rb: 'Ruby', go: 'Go', rs: 'Rust',
      swift: 'Swift', kt: 'Kotlin', dart: 'Dart',
      sql: 'SQL', sh: 'Bash', bash: 'Bash',
      json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML',
      jsx: 'React JSX', tsx: 'React TSX', vue: 'Vue',
      plaintext: 'Code', text: 'Text',
    };
    return names[lang] || lang.toUpperCase();
  }

  // ── Observe chat untuk highlight kode baru ─────────────
  function observeChat() {
    var chatContainer = document.getElementById('chat-container');
    if (!chatContainer) { setTimeout(observeChat, 500); return; }

    // Highlight yang sudah ada
    chatContainer.querySelectorAll('.ai .code-block-wrapper').forEach(enhanceCodeBlock);

    // Observe baru
    new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('ai')) {
            // Delay sedikit biar innerHTML selesai dirender
            setTimeout(function() {
              node.querySelectorAll('.code-block-wrapper').forEach(enhanceCodeBlock);
            }, 100);
          }
        });
      });
    }).observe(chatContainer, { childList: true });
  }

  // ── Tambah Code Theme Selector di Settings ─────────────
  function addThemeSettings() {
    var settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) { setTimeout(addThemeSettings, 800); return; }

    // Cek kalau sudah ada
    if (document.getElementById('code-theme-section')) return;

    var section = document.createElement('div');
    section.id  = 'code-theme-section';
    section.className = 'settings-item';
    section.innerHTML =
      '<label><i class="fas fa-code" style="color:var(--primary);"></i> Tema Warna Kode</label>' +
      '<p style="font-size:11px;color:var(--gray);margin-bottom:10px;">' +
        '<i class="fas fa-info-circle"></i> Pilih warna syntax highlighting untuk kode dari AI' +
      '</p>' +
      '<div id="code-theme-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>';

    settingsPanel.appendChild(section);

    var grid = document.getElementById('code-theme-grid');
    THEMES.forEach(function(theme) {
      var btn = document.createElement('button');
      btn.className      = 'code-theme-opt';
      btn.dataset.theme  = theme.id;
      btn.textContent    = theme.name;
      btn.style.cssText = [
        'padding:8px 10px',
        'border-radius:8px',
        'cursor:pointer',
        'font-size:12px',
        'font-family:Poppins,sans-serif',
        'transition:all 0.2s',
        'text-align:left',
        'background:var(--dark)',
        'border:1px solid var(--border)',
        'color:var(--light)',
      ].join(';');

      btn.addEventListener('click', function() {
        applyTheme(theme.id);
        if (typeof window.toast === 'function') window.toast('🎨 Tema: ' + theme.name);
      });

      grid.appendChild(btn);
    });

    // Apply active state
    applyTheme(currentThemeId);
  }

  // ── Init ───────────────────────────────────────────────
  loadHLJS(function() {
    observeChat();
    addThemeSettings();
    console.log('[Plugin] ✅ Syntax Highlight loaded — theme:', currentThemeId);
  });

  window.SyntaxHighlightPlugin = {
    applyTheme,
    themes: THEMES,
    reHighlight: function() {
      document.querySelectorAll('.ai .code-block-wrapper').forEach(function(w) {
        delete w.dataset.enhanced;
        enhanceCodeBlock(w);
      });
    },
  };

})();
