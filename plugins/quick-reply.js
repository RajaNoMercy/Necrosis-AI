// ============================================================
//  NECROSIS AI — PLUGIN: QUICK REPLY (quick-reply.js)
//  FIXED v3: bottom 78px = tepat di atas input area
//  Tidak nutupin textarea sama sekali
// ============================================================
(function initQuickReply() {
  'use strict';

  var QR_KEY     = 'necrosis_quick_replies';
  var DEFAULT_QR = [
    'Jelaskan lebih detail',
    'Berikan contoh kode',
    'Terjemahkan ke Indonesia',
    'Buat lebih singkat',
    'Kelebihan & kekurangan?',
    'Berikan alternatif lain',
  ];

  function loadQR() {
    try { return JSON.parse(localStorage.getItem(QR_KEY)) || DEFAULT_QR; }
    catch (e) { return DEFAULT_QR; }
  }

  // Hapus kalau sudah ada (prevent duplicate)
  var existing = document.getElementById('quick-reply-bar');
  if (existing) existing.remove();

  var qrWrap = document.createElement('div');
  qrWrap.id  = 'quick-reply-bar';

  function renderQR() {
    qrWrap.innerHTML = '';
    loadQR().forEach(function (qr) {
      var b = document.createElement('button');
      b.className   = 'qr-chip';
      b.textContent = qr;
      b.addEventListener('click', function () {
        var pi = document.getElementById('prompt-input');
        if (pi) {
          pi.value = qr;
          pi.dispatchEvent(new Event('input'));
          pi.focus();
        }
      });
      qrWrap.appendChild(b);
    });
  }

  // Append ke body — bukan di dalam #input-area!
  document.body.appendChild(qrWrap);
  renderQR();

  // Recalculate posisi berdasarkan tinggi actual input area
  function recalcPosition() {
    var inputArea = document.getElementById('input-area');
    var hint      = document.querySelector('.shortcut-hint');
    if (!inputArea) return;

    var inputH    = inputArea.offsetHeight || 60;
    var hintH     = hint ? hint.offsetHeight : 18;
    var totalH    = inputH + hintH + 4; // 4px gap

    qrWrap.style.bottom = totalH + 'px';
  }

  // Jalankan setelah DOM ready
  setTimeout(recalcPosition, 500);
  window.addEventListener('resize', recalcPosition);

  // Observer kalau input area berubah tinggi (saat ngetik)
  var inputArea = document.getElementById('input-area');
  if (inputArea && window.ResizeObserver) {
    new ResizeObserver(recalcPosition).observe(inputArea);
  }

  // Save button di settings
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'qr-save-btn') {
      var ta    = document.getElementById('qr-textarea');
      var lines = (ta ? ta.value : '').split('\n')
        .map(function (l) { return l.trim(); })
        .filter(Boolean);
      localStorage.setItem(QR_KEY, JSON.stringify(lines));
      renderQR();
      if (typeof window.toast === 'function') window.toast('✅ Quick reply disimpan!');
    }
  });

  window.QuickReplyPlugin = { render: renderQR, load: loadQR, recalc: recalcPosition };
  console.log('[Plugin] ✅ Quick Reply loaded — auto position');
})();
