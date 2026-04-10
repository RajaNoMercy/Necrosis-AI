// ============================================================
//  NECROSIS AI — PLUGIN: AI FILE SENDER (ai-file-sender.js)
//  AI bisa kirim file, dokumen, gambar, link sebagai response
//  Deteksi otomatis dari text AI lalu render attachment card
// ============================================================

(function initAIFileSender() {
  'use strict';

  // ── System prompt tambahan untuk AI ──────────────────────
  // Inject instruksi ke AI biar tau cara "kirim file"
  var FILE_INSTRUCTION = `
[KEMAMPUAN PENGIRIMAN FILE]
Kamu bisa mengirim file, dokumen, gambar, dan link kepada user dengan format khusus:

1. KIRIM FILE/DOKUMEN (konten teks):
[SEND_FILE:namafile.ext]
isi konten file di sini
[/SEND_FILE]

2. KIRIM GAMBAR (dari URL):
[SEND_IMAGE:https://url-gambar.com/foto.jpg|Deskripsi gambar]

3. KIRIM LINK:
[SEND_LINK:https://url.com|Judul Link|Deskripsi singkat]

4. KIRIM KODE SEBAGAI FILE:
[SEND_CODE:namafile.js|javascript]
kode di sini
[/SEND_CODE]

Gunakan format ini kapanpun user minta file, dokumen, kode untuk didownload, atau ketika lebih baik memberikan konten sebagai file yang bisa didownload.
`;

  // Inject ke fetch patch
  var _origFetch = window.__origFetch || window.fetch;
  window.__origFetch = _origFetch;
  window.fetch = function(url, options) {
    var isLLM = typeof url === 'string' && (
      url.includes('api.groq.com') ||
      url.includes('generativelanguage.googleapis.com') ||
      url.includes('api.cerebras.ai') ||
      url.includes('api.mistral.ai') ||
      url.includes('openrouter.ai')
    );
    if (isLLM && options && options.body) {
      try {
        var body = JSON.parse(options.body);
        if (body.messages) {
          var sysIdx = body.messages.findIndex(function(m) { return m.role === 'system'; });
          if (sysIdx >= 0) {
            if (!body.messages[sysIdx].content.includes('[KEMAMPUAN PENGIRIMAN FILE]')) {
              body.messages[sysIdx].content += '\n' + FILE_INSTRUCTION;
              options = Object.assign({}, options, { body: JSON.stringify(body) });
            }
          }
        }
      } catch(e) {}
    }
    return _origFetch(url, options);
  };

  // ── Parser: deteksi special tags dari response AI ────────
  function parseAIResponse(text) {
    var parts  = [];
    var remain = text;

    // Regex untuk semua tags
    var patterns = [
      // [SEND_FILE:nama.ext]...[/SEND_FILE]
      { re: /\[SEND_FILE:([^\]]+)\]([\s\S]*?)\[\/SEND_FILE\]/g, type: 'file' },
      // [SEND_CODE:nama.ext|lang]...[/SEND_CODE]
      { re: /\[SEND_CODE:([^|\]]+)\|?([^\]]*)\]([\s\S]*?)\[\/SEND_CODE\]/g, type: 'code' },
      // [SEND_IMAGE:url|desc]
      { re: /\[SEND_IMAGE:([^|^\]]+)\|?([^\]]*)\]/g, type: 'image' },
      // [SEND_LINK:url|title|desc]
      { re: /\[SEND_LINK:([^|^\]]+)\|?([^|^\]]*)\|?([^\]]*)\]/g, type: 'link' },
    ];

    var attachments = [];

    patterns.forEach(function(p) {
      var m;
      p.re.lastIndex = 0;
      while ((m = p.re.exec(text)) !== null) {
        if (p.type === 'file') {
          attachments.push({ type: 'file', name: m[1].trim(), content: m[2].trim(), full: m[0] });
        } else if (p.type === 'code') {
          attachments.push({ type: 'code', name: m[1].trim(), lang: m[2].trim() || 'txt', content: m[3].trim(), full: m[0] });
        } else if (p.type === 'image') {
          attachments.push({ type: 'image', url: m[1].trim(), desc: m[2].trim() || 'Gambar', full: m[0] });
        } else if (p.type === 'link') {
          attachments.push({ type: 'link', url: m[1].trim(), title: m[2].trim() || m[1], desc: m[3].trim() || '', full: m[0] });
        }
      }
    });

    // Clean text dari tags
    var cleanText = text;
    attachments.forEach(function(a) {
      cleanText = cleanText.replace(a.full, '').trim();
    });

    return { cleanText, attachments };
  }

  // ── Render attachment card ────────────────────────────────
  function renderAttachment(att) {
    var card = document.createElement('div');
    card.className = 'ai-attachment-card';
    card.style.cssText = [
      'background:rgba(255,255,255,0.04)',
      'border:1px solid rgba(255,255,255,0.1)',
      'border-radius:12px',
      'padding:12px 14px',
      'margin:8px 0',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'cursor:pointer',
      'transition:all 0.2s',
      'max-width:100%',
    ].join(';');

    card.addEventListener('mouseenter', function() {
      this.style.borderColor = 'rgba(230,0,0,0.4)';
      this.style.background  = 'rgba(230,0,0,0.06)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.borderColor = 'rgba(255,255,255,0.1)';
      this.style.background  = 'rgba(255,255,255,0.04)';
    });

    if (att.type === 'file' || att.type === 'code') {
      // ── File / Code download card ──
      var ext  = att.name.split('.').pop() || 'txt';
      var icon = getFileIcon(ext);
      var size = new Blob([att.content]).size;
      var sizeStr = size < 1024 ? size + ' B' : (size/1024).toFixed(1) + ' KB';
      var mimeType = getMimeType(ext);

      card.innerHTML =
        '<div style="width:42px;height:42px;border-radius:10px;background:rgba(230,0,0,0.15);' +
        'display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' +
        icon + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;font-weight:600;color:var(--light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + att.name + '</div>' +
          '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + ext.toUpperCase() + ' · ' + sizeStr + '</div>' +
        '</div>' +
        '<button style="background:var(--primary);border:none;color:white;padding:7px 14px;' +
        'border-radius:8px;font-size:12px;cursor:pointer;font-family:Poppins,sans-serif;' +
        'display:flex;align-items:center;gap:5px;flex-shrink:0;font-weight:600;">' +
        '<i class="fas fa-download"></i> Download</button>';

      card.querySelector('button').addEventListener('click', function(e) {
        e.stopPropagation();
        downloadContent(att.content, att.name, mimeType);
        toast('⬇️ Mendownload ' + att.name + '...');
      });

      card.addEventListener('click', function() {
        downloadContent(att.content, att.name, mimeType);
        toast('⬇️ Mendownload ' + att.name + '...');
      });

    } else if (att.type === 'image') {
      // ── Image card ──
      card.style.flexDirection = 'column';
      card.style.alignItems    = 'flex-start';
      card.innerHTML =
        '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">' +
        '<i class="fas fa-image" style="color:var(--primary);"></i> ' + att.desc + '</div>' +
        '<img src="' + att.url + '" alt="' + att.desc + '" style="width:100%;border-radius:8px;' +
        'max-height:300px;object-fit:cover;cursor:zoom-in;" loading="lazy">' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button class="img-open-btn" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);' +
          'color:var(--light);padding:5px 12px;border-radius:7px;font-size:11px;cursor:pointer;">' +
          '<i class="fas fa-external-link-alt"></i> Buka</button>' +
          '<button class="img-dl-btn" style="background:var(--primary);border:none;color:white;' +
          'padding:5px 12px;border-radius:7px;font-size:11px;cursor:pointer;font-weight:600;">' +
          '<i class="fas fa-download"></i> Download</button>' +
        '</div>';

      card.querySelector('.img-open-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        window.open(att.url, '_blank');
      });
      card.querySelector('.img-dl-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        var a = document.createElement('a');
        a.href = att.url; a.download = att.desc + '.jpg'; a.target = '_blank';
        a.click();
        toast('⬇️ Mendownload gambar...');
      });

      // Zoom on click
      card.querySelector('img').addEventListener('click', function() {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;' +
          'display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        var big = document.createElement('img');
        big.src = att.url;
        big.style.cssText = 'max-width:95vw;max-height:95vh;border-radius:8px;';
        overlay.appendChild(big);
        overlay.addEventListener('click', function() { document.body.removeChild(overlay); });
        document.body.appendChild(overlay);
      });

    } else if (att.type === 'link') {
      // ── Link card ──
      card.innerHTML =
        '<div style="width:42px;height:42px;border-radius:10px;background:rgba(0,168,255,0.15);' +
        'display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' +
        '🔗</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;font-weight:600;color:#58a6ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + att.title + '</div>' +
          (att.desc ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + att.desc + '</div>' : '') +
          '<div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + att.url + '</div>' +
        '</div>' +
        '<button style="background:rgba(0,168,255,0.15);border:1px solid rgba(0,168,255,0.3);' +
        'color:#58a6ff;padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer;flex-shrink:0;">' +
        '<i class="fas fa-external-link-alt"></i></button>';

      card.addEventListener('click', function() { window.open(att.url, '_blank'); });
      card.querySelector('button').addEventListener('click', function(e) {
        e.stopPropagation();
        window.open(att.url, '_blank');
      });
    }

    return card;
  }

  // ── Hook ke addMessage — intercept AI response ────────────
  var chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1 || !node.classList.contains('ai')) return;
          if (node.dataset.fileParsed) return;
          node.dataset.fileParsed = '1';

          // Ambil semua text node (bukan action buttons)
          var textContent = '';
          node.childNodes.forEach(function(child) {
            if (child.nodeType === 3) textContent += child.textContent;
            else if (child.nodeType === 1 && !child.classList.contains('message-actions') &&
                     !child.classList.contains('copy-text-btn-container') &&
                     !child.classList.contains('user-message-actions') &&
                     !child.classList.contains('reaction-buttons')) {
              textContent += child.innerText || child.textContent || '';
            }
          });

          var parsed = parseAIResponse(textContent);

          // Kalau ada attachments — render
          if (parsed.attachments.length > 0) {
            // Buat wrapper attachments
            var attWrap = document.createElement('div');
            attWrap.className = 'ai-attachments-wrap';
            attWrap.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:6px;';

            parsed.attachments.forEach(function(att) {
              attWrap.appendChild(renderAttachment(att));
            });

            // Insert sebelum action buttons
            var actionsEl = node.querySelector('.copy-text-btn-container, .reaction-buttons');
            if (actionsEl) {
              node.insertBefore(attWrap, actionsEl);
            } else {
              node.appendChild(attWrap);
            }
          }
        });
      });
    }).observe(chatContainer, { childList: true });
  }

  // ── Helper: download content as file ─────────────────────
  function downloadContent(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Helper: get file icon ─────────────────────────────────
  function getFileIcon(ext) {
    var icons = {
      js: '📜', ts: '📘', py: '🐍', html: '🌐', css: '🎨',
      json: '📋', md: '📝', txt: '📄', java: '☕', php: '🐘',
      cpp: '⚙️', c: '⚙️', cs: '💠', go: '🐹', rs: '🦀',
      swift: '🍎', kt: '🎯', dart: '🎯', sql: '🗄️',
      sh: '💻', bash: '💻', zip: '📦', pdf: '📕',
      csv: '📊', xml: '📄', yaml: '⚙️', yml: '⚙️',
    };
    return icons[ext.toLowerCase()] || '📄';
  }

  // ── Helper: get MIME type ─────────────────────────────────
  function getMimeType(ext) {
    var types = {
      js: 'application/javascript', ts: 'application/typescript',
      html: 'text/html', css: 'text/css', py: 'text/x-python',
      json: 'application/json', md: 'text/markdown', txt: 'text/plain',
      xml: 'application/xml', csv: 'text/csv', sql: 'text/x-sql',
      sh: 'application/x-sh', bash: 'application/x-sh',
    };
    return types[ext.toLowerCase()] || 'text/plain;charset=utf-8';
  }

  // ── Toast ────────────────────────────────────────────────
  function toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    var n = document.getElementById('copy-notification');
    if (!n) return;
    var sp = n.querySelector('span');
    if (sp) sp.textContent = msg;
    n.classList.add('show');
    clearTimeout(n._tid);
    n._tid = setTimeout(function() { n.classList.remove('show'); }, 2000);
  }

  // ── Global API ────────────────────────────────────────────
  window.AIFileSenderPlugin = {
    parseAIResponse,
    renderAttachment,
    downloadContent,
  };

  console.log('[Plugins] ✅ AI File Sender loaded');
})();
