// ============================================================
//  NECROSIS AI — PLUGIN: SHORTCUT PANEL (shortcut-panel.js)
//  Keyboard shortcuts panel — Ctrl+K untuk buka
// ============================================================

(function initShortcutPanel() {
  'use strict';

  var SHORTCUTS = [
    { keys: 'Ctrl + Enter',   desc: 'Kirim pesan' },
    { keys: 'Ctrl + K',       desc: 'Buka shortcut panel' },
    { keys: 'Ctrl + B',       desc: 'Buka bookmarks' },
    { keys: 'Ctrl + Shift+E', desc: 'Export chat (TXT)' },
    { keys: 'Esc',            desc: 'Tutup panel / modal' },
    { keys: '/',              desc: 'Slash commands' },
    { keys: 'Tab',            desc: 'Pilih autocomplete' },
    { keys: 'Alt + V',        desc: 'Toggle voice input' },
    { keys: 'Ctrl + /  ',     desc: 'Buka settings' },
  ];

  var modal = document.createElement('div');
  modal.id  = 'shortcut-modal';
  modal.style.cssText =
    'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);' +
    'z-index:9999;justify-content:center;align-items:center;backdrop-filter:blur(6px);';

  modal.innerHTML =
    '<div style="background:var(--sidebar-bg);border:1px solid var(--border);' +
    'border-radius:16px;padding:24px;width:90%;max-width:400px;max-height:85vh;overflow-y:auto;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
    '<h3 style="color:var(--primary);font-size:16px;margin:0;">' +
    '<i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>' +
    '<button id="shortcut-close-btn" style="background:none;border:none;color:var(--gray);' +
    'font-size:22px;cursor:pointer;line-height:1;">&times;</button></div>' +
    SHORTCUTS.map(function (s) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;' +
        'padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<span style="font-size:13px;color:var(--light);">' + s.desc + '</span>' +
        '<kbd style="background:var(--dark);border:1px solid var(--border);border-radius:6px;' +
        'padding:3px 9px;font-size:11px;color:var(--primary);font-family:monospace;">' +
        s.keys + '</kbd></div>';
    }).join('') +
    '</div>';

  document.body.appendChild(modal);

  function open()  { modal.style.display = 'flex'; }
  function close() { modal.style.display = 'none'; }

  document.getElementById('shortcut-close-btn')?.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); modal.style.display === 'flex' ? close() : open(); }
    if (e.key === 'Escape' && modal.style.display === 'flex') close();
  });

  // Bind sidebar button
  document.getElementById('open-shortcut-btn')?.addEventListener('click', function () {
    open();
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  });

  window.ShortcutPanelPlugin = { open, close };
  console.log('[Plugin] ✅ Shortcut Panel loaded');
})();
