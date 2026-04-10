// ============================================================
//  NECROSIS AI — PLUGIN: VOICE INPUT (voice-input.js)
//  FIXED: Cek kalau recognition sudah jalan sebelum start
//         Tidak conflict dengan script.js original
// ============================================================

(function initVoiceInput() {
  'use strict';

  var voiceBtn    = document.getElementById('voice-btn');
  var promptInput = document.getElementById('prompt-input');
  if (!voiceBtn || !promptInput) return;

  // Kalau script.js sudah handle voice, skip plugin ini
  // Cek apakah listener sudah ada via flag
  if (voiceBtn.dataset.voiceInit) return;
  voiceBtn.dataset.voiceInit = '1';

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.title   = 'Voice tidak didukung di browser ini';
    voiceBtn.style.opacity = '0.4';
    return;
  }

  var recognition = null;
  var isRecording = false;
  var LANG_KEY    = 'necrosis_voice_lang';

  function getRecognition() {
    if (!recognition) {
      recognition = new SpeechRecognition();
      recognition.continuous     = false;
      recognition.interimResults = true;
      recognition.lang           = localStorage.getItem(LANG_KEY) || 'id-ID';

      recognition.onstart = function () {
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        if (navigator.vibrate) navigator.vibrate(80);
        showToast('🎙️ Mendengarkan...');
      };

      recognition.onresult = function (e) {
        var transcript = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        promptInput.value = transcript;
        promptInput.dispatchEvent(new Event('input'));
        promptInput.style.borderColor = 'var(--primary)';
        setTimeout(function () { promptInput.style.borderColor = ''; }, 1000);
      };

      recognition.onend = function () {
        isRecording = false;
        recognition = null; // reset supaya bisa dibuat ulang
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        if (navigator.vibrate) navigator.vibrate(50);
      };

      recognition.onerror = function (e) {
        isRecording = false;
        recognition = null; // reset supaya tidak stuck
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';

        var msgs = {
          'not-allowed':  '❌ Izin mikrofon ditolak!',
          'no-speech':    '⚠️ Tidak ada suara terdeteksi',
          'network':      '❌ Error jaringan',
          'aborted':      '',
        };
        var msg = msgs[e.error];
        if (msg === undefined) msg = '❌ Mic error: ' + e.error;
        if (msg) showToast(msg);
      };
    }
    return recognition;
  }

  // Replace listener lama dengan yang baru
  var newBtn = voiceBtn.cloneNode(true);
  newBtn.dataset.voiceInit = '1';
  voiceBtn.parentNode.replaceChild(newBtn, voiceBtn);
  voiceBtn = newBtn;

  voiceBtn.addEventListener('click', function () {
    if (isRecording) {
      // Stop
      if (recognition) {
        try { recognition.stop(); } catch(e) {}
        recognition = null;
      }
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      return;
    }

    // Start fresh
    recognition = null; // force new instance
    var rec = getRecognition();
    try {
      rec.start();
    } catch (err) {
      // Kalau masih error, tunggu sebentar dan coba lagi
      recognition = null;
      setTimeout(function () {
        try {
          recognition = null;
          getRecognition().start();
        } catch (e2) {
          showToast('❌ Mic error: ' + e2.message);
        }
      }, 300);
    }
  });

  function showToast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg, 2500); return; }
    var n = document.getElementById('copy-notification');
    if (!n) return;
    var sp = n.querySelector('span');
    if (sp) sp.textContent = msg;
    n.classList.add('show');
    clearTimeout(n._tid);
    n._tid = setTimeout(function() { n.classList.remove('show'); }, 2500);
  }

  // Sync bahasa dengan settings
  document.getElementById('lang-id-btn') && document.getElementById('lang-id-btn').addEventListener('click', function () {
    localStorage.setItem(LANG_KEY, 'id-ID');
  });
  document.getElementById('lang-en-btn') && document.getElementById('lang-en-btn').addEventListener('click', function () {
    localStorage.setItem(LANG_KEY, 'en-US');
  });

  window.VoiceInputPlugin = {
    stop: function () {
      if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
      isRecording = false;
    },
    isRecording: function () { return isRecording; },
  };

  console.log('[Plugin] ✅ Voice Input loaded — conflict safe');
})();
