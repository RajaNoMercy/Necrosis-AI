// ============================================================
//  NECROSIS AI — TOOL: NGL SPAM (ngl-spam.js)
//  Kirim pesan anonim massal ke NGL.link username
// ============================================================

(function initNGLSpam() {
  'use strict';

  var btn = document.getElementById('tool-ngl-spam-btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    if (!window._isOnline) {
      showModal('Tidak Ada Koneksi', 'fas fa-wifi-slash', 'Perlu internet.');
      return;
    }

    switchView('tools');

    var inputHtml = `
      <input type="text" id="ngl-username" class="tool-input-field"
        placeholder="👤 Username NGL (tanpa ngl.link/)"
        style="width:100%;background:var(--darker);border:1px solid var(--border);border-radius:8px;
        padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;margin-bottom:8px;" />
      <textarea id="ngl-message" class="tool-input-field" rows="3"
        placeholder="💬 Pesan yang akan dikirim..."
        style="width:100%;background:var(--darker);border:1px solid var(--border);border-radius:8px;
        padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;
        margin-bottom:8px;resize:vertical;"></textarea>
      <input type="number" id="ngl-count" class="tool-input-field" value="10" min="1" max="500"
        placeholder="🔢 Jumlah Kiriman"
        style="width:100%;background:var(--darker);border:1px solid var(--border);border-radius:8px;
        padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;margin-bottom:8px;" />
      <p style="font-size:11px;color:rgba(255,165,0,0.8);margin:0;">
        ⚠️ Gunakan fitur ini dengan bijak dan bertanggung jawab.
      </p>`;

    showToolInput('💬 Spam NGL.link', inputHtml, 'Mulai Spam', async function () {
      var username = (document.getElementById('ngl-username')?.value || '').trim().replace(/^ngl\.link\//i, '');
      var message  = (document.getElementById('ngl-message')?.value || '').trim();
      var count    = parseInt(document.getElementById('ngl-count')?.value) || 10;

      if (!username || !message) {
        showModal('Username dan pesan wajib diisi!', 'fas fa-exclamation-triangle', 'Error');
        return;
      }
      if (count > 500) count = 500;

      // Show log area
      var toolOutputArea = document.getElementById('tool-output-area');
      if (toolOutputArea) {
        toolOutputArea.style.display = 'block';
        toolOutputArea.innerHTML = `
          <h3 style="color:var(--primary);margin-bottom:10px;">
            <i class="fas fa-terminal"></i> Log NGL Spam — @${username}
          </h3>
          <pre id="ngl-log" style="background:var(--darker);border:1px solid var(--border);
            border-radius:8px;padding:12px;font-size:12px;max-height:300px;overflow-y:auto;
            color:#e0e0e0;line-height:1.8;"></pre>
          <div style="display:flex;gap:16px;margin-top:10px;font-size:13px;">
            <span>✅ Berhasil: <b id="ngl-ok" style="color:#00c864;">0</b></span>
            <span>❌ Gagal: <b id="ngl-fail" style="color:#ff4444;">0</b></span>
            <span>📊 Progress: <b id="ngl-prog" style="color:var(--primary);">0/${count}</b></span>
          </div>`;
      }

      var logEl  = document.getElementById('ngl-log');
      var okEl   = document.getElementById('ngl-ok');
      var failEl = document.getElementById('ngl-fail');
      var progEl = document.getElementById('ngl-prog');
      var execBtn = document.getElementById('tool-execute-btn');

      var successCount = 0, failCount = 0, stopSpam = false;

      if (execBtn) {
        execBtn.textContent   = '⏹ STOP';
        execBtn.style.background = 'var(--secondary)';
        execBtn.onclick = function () {
          stopSpam = true;
          execBtn.textContent = '⏹ Dihentikan';
          execBtn.disabled = true;
          addLog('🚨 Spam dihentikan oleh user.');
          showModal('Dihentikan oleh user', 'fas fa-stop-circle', 'Stop!');
        };
      }

      function addLog(txt) {
        if (!logEl) return;
        logEl.textContent += '[' + new Date().toLocaleTimeString('id-ID') + '] ' + txt + '\n';
        logEl.scrollTop = logEl.scrollHeight;
      }

      function updateStats() {
        if (okEl)   okEl.textContent   = successCount;
        if (failEl) failEl.textContent = failCount;
        if (progEl) progEl.textContent = (successCount + failCount) + '/' + count;
      }

      addLog('🚀 Memulai spam ke ngl.link/' + username);
      addLog('📦 Total: ' + count + ' pesan | Delay: 1000ms');

      for (var i = 1; i <= count; i++) {
        if (stopSpam) break;
        addLog('📤 Mengirim pesan ' + i + '/' + count + '...');
        try {
          var apiUrl = 'https://api.fikmydomainsz.xyz/tools/spamngl?url=' +
            encodeURIComponent('https://ngl.link/' + username) +
            '&message=' + encodeURIComponent(message);
          var res  = await fetch(apiUrl);
          var data = await res.json();

          if (data.status === true) {
            successCount++;
            addLog('✅ Berhasil: Pesan ke-' + i + ' terkirim.');
          } else {
            failCount++;
            addLog('❌ Gagal ke-' + i + ': ' + (data.message || 'Status FALSE'));
          }
        } catch (err) {
          failCount++;
          addLog('❌ Error ke-' + i + ': ' + err.message);
        }
        updateStats();
        await sleep(1000);
      }

      if (!stopSpam) {
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addLog('✅ Selesai! Berhasil: ' + successCount + ' | Gagal: ' + failCount);
        showModal('✅ ' + successCount + ' berhasil, ❌ ' + failCount + ' gagal',
          'fas fa-check-circle', 'Selesai!');
      }

      if (execBtn) {
        execBtn.textContent   = 'Mulai Spam';
        execBtn.style.background = '';
        execBtn.disabled      = false;
        execBtn.onclick       = null;
      }
    });
  });

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function showModal(t, i, b) { if (typeof window.showModalNotification === 'function') window.showModalNotification(t, i, b); }
  function switchView(v)       { if (typeof window.switchView === 'function') window.switchView(v); }
  function showToolInput(t, h, b, fn) { if (typeof window.showToolInput === 'function') window.showToolInput(t, h, b, fn); }

  window.NGLSpamTool = { init: true };
  console.log('[Tool] ✅ NGL Spam Loaded');
})();
