// ============================================================
//  NECROSIS AI — PLUGIN: EXPORT CHAT (export-chat.js)
//  Export: TXT, PDF, JSON, Markdown
//  Batch export semua chat sekaligus
// ============================================================

(function initExportChat() {
  'use strict';

  var CHATS_KEY = 'necrosis_ai_chats';

  // ── Get all chats ────────────────────────────────────────
  function getAllChats() {
    try { return JSON.parse(localStorage.getItem(CHATS_KEY)) || []; }
    catch (e) { return []; }
  }

  function getCurrentChatMessages() {
    var chats = getAllChats();
    var idx   = parseInt(localStorage.getItem('currentChatIndex') || '-1');
    if (idx < 0 || idx >= chats.length) return [];
    return (chats[idx].messages || []).filter(function (m) { return !m.isInitial; });
  }

  // ── Export as TXT ─────────────────────────────────────────
  function exportAsTXT(chatTitle) {
    var msgs = getCurrentChatMessages();
    if (!msgs.length) { toast('⚠️ Tidak Ada Pesan Untuk Diekspor.'); return; }

    var header = [
      '================================================',
      '  NECROSIS AI — CHAT EXPORT',
      '  Judul  : ' + (chatTitle || 'Chat'),
      '  Tanggal: ' + new Date().toLocaleString('id-ID'),
      '================================================',
      '',
    ].join('\n');

    var body = msgs.map(function (m) {
      var sender = m.sender === 'user' ? '👤 Kamu' : '🤖 Necrosis AI';
      var time   = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('id-ID') : '';
      return '[' + time + '] ' + sender + ':\n' + (m.text || '') + '\n';
    }).join('\n');

    downloadFile(header + body, 'necrosis-chat-' + Date.now() + '.txt', 'text/plain;charset=utf-8');
    toast('✅ Chat Berhasil Diekspor Sebagai TXT!');
  }

  // ── Export as Markdown ────────────────────────────────────
  function exportAsMarkdown(chatTitle) {
    var msgs = getCurrentChatMessages();
    if (!msgs.length) { toast('⚠️ Tidak Ada Pesan Untuk Diekspor.'); return; }

    var lines = [
      '# ' + (chatTitle || 'Necrosis AI Chat'),
      '> Diekspor: ' + new Date().toLocaleString('id-ID'),
      '',
    ];

    msgs.forEach(function (m) {
      var sender = m.sender === 'user' ? '**👤 Kamu**' : '**🤖 Necrosis AI**';
      lines.push('---');
      lines.push(sender);
      lines.push('');
      lines.push(m.text || '');
      lines.push('');
    });

    downloadFile(lines.join('\n'), 'necrosis-chat-' + Date.now() + '.md', 'text/markdown;charset=utf-8');
    toast('✅ Chat Berhasil Diekspor Sebagai Markdown!');
  }

  // ── Export as JSON ────────────────────────────────────────
  function exportAsJSON(chatTitle) {
    var chats  = getAllChats();
    var idx    = parseInt(localStorage.getItem('currentChatIndex') || '-1');
    var chat   = idx >= 0 ? chats[idx] : null;
    if (!chat) { toast('⚠️ Tidak Ada Chat Active.'); return; }

    var data = JSON.stringify({
      title:     chatTitle || chat.title || 'Chat',
      exported:  new Date().toISOString(),
      messages:  chat.messages.filter(function (m) { return !m.isInitial; }),
    }, null, 2);

    downloadFile(data, 'necrosis-chat-' + Date.now() + '.json', 'application/json');
    toast('✅ Chat Berhasil Diekspor Sebagai JSON!');
  }

  // ── Export as PDF (uses browser print) ───────────────────
  function exportAsPDF(chatTitle) {
    var msgs = getCurrentChatMessages();
    if (!msgs.length) { toast('⚠️ Tidak Ada Pesan Hntuk Diekspor.'); return; }

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>' + (chatTitle || 'Necrosis AI Chat') + '</title>' +
      '<style>' +
        'body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#fff;color:#111;}' +
        'h1{color:#e60000;border-bottom:2px solid #e60000;padding-bottom:8px;}' +
        '.msg{margin:16px 0;padding:12px;border-radius:8px;}' +
        '.user{background:#f5f5f5;border-left:4px solid #e60000;}' +
        '.ai{background:#fff8ff;border-left:4px solid #bc13fe;}' +
        '.sender{font-weight:bold;margin-bottom:4px;}' +
        '.time{font-size:11px;color:#888;margin-bottom:4px;}' +
        'pre{background:#f0f0f0;padding:10px;border-radius:4px;overflow-x:auto;}' +
        '@media print{body{padding:10px;}}' +
      '</style></head><body>' +
      '<h1>🤖 ' + (chatTitle || 'Necrosis AI Chat') + '</h1>' +
      '<p style="color:#666;font-size:13px;">Diekspor: ' + new Date().toLocaleString('id-ID') + '</p>';

    msgs.forEach(function (m) {
      var isUser = m.sender === 'user';
      var sender = isUser ? '👤 Kamu' : '🤖 Necrosis AI';
      var time   = m.timestamp ? new Date(m.timestamp).toLocaleString('id-ID') : '';
      var text   = (m.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += '<div class="msg ' + (isUser ? 'user' : 'ai') + '">' +
        '<div class="sender">' + sender + '</div>' +
        '<div class="time">' + time + '</div>' +
        '<div>' + text.replace(/\n/g, '<br>') + '</div></div>';
    });

    html += '</body></html>';

    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = function () { win.print(); };
    toast('✅ Print dialog dibuka untuk PDF!');
  }

  // ── Batch export semua chat ───────────────────────────────
  function batchExportAll() {
    var chats = getAllChats();
    if (!chats.length) { toast('⚠️ Tidak Ada Chat Untuk Diekspor!'); return; }

    var output = chats.map(function (chat, i) {
      var title = chat.title || ('Chat ' + (i + 1));
      var msgs  = (chat.messages || [])
        .filter(function (m) { return !m.isInitial; })
        .map(function (m) {
          return (m.sender === 'user' ? '👤 Kamu' : '🤖 Necrosis AI') + ':\n' + (m.text || '');
        }).join('\n\n');
      return '═══════════════════════════════\n' + title + '\n═══════════════════════════════\n' + msgs;
    }).join('\n\n');

    downloadFile(output, 'NecrosisAI_AllChats_' + Date.now() + '.txt', 'text/plain;charset=utf-8');
    toast('✅ ' + chats.length + ' Cchat Berhasil Diekspor!');
  }

  // ── Helper: download blob ────────────────────────────────
  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    alert(msg);
  }

  // ── Bind buttons ─────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var id = e.target && (e.target.id || (e.target.closest && e.target.closest('[id]')?.id));
    if (id === 'export-txt-btn')   exportAsTXT();
    if (id === 'export-pdf-btn')   exportAsPDF();
    if (id === 'batch-export-btn') batchExportAll();
  });

  // ── Global API ────────────────────────────────────────────
  window.ExportChatPlugin = {
    exportAsTXT,
    exportAsPDF,
    exportAsMarkdown,
    exportAsJSON,
    batchExportAll,
  };

  console.log('[Plugins] ✅ Export Chat Loaded');
})();
