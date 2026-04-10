// ============================================================
//  NECROSIS AI — TOOL: TRACK IP (track-ip.js)
//  Lacak informasi detail dari IP address atau domain
// ============================================================

(function initTrackIP() {
  'use strict';

  var btn = document.getElementById('tool-trackip-btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    if (!window._isOnline) {
      showModal('Tidak Ada Koneksi', 'fas fa-wifi-slash', 'Perlu internet untuk tracking IP.');
      return;
    }

    switchView('tools');

    showToolInput(
      '🔍 Track Alamat IP / Domain',
      `<input type="text" id="ip-input" class="tool-input-field"
        placeholder="Contoh: 8.8.8.8 atau google.com"
        style="width:100%;background:var(--darker);border:1px solid var(--border);
        border-radius:8px;padding:10px 14px;color:var(--light);font-family:Poppins,sans-serif;font-size:13px;" />
       <p style="font-size:11px;color:var(--gray);margin-top:6px;">
         <i class="fas fa-info-circle"></i> Masukkan IP (contoh: 1.1.1.1) atau domain (contoh: github.com)
       </p>`,
      'Lacak IP',
      async function () {
        var ip = (document.getElementById('ip-input')?.value || '').trim();
        if (!ip) { showModal('Harap masukkan IP atau domain!', 'fas fa-exclamation-triangle', 'Error'); return; }

        var btn = document.getElementById('tool-execute-btn');
        setLoading(btn, 'Melacak...');
        showModal('Sedang melacak...', 'fas fa-spinner fa-spin', 'Tunggu');

        try {
          var res  = await fetch('https://ipapi.co/' + encodeURIComponent(ip) + '/json/');
          var data = await res.json();

          if (data.error) throw new Error(data.reason || 'IP tidak valid atau tidak dapat dilacak.');

          var flag = data.country_code ? '🏳️ ' : '';
          var output = [
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '🌐  HASIL PELACAKAN IP',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '📍  IP Address    : ' + (data.ip || ip),
            '🏢  Organisasi    : ' + (data.org || 'N/A'),
            '🏙️  Kota          : ' + (data.city || 'N/A'),
            '🗺️  Wilayah       : ' + (data.region || 'N/A') + ' (' + (data.region_code || '') + ')',
            '🌍  Negara        : ' + (data.country_name || 'N/A') + ' (' + (data.country_code || 'N/A') + ')',
            '📌  Koordinat     : ' + (data.latitude || 'N/A') + ', ' + (data.longitude || 'N/A'),
            '🕐  Zona Waktu    : ' + (data.timezone || 'N/A'),
            '📡  ASN           : ' + (data.asn || 'N/A'),
            '🔌  ISP           : ' + (data.isp || data.org || 'N/A'),
            '📮  Postal Code   : ' + (data.postal || 'N/A'),
            '🔒  Tipe IP       : ' + (data.network || 'N/A'),
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '⏰  Waktu Lacak   : ' + new Date().toLocaleString('id-ID'),
          ].join('\n');

          showToolOutput('📍 Hasil Lacak IP: ' + ip, output);
          showModal('Berhasil dilacak!', 'fas fa-check-circle', 'Berhasil!');
        } catch (err) {
          showToolOutput('❌ Error', 'Gagal melacak IP: ' + err.message);
          showModal('Gagal: ' + err.message, 'fas fa-bug', 'Error');
        } finally {
          resetLoading(btn, 'Lacak IP');
        }
      }
    );
  });

  // ── Helpers (delegated dari main script) ──────────────────
  function showModal(title, icon, btn) {
    if (typeof window.showModalNotification === 'function')
      window.showModalNotification(title, icon, btn);
  }
  function switchView(v) {
    if (typeof window.switchView === 'function') window.switchView(v);
  }
  function showToolInput(t, h, b, fn) {
    if (typeof window.showToolInput === 'function') window.showToolInput(t, h, b, fn);
  }
  function showToolOutput(t, c) {
    if (typeof window.showToolOutput === 'function') window.showToolOutput(t, c);
  }
  function setLoading(btn, txt) {
    if (btn) { btn.disabled = true; btn.textContent = txt; }
  }
  function resetLoading(btn, txt) {
    if (btn) { btn.disabled = false; btn.textContent = txt; }
  }

  window.TrackIPTool = { init: true };
  console.log('[Tool] ✅ Track IP Loaded');
})();
