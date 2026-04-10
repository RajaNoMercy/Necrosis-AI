// ============================================================
//  NECROSIS AI — PLUGIN: CODE GENERATOR (code-generator.js)
//  Enhanced code rendering: syntax highlight, copy, run button
//  Supports: 20+ languages via highlight.js or Prism fallback
// ============================================================

(function initCodeGenerator() {
  'use strict';

  // ── Load highlight.js from CDN if not present ─────────────
  var HLJS_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
  var HLJS_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';

  function loadHLJS(cb) {
    if (window.hljs) { if (cb) cb(); return; }
    // Load CSS
    if (!document.querySelector('link[href*="highlight.js"]')) {
      var link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = HLJS_CSS;
      document.head.appendChild(link);
    }
    // Load JS
    var script = document.createElement('script');
    script.src = HLJS_JS;
    script.onload = function () { if (cb) cb(); };
    document.head.appendChild(script);
  }

  // ── Language display names ────────────────────────────────
  var LANG_NAMES = {
    js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
    py: 'Python', python: 'Python', java: 'Java', cpp: 'C++', c: 'C', cs: 'C#',
    php: 'PHP', rb: 'Ruby', go: 'Go', rs: 'Rust', swift: 'Swift', kt: 'Kotlin',
    html: 'HTML', css: 'CSS', scss: 'SCSS', sql: 'SQL', sh: 'Bash', bash: 'Bash',
    json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML', md: 'Markdown',
    jsx: 'React JSX', tsx: 'React TSX', vue: 'Vue', dart: 'Dart',
    r: 'R', lua: 'Lua', perl: 'Perl', asm: 'Assembly',
  };

  // ── Runnable languages in browser ────────────────────────
  var RUNNABLE = ['js', 'javascript', 'html', 'css'];

  // ── Build enhanced code block ─────────────────────────────
  function buildCodeBlock(code, lang) {
    var langKey  = (lang || 'plaintext').toLowerCase();
    var langName = LANG_NAMES[langKey] || lang || 'Code';
    var isRun    = RUNNABLE.includes(langKey);
    var id       = 'code-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    var container = document.createElement('div');
    container.className = 'necro-code-block';
    container.style.cssText = 'background:#1a1a2e;border:1px solid rgba(230,0,0,0.25);' +
      'border-radius:10px;overflow:hidden;margin:10px 0;font-size:13px;';

    // Header bar
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
      'padding:6px 12px;background:rgba(230,0,0,0.12);border-bottom:1px solid rgba(230,0,0,0.15);';

    var langBadge = document.createElement('span');
    langBadge.style.cssText = 'font-size:11px;color:var(--primary);font-weight:600;letter-spacing:1px;';
    langBadge.textContent = langName.toUpperCase();

    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:6px;';

    // Copy button
    var copyBtn = _makeBtn('<i class="fas fa-copy"></i> Salin', 'var(--gray)');
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(code).then(function () {
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Disalin!';
        copyBtn.style.color = '#00c864';
        setTimeout(function () {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
          copyBtn.style.color = 'var(--gray)';
        }, 1500);
      }).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    });
    btnGroup.appendChild(copyBtn);

    // Run button (JS/HTML only)
    if (isRun) {
      var runBtn = _makeBtn('<i class="fas fa-play"></i> Run', '#00c864');
      runBtn.addEventListener('click', function () {
        runCode(code, langKey);
      });
      btnGroup.appendChild(runBtn);
    }

    // Expand/collapse
    var expandBtn = _makeBtn('<i class="fas fa-expand-alt"></i>', 'var(--gray)');
    expandBtn.title = 'Expand';
    var isExpanded = false;
    expandBtn.addEventListener('click', function () {
      isExpanded = !isExpanded;
      pre.style.maxHeight = isExpanded ? 'none' : '320px';
      expandBtn.innerHTML = isExpanded
        ? '<i class="fas fa-compress-alt"></i>'
        : '<i class="fas fa-expand-alt"></i>';
    });
    btnGroup.appendChild(expandBtn);

    header.appendChild(langBadge);
    header.appendChild(btnGroup);

    // Code area
    var pre  = document.createElement('pre');
    var codeEl = document.createElement('code');
    pre.style.cssText = 'margin:0;padding:14px 16px;overflow-x:auto;max-height:320px;' +
      'overflow-y:auto;scrollbar-width:thin;background:transparent;';
    codeEl.className = 'language-' + langKey;
    codeEl.style.cssText = 'font-family:"Fira Code","Cascadia Code",Consolas,monospace;' +
      'font-size:13px;line-height:1.6;';
    codeEl.textContent = code;

    // Apply highlight
    if (window.hljs) {
      try { window.hljs.highlightElement(codeEl); } catch (e) {}
    } else {
      loadHLJS(function () {
        try { window.hljs.highlightElement(codeEl); } catch (e) {}
      });
    }

    pre.appendChild(codeEl);
    container.appendChild(header);
    container.appendChild(pre);

    return container;
  }

  // ── Run code in sandbox ───────────────────────────────────
  function runCode(code, lang) {
    if (lang === 'html') {
      // Open in iframe overlay
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;' +
        'display:flex;flex-direction:column;';
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
        'padding:10px 16px;background:#1a1a2e;border-bottom:1px solid rgba(230,0,0,0.3);';
      bar.innerHTML = '<span style="color:var(--primary);font-weight:600;">' +
        '<i class="fas fa-play"></i> HTML Preview</span>';
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Tutup';
      closeBtn.style.cssText = 'background:rgba(230,0,0,0.2);border:1px solid rgba(230,0,0,0.4);' +
        'color:white;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:13px;';
      closeBtn.onclick = function () { document.body.removeChild(overlay); };
      bar.appendChild(closeBtn);
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'flex:1;border:none;background:white;';
      iframe.sandbox = 'allow-scripts allow-forms allow-modals';
      overlay.appendChild(bar);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);
      iframe.srcdoc = code;
    } else {
      // JS: run in console overlay
      var output = '';
      var origLog = console.log;
      var origErr = console.error;
      var logs = [];
      console.log   = function () { logs.push('[LOG] ' + Array.from(arguments).join(' ')); origLog.apply(console, arguments); };
      console.error = function () { logs.push('[ERR] ' + Array.from(arguments).join(' ')); origErr.apply(console, arguments); };
      try { (new Function(code))(); }
      catch (e) { logs.push('[EXCEPTION] ' + e.message); }
      finally { console.log = origLog; console.error = origErr; }
      output = logs.join('\n') || '(no output)';

      // Show output
      var outDiv = document.createElement('div');
      outDiv.style.cssText = 'background:#0d0d1a;border:1px solid rgba(0,200,100,0.3);' +
        'border-radius:8px;padding:12px;margin-top:6px;';
      outDiv.innerHTML = '<div style="color:#00c864;font-size:11px;margin-bottom:6px;">' +
        '<i class="fas fa-terminal"></i> OUTPUT</div>' +
        '<pre style="margin:0;color:#e0e0e0;font-size:12px;white-space:pre-wrap;">' +
        _escapeHtml(output) + '</pre>';

      // Append after the code block
      var block = document.activeElement;
      if (block) block.closest('.necro-code-block')?.insertAdjacentElement('afterend', outDiv);
    }
  }

  // ── Replace all <pre><code> in a message element ──────────
  function enhanceCodeBlocks(messageEl) {
    var preBlocks = messageEl.querySelectorAll('pre code');
    preBlocks.forEach(function (codeEl) {
      var lang = (codeEl.className.match(/language-(\w+)/) || [])[1] || '';
      var code = codeEl.textContent || '';
      var newBlock = buildCodeBlock(code, lang);
      var pre = codeEl.parentElement;
      if (pre && pre.parentElement) {
        pre.parentElement.replaceChild(newBlock, pre);
      }
    });
  }

  // ── Observe chat for new AI messages ─────────────────────
  var chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    loadHLJS(function () {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.classList && node.classList.contains('ai')) {
              setTimeout(function () { enhanceCodeBlocks(node); }, 100);
            }
          });
        });
      }).observe(chatContainer, { childList: true, subtree: false });
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  function _makeBtn(html, color) {
    var btn = document.createElement('button');
    btn.innerHTML = html;
    btn.style.cssText = 'background:none;border:none;color:' + color + ';cursor:pointer;' +
      'font-size:11px;padding:3px 7px;border-radius:5px;transition:all 0.2s;' +
      'font-family:Poppins,sans-serif;';
    btn.addEventListener('mouseenter', function () {
      this.style.background = 'rgba(255,255,255,0.08)';
    });
    btn.addEventListener('mouseleave', function () {
      this.style.background = 'none';
    });
    return btn;
  }

  function _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Global API ────────────────────────────────────────────
  window.CodeGeneratorPlugin = {
    buildCodeBlock,
    enhanceCodeBlocks,
    runCode,
  };

  console.log('[Plugin] ✅ Code Generator Loaded');
})();
