// ============================================================
//  NECROSIS AI — PLUGIN: AUTOCOMPLETE (autocomplete.js)
//  AI-powered prompt autocomplete (debounced, Tab to accept)
// ============================================================

(function initAutoComplete() {
  'use strict';

  var promptInput = document.getElementById('prompt-input');
  var inputArea   = document.getElementById('input-area');
  if (!promptInput || !inputArea) return;

  var suggestion = document.createElement('div');
  suggestion.id  = 'autocomplete-suggestion';
  suggestion.style.cssText =
    'position:absolute;bottom:calc(100% + 4px);left:56px;right:20px;' +
    'background:var(--sidebar-bg);border:1px solid var(--border);border-radius:8px;' +
    'padding:8px 12px;font-size:12px;color:var(--gray);display:none;z-index:100;' +
    'cursor:pointer;transition:all 0.2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  inputArea.style.position = 'relative';
  inputArea.appendChild(suggestion);

  var acTimer = null;
  var lastVal = '';

  promptInput.addEventListener('input', function () {
    var val = this.value.trim();
    if (val === lastVal || val.length < 15 || val.startsWith('/')) {
      suggestion.style.display = 'none';
      return;
    }
    lastVal = val;
    clearTimeout(acTimer);
    acTimer = setTimeout(async function () {
      var apiKey = window._groqKeyGlobal || '';
      if (!apiKey || promptInput.value.trim() !== val) return;
      try {
        var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              { role: 'system', content: 'Lengkapi kalimat berikut dengan singkat (maks 8 kata). Balas HANYA lanjutan kalimatnya saja, tanpa tanda baca di awal.' },
              { role: 'user', content: val },
            ],
            max_tokens: 25,
          }),
        });
        var data       = await res.json();
        var completion = data.choices?.[0]?.message?.content?.trim() || '';
        if (completion && promptInput.value.trim() === val) {
          suggestion.textContent = '💡 ' + val + ' ' + completion;
          suggestion.style.display = 'block';
        }
      } catch (e) { /* ignore */ }
    }, 1200);
  });

  suggestion.addEventListener('click', function () {
    promptInput.value = this.textContent.replace('💡 ', '');
    promptInput.dispatchEvent(new Event('input'));
    this.style.display = 'none';
    promptInput.focus();
  });

  promptInput.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && suggestion.style.display !== 'none') {
      e.preventDefault();
      suggestion.click();
    }
    if (e.key === 'Escape') suggestion.style.display = 'none';
  });

  document.addEventListener('click', function (e) {
    if (e.target !== promptInput && e.target !== suggestion) suggestion.style.display = 'none';
  });

  window.AutoCompletePlugin = { init: true };
  console.log('[Plugins] ✅ AutoComplete Loaded');
})();
