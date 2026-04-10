// ============================================================
//  NECROSIS AI — PLUGIN: PERSONA (persona.js)
//  AI character personalities — bisa pilih karakter AI
//  Tidak mengubah batasan keamanan, hanya gaya bicara
// ============================================================

(function initPersona() {
  'use strict';

  var PERSONA_KEY = 'necrosis_active_persona';

  // ── Persona Definitions ───────────────────────────────────
  var PERSONAS = [
    {
      id:     'default',
      name:   'Necrosis AI',
      emoji:  '🤖',
      color:  '#E60000',
      desc:   'Kepribadian asli Necrosis AI',
      system: '',
    },
    {
      id:     'sigma',
      name:   'Sigma Bro',
      emoji:  '💀',
      color:  '#ff4444',
      desc:   'Gaul, to-the-point, no cap, gen-Z vibes',
      system: 'Kamu adalah AI dengan gaya bicara gen-Z sigma. Pakai kata: "bro", "no cap", "based", "W", "L", "slay", "fr fr". Jawab singkat dan langsung. Tetap helpful.',
    },
    {
      id:     'sensei',
      name:   'Prof. Sensei',
      emoji:  '🎓',
      color:  '#00a8ff',
      desc:   'Profesional, akademis, penuh pengetahuan',
      system: 'Kamu adalah profesor AI yang bijaksana. Gunakan bahasa formal, struktur jawaban dengan jelas, sertakan analisis mendalam, dan akhiri dengan kesimpulan akademis.',
    },
    {
      id:     'kawaii',
      name:   'Necrosis-chan',
      emoji:  '🌸',
      color:  '#ff69b4',
      desc:   'Anime moe style, imut, penuh semangat',
      system: 'Kamu adalah AI kawaii. Pakai "~nyan", ">_<", "desu", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧". Panggil user dengan "-kun" atau "-chan". Selalu semangat dan ceria!',
    },
    {
      id:     'hacker',
      name:   'H4x0r',
      emoji:  '⚡',
      color:  '#00ff88',
      desc:   'Terminal vibes, cyberpunk, elite coder',
      system: 'Kamu adalah AI hacker elite. Pakai istilah teknis, referensi terminal/linux, gaya bicara curt dan tajam. "root@necrosis:~$" vibes. Tetap membantu tapi dengan gaya cyber.',
    },
    {
      id:     'elder',
      name:   'The Elder',
      emoji:  '🧙',
      color:  '#bc13fe',
      desc:   'Bijaksana, metaforis, penuh pepatah',
      system: 'Kamu adalah AI tua yang bijaksana seperti penyihir. Gunakan metafora, pepatah, dan bahasa yang puitis namun tetap informatif. Sebut dirimu "sang penatua".',
    },
    {
      id:     'comedian',
      name:   'Roast Master',
      emoji:  '😂',
      color:  '#ffaa00',
      desc:   'Lucu, suka bercanda, penuh humor',
      system: 'Kamu adalah AI stand-up comedian. Selipkan humor, pun, dan bercandaan ringan di setiap jawaban. Tetap helpful tapi dengan twist lucu. Roast diri sendiri juga boleh!',
    },
    {
      id:     'mentor',
      name:   'Big Bro',
      emoji:  '🦾',
      color:  '#ff6b35',
      desc:   'Seperti kakak/mentor yang peduli',
      system: 'Kamu adalah AI seperti kakak/mentor yang peduli. Gunakan bahasa hangat, motivasi user, percaya pada kemampuan mereka, dan selalu support. Sebut user "adik" atau namanya.',
    },
  ];

  var activePersonaId = localStorage.getItem(PERSONA_KEY) || 'default';

  // ── Get active persona ────────────────────────────────────
  function getActivePersona() {
    return PERSONAS.find(function (p) { return p.id === activePersonaId; }) || PERSONAS[0];
  }

  function getSystemPrompt() {
    return getActivePersona().system || '';
  }

  // ── Set persona ───────────────────────────────────────────
  function setPersona(id) {
    var found = PERSONAS.find(function (p) { return p.id === id; });
    if (!found) return;
    activePersonaId = id;
    localStorage.setItem(PERSONA_KEY, id);

    // Update AI icon/name in header
    var headerIcon = document.querySelector('header i.fa-robot');
    if (headerIcon) {
      headerIcon.parentElement.childNodes.forEach(function (n) {
        if (n.nodeType === 3) n.textContent = ' ' + found.name;
      });
    }

    // Update server session if available
    if (window.NecrosisAPI?.isServerMode()) {
      window.NecrosisAPI.updateSession({ personaContext: { systemPrompt: found.system } });
    }

    if (typeof window.toast === 'function') window.toast('✅ Persona: ' + found.emoji + ' ' + found.name);
    closePanel();
  }

  // ── Render persona grid ───────────────────────────────────
  function renderPersonas() {
    var grid = document.getElementById('persona-grid');
    if (!grid) return;
    grid.innerHTML = '';
    PERSONAS.forEach(function (p) {
      var card = document.createElement('div');
      card.className  = 'persona-card';
      card.dataset.id = p.id;
      var isActive = p.id === activePersonaId;

      card.style.cssText = 'background:' + (isActive ? 'rgba(230,0,0,0.12)' : 'var(--dark)') + ';' +
        'border:2px solid ' + (isActive ? p.color : 'var(--border)') + ';' +
        'border-radius:12px;padding:12px;cursor:pointer;transition:all 0.2s;text-align:center;';

      card.innerHTML =
        '<div style="font-size:28px;margin-bottom:4px;">' + p.emoji + '</div>' +
        '<div style="font-size:13px;font-weight:600;color:' + (isActive ? p.color : 'var(--light)') + ';">' + p.name + '</div>' +
        '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + p.desc + '</div>' +
        (isActive ? '<div style="font-size:10px;color:' + p.color + ';margin-top:4px;font-weight:600;">✓ AKTIF</div>' : '');

      card.addEventListener('click', function () { setPersona(p.id); });
      card.addEventListener('mouseenter', function () {
        this.style.borderColor = p.color;
        this.style.transform   = 'translateY(-2px)';
      });
      card.addEventListener('mouseleave', function () {
        this.style.borderColor = isActive ? p.color : 'var(--border)';
        this.style.transform   = '';
      });

      grid.appendChild(card);
    });
  }

  // ── Panel open/close ──────────────────────────────────────
  function openPanel()  {
    var panel   = document.getElementById('persona-panel');
    var overlay = document.getElementById('persona-overlay');
    if (panel)   { renderPersonas(); panel.classList.add('active'); }
    if (overlay) overlay.classList.add('active');
  }
  function closePanel() {
    var panel   = document.getElementById('persona-panel');
    var overlay = document.getElementById('persona-overlay');
    if (panel)   panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  // ── Bind buttons ──────────────────────────────────────────
  document.getElementById('btn-persona')?.addEventListener('click', openPanel);
  document.getElementById('persona-close-btn')?.addEventListener('click', closePanel);
  document.getElementById('persona-overlay')?.addEventListener('click', closePanel);

  // ── Inject active persona system prompt into sendMessage ─
  // Hooked via window.getPersonaSystemPrompt
  window.getPersonaSystemPrompt = getSystemPrompt;

  // ── Global API ────────────────────────────────────────────
  window.PersonaPlugin = {
    personas:         PERSONAS,
    getActivePersona,
    getSystemPrompt,
    setPersona,
    openPanel,
    closePanel,
    renderPersonas,
  };

  console.log('[Plugins] ✅ Persona Loaded — Active:', activePersonaId);
})();
