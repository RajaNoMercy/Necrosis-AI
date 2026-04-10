// ============================================================
//  NECROSIS AI — PLUGIN: WAKE WORD (wake-word.js)
//  Detects "Hey Necrosis" / "Hei Necrosis" continuously
//  Focuses prompt input when wake word terdeteksi
// ============================================================

(function initWakeWord() {
  'use strict';

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  var WAKE_KEY   = 'necrosis_wakeword';
  var wakeEnabled = localStorage.getItem(WAKE_KEY) === 'true';
  var wakeRecog   = null;
  var restartTimer = null;

  // ── Helpers ───────────────────────────────────────────────
  function toast(msg, dur) {
    if (typeof window.toast === 'function') { window.toast(msg, dur || 2000); return; }
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
      'background:rgba(188,19,254,0.9);color:white;padding:8px 18px;border-radius:20px;' +
      'font-size:13px;z-index:9999;pointer-events:none;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, dur || 2000);
  }

  function haptic(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern || [50, 30, 50]);
  }

  // ── Wake Word Engine ──────────────────────────────────────
  function startWakeWord() {
    if (!wakeEnabled) return;
    if (wakeRecog) { try { wakeRecog.stop(); } catch (e) {} }

    wakeRecog = new SpeechRecognition();
    wakeRecog.continuous     = true;
    wakeRecog.interimResults = false;
    wakeRecog.lang           = 'id-ID';

    wakeRecog.onresult = function (e) {
      var transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
      var triggers = ['hey necrosis', 'hei necrosis', 'hai necrosis', 'hi necrosis'];
      if (triggers.some(function (t) { return transcript.includes(t); })) {
        haptic([50, 30, 50]);
        toast('👋 Hai! Necrosis Siap Membantu!', 2500);

        // Focus prompt input
        var pi = document.getElementById('prompt-input');
        if (pi) {
          pi.focus();
          pi.style.borderColor = 'var(--primary)';
          setTimeout(function () { pi.style.borderColor = ''; }, 1500);
        }

        // Visual pulse on header
        var header = document.querySelector('header');
        if (header) {
          header.style.boxShadow = '0 0 20px rgba(188,19,254,0.6)';
          setTimeout(function () { header.style.boxShadow = ''; }, 1200);
        }
      }
    };

    wakeRecog.onend = function () {
      if (wakeEnabled) {
        clearTimeout(restartTimer);
        restartTimer = setTimeout(function () {
          if (wakeEnabled) startWakeWord();
        }, 1000);
      }
    };

    wakeRecog.onerror = function (e) {
      if (e.error !== 'aborted' && e.error !== 'not-allowed') {
        if (wakeEnabled) {
          clearTimeout(restartTimer);
          restartTimer = setTimeout(startWakeWord, 2000);
        }
      }
    };

    try { wakeRecog.start(); } catch (e) {}
  }

  function stopWakeWord() {
    wakeEnabled = false;
    clearTimeout(restartTimer);
    if (wakeRecog) {
      try { wakeRecog.stop(); } catch (e) {}
      wakeRecog = null;
    }
  }

  // ── UI Toggle ─────────────────────────────────────────────
  // Sync dengan toggle yang sudah ada di HTML (settings panel)
  function syncToggleUI(enabled) {
    var toggle = document.getElementById('wakeword-toggle');
    if (toggle) toggle.classList.toggle('active', enabled);
  }

  var toggleEl = document.getElementById('wakeword-toggle');
  if (toggleEl) {
    // Apply initial state
    syncToggleUI(wakeEnabled);

    toggleEl.addEventListener('click', function () {
      wakeEnabled = !wakeEnabled;
      localStorage.setItem(WAKE_KEY, wakeEnabled ? 'true' : 'false');
      syncToggleUI(wakeEnabled);

      if (wakeEnabled) {
        startWakeWord();
        toast('✅ Wake Word Aktif — Ucapkan "Hey Necrosis"');
      } else {
        stopWakeWord();
        toast('❌ Wake Word Dimatikan');
      }
    });
  }

  // ── Auto-start if previously enabled ──────────────────────
  if (wakeEnabled) {
    setTimeout(startWakeWord, 2500);
  }

  // ── Global API ────────────────────────────────────────────
  window.WakeWordPlugin = {
    start:    startWakeWord,
    stop:     stopWakeWord,
    isActive: function () { return wakeEnabled; },
  };

  console.log('[Plugins] ✅ Wake Word Loaded — Enabled:', wakeEnabled);
})();
