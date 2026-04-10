// ============================================================
//  NECROSIS AI — TOOL: MY IP (my-ip.js)
//  Cek IP publik sendiri + info lengkap lokasi
// ============================================================

(function initMyIP() {
  'use strict';

  var btn = document.getElementById('tool-myip-btn');
  if (!btn) return;

  btn.addEventListener('click', async function () {
    if (!window._isOnline) {
      showModal('Tidak Ada Koneksi', 'fas fa-wifi-slash', 'Perlu Internet.');
      return;
    }

    switchView('tools');
    var toolInputArea = document.getElementById('tool-input-area');
    if (toolInputArea) toolInputArea.style.display = 'none';

    showModal('Mengecek IP Kamu...', 'fas fa-spinner fa-spin', 'Tunggu');

    try {
      // Get IP
      var r1   = await fetch('https://api.ipify.org?format=json');
      var ipData = await r1.json();
      var myIP = ipData.ip;

      // Get location info
      var r2   = await fetch('https://ipapi.co/' + myIP + '/json/');
      var info = await r2.json();

      var output = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '💻  IP KAMU',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🌐  IP Publik     : ' + myIP,
        '🏢  Organisasi   : ' + (info.org || 'N/A'),
        '🔌  ISP           : ' + (info.isp || info.org || 'N/A'),
        '🏙️  Kota          : ' + (info.city || 'N/A'),
        '🗺️  Wilayah       : ' + (info.region || 'N/A'),
        '🌍  Negara        : ' + (info.country_name || 'N/A') + ' (' + (info.country_code || '') + ')',
        '📌  Koordinat     : ' + (info.latitude || 'N/A') + ', ' + (info.longitude || 'N/A'),
        '🕐  Zona Waktu    : ' + (info.timezone || 'N/A'),
        '📡  ASN           : ' + (info.asn || 'N/A'),
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '💡  Tips: Gunakan VPN untuk menyembunyikan IP aslimu.',
        '⏰  Waktu Cek     : ' + new Date().toLocaleString('id-ID'),
      ].join('\n');

      showToolOutput('💻 IP Kamu', output);
      showModal('IP berhasil dicek!', 'fas fa-check-circle', 'Berhasil!');
    } catch (err) {
      showToolOutput('❌ Gagal', 'Error: ' + err.message);
      showModal('Gagal: ' + err.message, 'fas fa-bug', 'Error');
    }
  });

  function showModal(t, i, b) { if (typeof window.showModalNotification === 'function') window.showModalNotification(t, i, b); }
  function switchView(v)       { if (typeof window.switchView === 'function') window.switchView(v); }
  function showToolOutput(t,c) { if (typeof window.showToolOutput === 'function') window.showToolOutput(t, c); }

  window.MyIPTool = { init: true };
  console.log('[Tool] ✅ My IP Loaded');
})();

