// ============================================================
//  NECROSIS AI — TOOL: BOT ATTACK TELEGRAM (bot-attack.js)
//  Kirim pesan massal via Telegram Bot API
// ============================================================

(function initBotAttack() {
  'use strict';

  var btn = document.getElementById('tool-bot-attack-btn');
  if (!btn) return;

  var HARDCODED_MSG = 'Mampus Ke Spam 😂. Spam Chats By Necrosis AI ϟ.';

  btn.addEventListener('click', function () {
    if (!window._isOnline) {
      showModal('Tidak Ada Koneksi', 'fas fa-wifi-slash', 'Perlu internet.');
      return;
    }

    switchView('tools');

    var inputHtml = `
      <input type="text" id="bot-token" class="tool-input-field"
        placeholder="🔑 Token Bot Telegram (dari t.me/BotFather)"
        style="width:100%;background:var(--darker);border:1px solid var(--border);border-radius:8px;
        padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;margin-bottom:8px;" />
      <input type="text" id="chat-id" class="tool-input-field"
        placeholder="🎯 Chat ID / Username Target"
        style="width:100%;background:var(--darker);border:1px solid var(--border);border-radius:8px;
        padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;margin-bottom:8px;" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <input type="number" id="bot-count" class="tool-input-field" value="10" min="1" max="999"
          placeholder="🔢 Jumlah"
          style="background:var(--darker);border:1px solid var(--border);border-radius:8px;
          padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;" />
        <input type="number" id="bot-delay" class="tool-input-field" value="1000" min="200"
          placeholder="⏱ Delay (ms)"
          style="background:var(--darker);border:1px solid var(--border);border-radius:8px;
          padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;" />
      </div>
      <div style="background:var(--dark);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;">
        <p style="font-size:12px;color:var(--gray);margin:0;">
          📨 Pesan: <span style="color:var(--primary);font-weight:600;">"${HARDCODED_MSG}"</span>
        </p>
      </div>
      <p style="font-size:11px;color:rgba(255,165,0,0.8);margin:0;">
        ⚠️ Menggunakan Telegram Bot API. Pastikan kamu punya izin ke chat target.
      </p>`;

    showToolInput('⚡ Bot Attack (Telegram)', inputHtml, 'Mulai Attack', async function () {
      var token = (document.getElementById('bot-token')?.value || '').trim();
      var chatId = (document.getElementById('chat-id')?.value || '').trim();
      var count  = parseInt(document.getElementById('bot-count')?.value) || 10;
      var delay  = parseInt(document.getElementById('bot-delay')?.value) || 1000;

      if (!token || !chatId) {
        showModal('Token Dan Chat ID Wajib Diisi!', 'fas fa-exclamation-triangle', 'Error');
        return;
      }

      // Show log area
      var toolOutputArea = document.getElementById('tool-output-area');
      if (toolOutputArea) {
        toolOutputArea.style.display = 'block';
        toolOutputArea.innerHTML = `
          <h3 style="color:var(--primary);margin-bottom:10px;">
            <i class="fas fa-terminal"></i> Log Bot Attack
          </h3>
          <pre id="bot-log" style="background:var(--darker);border:1px solid var(--border);
            border-radius:8px;padding:12px;font-size:12px;max-height:300px;overflow-y:auto;
            color:#e0e0e0;line-height:1.8;"></pre>
          <div id="bot-stats" style="display:flex;gap:16px;margin-top:10px;font-size:13px;">
            <span>✅ Berhasil: <b id="ok-count" style="color:#00c864;">0</b></span>
            <span>❌ Gagal: <b id="fail-count" style="color:#ff4444;">0</b></span>
            <span>📊 Total: <b id="total-count" style="color:var(--primary);">0/${count}</b></span>
          </div>`;
      }

      var logEl   = document.getElementById('bot-log');
      var okEl    = document.getElementById('ok-count');
      var failEl  = document.getElementById('fail-count');
      var totalEl = document.getElementById('total-count');
      var execBtn = document.getElementById('tool-execute-btn');

      var successCount = 0, failCount = 0, stopBot = false;

      // Change button to STOP
      if (execBtn) {
        execBtn.textContent = '⏹ STOP';
        execBtn.style.background = 'var(--secondary)';
        execBtn.onclick = function () {
          stopBot = true;
          execBtn.textContent = '⏹ Dihentikan';
          execBtn.disabled = true;
          addLog('🚨 Proses Dihentikan Oleh User.');
        };
      }

      function addLog(txt) {
        if (!logEl) return;
        var line = '[' + new Date().toLocaleTimeString('id-ID') + '] ' + txt + '\n';
        logEl.textContent += line;
        logEl.scrollTop = logEl.scrollHeight;
      }

      function updateStats() {
        if (okEl)    okEl.textContent    = successCount;
        if (failEl)  failEl.textContent  = failCount;
        if (totalEl) totalEl.textContent = (successCount + failCount) + '/' + count;
      }

      addLog('🚀 Memulai Bot Attack ke Chat ID: ' + chatId);
      addLog('📦 Total kiriman: ' + count + ' | Delay: ' + delay + 'ms');

      for (var i = 1; i <= count; i++) {
        if (stopBot) break;
        addLog('📤 Mengirim pesan ' + i + '/' + count + '...');
        try {
          var apiUrl = 'https://api.telegram.org/bot' + token +
            '/sendMessage?chat_id=' + encodeURIComponent(chatId) +
            '&text=' + encodeURIComponent(HARDCODED_MSG);
          var res  = await fetch(apiUrl);
          var data = await res.json();
          if (res.ok && data.ok) {
            successCount++;
            addLog('✅ Berhasil: Pesan ke-' + i + ' terkirim (ID: ' + data.result?.message_id + ')');
          } else {
            failCount++;
            addLog('❌ Gagal ke-' + i + ': ' + (data.description || 'Unknown error'));
          }
        } catch (err) {
          failCount++;
          addLog('❌ Network Error ke-' + i + ': ' + err.message);
        }
        updateStats();
        await sleep(delay);
      }

      if (!stopBot) {
        addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addLog('✅ Selesai! Berhasil: ' + successCount + ' | Gagal: ' + failCount);
        showModal('Selesai! ✅ ' + successCount + ' berhasil, ❌ ' + failCount + ' gagal',
          'fas fa-check-circle', 'Selesai!');
      }

      if (execBtn) {
        execBtn.textContent   = 'Mulai Attack';
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

  window.BotAttackTool = { init: true };
  console.log('[Tool] ✅ Bot Attack Loaded');
})();
