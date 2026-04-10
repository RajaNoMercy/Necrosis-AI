// ============================================================
//  NECROSIS AI — PLUGIN: TEXT TO SPEECH (text-to-speech.js)
//  Read AI responses aloud using Web Speech API
//  Features: voice selector, speed control, auto-read toggle
// ============================================================

(function initTTS() {
  'use strict';

  if (!window.speechSynthesis) {
    console.warn('[Plugins] TTS: SpeechSynthesis Not Supported');
    return;
  }

  var VOICE_KEY    = 'necrosis_tts_voice';
  var RATE_KEY     = 'necrosis_tts_rate';
  var AUTOREAD_KEY = 'necrosis_tts_autoread';

  var savedVoice   = localStorage.getItem(VOICE_KEY) || '';
  var savedRate    = parseFloat(localStorage.getItem(RATE_KEY)) || 1.0;
  var autoRead     = localStorage.getItem(AUTOREAD_KEY) === 'true';
  var isSpeaking   = false;

  // ── Core speak function ───────────────────────────────────
  function speak(text, onEnd) {
    if (!text) return;
    window.speechSynthesis.cancel();

    var clean = text
      .replace(/```[\s\S]*?```/g, 'blok kode')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .substring(0, 600);

    var utter   = new SpeechSynthesisUtterance(clean);
    utter.lang  = 'id-ID';
    utter.rate  = savedRate;
    utter.pitch = 1;

    var voices = window.speechSynthesis.getVoices();
    if (savedVoice) {
      var found = voices.find(function (v) { return v.name === savedVoice; });
      if (found) utter.voice = found;
    }

    utter.onstart = function () { isSpeaking = true; };
    utter.onend   = function () { isSpeaking = false; if (onEnd) onEnd(); };
    utter.onerror = function () { isSpeaking = false; };

    window.speechSynthesis.speak(utter);
    isSpeaking = true;
  }

  function stop() {
    window.speechSynthesis.cancel();
    isSpeaking = false;
  }

  // ── Populate voice selector ───────────────────────────────
  function populateVoices() {
    var sel = document.getElementById('tts-voice-select');
    if (!sel) return;
    var voices = window.speechSynthesis.getVoices();
    sel.innerHTML = '<option value="">Default</option>' +
      voices.map(function (v) {
        return '<option value="' + v.name + '"' +
          (v.name === savedVoice ? ' selected' : '') + '>' +
          v.name + ' (' + v.lang + ')' +
          '</option>';
      }).join('');
  }

  window.speechSynthesis.addEventListener('voiceschanged', populateVoices);
  setTimeout(populateVoices, 500); // fallback for some browsers

  // ── Voice selector change ─────────────────────────────────
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'tts-voice-select') {
      savedVoice = e.target.value;
      localStorage.setItem(VOICE_KEY, savedVoice);
      toast('✅ Suara disimpan!');
    }
  });

  // ── Test TTS button ───────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'tts-test-btn') {
      speak('Halo! Saya Necrosis AI, asisten kecerdasan buatan siap membantu Anda.');
    }
  });

  // ── Auto-attach TTS button to AI messages ─────────────────
  var chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          // Handle .ai class messages
          if (node.classList && node.classList.contains('ai')) {
            attachTTSBtn(node);
          }
          // Handle nested AI messages
          node.querySelectorAll && node.querySelectorAll('.ai').forEach(attachTTSBtn);
        });
      });
    }).observe(chatContainer, { childList: true, subtree: true });
  }

  function attachTTSBtn(aiNode) {
    // Find existing TTS button or create one
    var existing = aiNode.querySelector('.tts-btn');
    if (existing) {
      existing.onclick = function () {
        if (isSpeaking) {
          stop();
          this.innerHTML = '<i class="fas fa-volume-up"></i>';
          this.title = 'Dengarkan';
        } else {
          var txt = aiNode.innerText || aiNode.textContent || '';
          speak(txt, function () {
            if (existing) existing.innerHTML = '<i class="fas fa-volume-up"></i>';
          });
          this.innerHTML = '<i class="fas fa-stop"></i>';
          this.title = 'Stop';
          toast('🔊 Membaca Pesan...', 1500);
        }
      };
      return;
    }

    // Create TTS button if not in HTML
    var btn = document.createElement('button');
    btn.className = 'tts-btn';
    btn.title     = 'Dengarkan';
    btn.innerHTML = '<i class="fas fa-volume-up"></i>';
    btn.style.cssText = 'background:none;border:none;color:var(--gray);' +
      'cursor:pointer;font-size:13px;padding:3px 5px;transition:color 0.2s;';
    btn.addEventListener('mouseenter', function () { this.style.color = 'var(--primary)'; });
    btn.addEventListener('mouseleave', function () { this.style.color = 'var(--gray)'; });

    btn.onclick = function () {
      if (isSpeaking) {
        stop();
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.title = 'Dengarkan';
      } else {
        var txt = aiNode.innerText || aiNode.textContent || '';
        speak(txt, function () {
          btn.innerHTML = '<i class="fas fa-volume-up"></i>';
          btn.title = 'Dengarkan';
        });
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        btn.title = 'Stop';
        toast('🔊 Membaca Pesan...', 1500);
      }
    };

    var actionBar = aiNode.querySelector('.message-actions');
    if (actionBar) actionBar.appendChild(btn);

    // Auto-read new AI messages
    if (autoRead) {
      var txt = aiNode.innerText || aiNode.textContent || '';
      speak(txt);
    }
  }

  // ── Toast helper ──────────────────────────────────────────
  function toast(msg, dur) {
    if (typeof window.toast === 'function') { window.toast(msg, dur); return; }
  }

  // ── Global API ────────────────────────────────────────────
  window._necrosisTTSSpeak = speak;
  window.TTSPlugin = {
    speak,
    stop,
    isSpeaking: function () { return isSpeaking; },
    setVoice:   function (name) { savedVoice = name; localStorage.setItem(VOICE_KEY, name); },
    setRate:    function (r)    { savedRate = r; localStorage.setItem(RATE_KEY, r); },
    setAutoRead: function (v)   { autoRead = v; localStorage.setItem(AUTOREAD_KEY, v ? 'true' : 'false'); },
  };

  console.log('[Plugins] ✅ Text To Speech Loaded');
})();
