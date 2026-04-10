// ============================================================
//  NECROSIS AI — PLUGIN: BOOKMARKS / PIN (bookmarks.js)
//  Pin & save important AI messages, search, copy, delete
// ============================================================

(function initBookmarks() {
  'use strict';

  var BM_KEY   = 'necrosis_bookmarks';
  var bookmarks = [];

  // ── Load / Save ────────────────────────────────────────────
  function loadBM() {
    try { bookmarks = JSON.parse(localStorage.getItem(BM_KEY)) || []; }
    catch (e) { bookmarks = []; }
  }
  function saveBM() {
    localStorage.setItem(BM_KEY, JSON.stringify(bookmarks));
  }

  loadBM();

  // ── Add bookmark ───────────────────────────────────────────
  function addBookmark(text, source) {
    var bm = {
      id:        'bm_' + Date.now(),
      text:      text,
      source:    source || 'AI',
      timestamp: Date.now(),
      preview:   text.substring(0, 80) + (text.length > 80 ? '...' : ''),
    };
    bookmarks.unshift(bm);
    if (bookmarks.length > 100) bookmarks.pop(); // max 100
    saveBM();
    renderBookmarks();
    if (typeof window.toast === 'function') window.toast('📌 Pesan Disimpan!');
  }

  // ── Delete bookmark ────────────────────────────────────────
  function deleteBookmark(id) {
    bookmarks = bookmarks.filter(function (b) { return b.id !== id; });
    saveBM();
    renderBookmarks();
  }

  // ── Search bookmarks ───────────────────────────────────────
  function searchBookmarks(keyword) {
    if (!keyword) return bookmarks;
    var kw = keyword.toLowerCase();
    return bookmarks.filter(function (b) {
      return b.text.toLowerCase().includes(kw);
    });
  }

  // ── Render bookmark list ───────────────────────────────────
  function renderBookmarks(keyword) {
    var list = document.getElementById('bm-list');
    if (!list) return;

    var items = keyword ? searchBookmarks(keyword) : bookmarks;

    if (!items.length) {
      list.innerHTML = '<p style="color:var(--gray);font-size:13px;text-align:center;padding:24px 12px;">' +
        (keyword ? '🔍 Tidak ada hasil untuk "' + keyword + '"' :
         'Belum ada pesan tersimpan.<br>Klik Icon 📌 Di Pesan AI Untuk Menyimpan.') + '</p>';
      return;
    }

    list.innerHTML = '';
    items.forEach(function (bm) {
      var item = document.createElement('div');
      item.className = 'bm-item';
      item.style.cssText = 'background:var(--dark);border:1px solid var(--border);border-radius:10px;' +
        'padding:12px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;';

      var time = new Date(bm.timestamp).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      item.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:12px;color:var(--gray);margin-bottom:4px;">' +
        '<i class="fas fa-bookmark" style="color:var(--primary);"></i> ' + time + '</div>' +
        '<div style="font-size:13px;color:var(--light);line-height:1.5;overflow:hidden;' +
        'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">' +
        bm.preview + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">' +
        '<button class="bm-copy-btn" data-id="' + bm.id + '" style="background:none;border:1px solid var(--border);' +
        'color:var(--gray);padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;" title="Salin">' +
        '<i class="fas fa-copy"></i></button>' +
        '<button class="bm-del-btn" data-id="' + bm.id + '" style="background:none;border:1px solid rgba(230,0,0,0.3);' +
        'color:#ff4444;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;" title="Hapus">' +
        '<i class="fas fa-trash"></i></button>' +
        '</div></div>';

      // Click to copy full text
      item.addEventListener('click', function (e) {
        if (e.target.closest('.bm-copy-btn') || e.target.closest('.bm-del-btn')) return;
        navigator.clipboard.writeText(bm.text).then(function () {
          if (typeof window.toast === 'function') window.toast('📋 Teks Disalin!');
        });
      });
      item.addEventListener('mouseenter', function () { this.style.borderColor = 'rgba(230,0,0,0.3)'; });
      item.addEventListener('mouseleave', function () { this.style.borderColor = 'var(--border)'; });

      list.appendChild(item);
    });

    // Bind copy/delete buttons
    list.querySelectorAll('.bm-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var bm = bookmarks.find(function (b) { return b.id === btn.dataset.id; });
        if (bm) navigator.clipboard.writeText(bm.text).then(function () {
          if (typeof window.toast === 'function') window.toast('📋 Disalin!');
        });
      });
    });
    list.querySelectorAll('.bm-del-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Hapus bookmark ini?')) deleteBookmark(btn.dataset.id);
      });
    });
  }

  // ── Panel open/close ───────────────────────────────────────
  function openPanel() {
    var panel = document.getElementById('bookmarks-panel');
    if (panel) {
      renderBookmarks();
      panel.classList.add('active');
    }
  }
  function closePanel() {
    var panel = document.getElementById('bookmarks-panel');
    if (panel) panel.classList.remove('active');
  }

  // ── Bind buttons ───────────────────────────────────────────
  document.getElementById('btn-bookmarks')?.addEventListener('click', function () {
    openPanel();
    var sidebar = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
  });
  document.getElementById('bm-close-btn')?.addEventListener('click', closePanel);

  // ── Attach pin button to AI messages ──────────────────────
  var chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('ai')) {
            attachPinBtn(node);
          }
        });
      });
    }).observe(chatContainer, { childList: true });
  }

  function attachPinBtn(aiNode) {
    // Check if pin button already exists
    if (aiNode.querySelector('.pin-bookmark-btn')) return;

    var actionBar = aiNode.querySelector('.message-actions');
    if (!actionBar) return;

    var btn = document.createElement('button');
    btn.className = 'pin-bookmark-btn';
    btn.title     = 'Simpan pesan ini';
    btn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    btn.style.cssText = 'background:none;border:none;color:var(--gray);cursor:pointer;' +
      'font-size:13px;padding:3px 5px;transition:color 0.2s;';
    btn.addEventListener('mouseenter', function () { this.style.color = 'var(--primary)'; });
    btn.addEventListener('mouseleave', function () { this.style.color = 'var(--gray)'; });
    btn.addEventListener('click', function () {
      var txt = aiNode.innerText || aiNode.textContent || '';
      addBookmark(txt.trim(), 'AI');
      btn.style.color = 'var(--primary)';
      btn.title = 'Tersimpan!';
    });

    actionBar.appendChild(btn);
  }

  // ── Search box in panel ────────────────────────────────────
  var bmPanel = document.getElementById('bookmarks-panel');
  if (bmPanel) {
    var searchBox = document.createElement('input');
    searchBox.type        = 'text';
    searchBox.placeholder = '🔍 Cari Bookmark...';
    searchBox.style.cssText = 'width:100%;background:var(--darker);border:1px solid var(--border);' +
      'border-radius:8px;padding:8px 12px;color:var(--light);font-family:Poppins,sans-serif;' +
      'font-size:12px;margin-bottom:10px;box-sizing:border-box;';
    searchBox.addEventListener('input', function () { renderBookmarks(this.value.trim()); });

    var list = document.getElementById('bm-list');
    if (list) bmPanel.insertBefore(searchBox, list);
  }

  // ── Global API ─────────────────────────────────────────────
  window.BookmarksPlugin = {
    add:    addBookmark,
    delete: deleteBookmark,
    search: searchBookmarks,
    render: renderBookmarks,
    open:   openPanel,
    close:  closePanel,
    getAll: function () { return bookmarks; },
    count:  function () { return bookmarks.length; },
  };

  console.log('[Plugin] ✅ Bookmarks loaded — saved:', bookmarks.length);
})();
