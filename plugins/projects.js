// ============================================================
//  NECROSIS AI — PLUGIN: PROJECTS (projects.js)
//  Save project contexts — auto-inject ke setiap chat
//  Gunakan untuk: coding assistant, tutor, dll
// ============================================================

(function initProjects() {
  'use strict';

  var PROJ_KEY   = 'necrosis_projects';
  var ACTIVE_KEY = 'necrosis_active_project';
  var projects   = [];
  var activeId   = localStorage.getItem(ACTIVE_KEY) || null;

  // ── Load / Save ───────────────────────────────────────────
  function loadProjects() {
    try { projects = JSON.parse(localStorage.getItem(PROJ_KEY)) || []; }
    catch (e) { projects = []; }
  }
  function saveProjects() {
    localStorage.setItem(PROJ_KEY, JSON.stringify(projects));
  }

  loadProjects();

  // ── Get active project context ────────────────────────────
  function getActiveProject() {
    if (!activeId) return null;
    return projects.find(function (p) { return p.id === activeId; }) || null;
  }

  function getActivePrompt() {
    var p = getActiveProject();
    return p ? '[PROJECT: ' + p.name + ']\n' + p.prompt : '';
  }

  // ── Create / Update project ───────────────────────────────
  function saveProject(name, prompt, id) {
    name   = (name || '').trim();
    prompt = (prompt || '').trim();
    if (!name || !prompt) { toast('⚠️ Nama dan prompt harus diisi!'); return false; }

    if (id) {
      var idx = projects.findIndex(function (p) { return p.id === id; });
      if (idx >= 0) {
        projects[idx].name   = name;
        projects[idx].prompt = prompt;
        projects[idx].updated = Date.now();
      }
    } else {
      projects.push({ id: 'proj_' + Date.now(), name, prompt, created: Date.now() });
    }
    saveProjects();
    renderProjects();
    toast('✅ Proyek disimpan!');
    return true;
  }

  // ── Delete project ────────────────────────────────────────
  function deleteProject(id) {
    projects = projects.filter(function (p) { return p.id !== id; });
    if (activeId === id) {
      activeId = null;
      localStorage.removeItem(ACTIVE_KEY);
      updateActiveIndicator();
    }
    saveProjects();
    renderProjects();
    toast('🗑️ Proyek dihapus');
  }

  // ── Activate / Deactivate ─────────────────────────────────
  function activateProject(id) {
    if (activeId === id) {
      // Deactivate
      activeId = null;
      localStorage.removeItem(ACTIVE_KEY);
      toast('⚠️ Proyek dinonaktifkan');
    } else {
      activeId = id;
      localStorage.setItem(ACTIVE_KEY, id);
      var p = projects.find(function (p) { return p.id === id; });
      toast('✅ Proyek aktif: ' + (p ? p.name : id));
    }

    // Sync with server
    if (window.NecrosisAPI?.isServerMode()) {
      window.NecrosisAPI.updateSession({
        projectContext: getActiveProject() ? { name: getActiveProject().name, prompt: getActiveProject().prompt } : null,
      });
    }

    renderProjects();
    updateActiveIndicator();
  }

  // ── Update active indicator in sidebar ───────────────────
  function updateActiveIndicator() {
    var btn = document.getElementById('btn-projects');
    if (btn) {
      var proj = getActiveProject();
      if (proj) {
        btn.innerHTML = '<i class="fas fa-folder-open" style="color:#00c864;"></i> ' + proj.name.substring(0, 10);
        btn.style.borderColor = '#00c864';
        btn.style.color       = '#00c864';
      } else {
        btn.innerHTML = '<i class="fas fa-folder-open"></i>Proyek';
        btn.style.borderColor = '';
        btn.style.color       = '';
      }
    }
  }

  // ── Render project list ───────────────────────────────────
  function renderProjects() {
    var list = document.getElementById('projects-list');
    if (!list) return;
    list.innerHTML = '';

    if (!projects.length) {
      list.innerHTML = '<p style="color:var(--gray);font-size:13px;text-align:center;padding:16px;">Belum ada proyek. Buat di bawah!</p>';
      return;
    }

    projects.forEach(function (p) {
      var isActive = p.id === activeId;
      var card = document.createElement('div');
      card.style.cssText = 'background:' + (isActive ? 'rgba(0,200,100,0.08)' : 'var(--dark)') + ';' +
        'border:1px solid ' + (isActive ? '#00c864' : 'var(--border)') + ';' +
        'border-radius:10px;padding:12px;margin-bottom:8px;';

      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<div style="font-weight:600;color:' + (isActive ? '#00c864' : 'var(--primary)') + ';font-size:14px;">' +
        '<i class="fas fa-folder' + (isActive ? '-open' : '') + '"></i> ' + p.name +
        (isActive ? ' <span style="font-size:10px;background:#00c864;color:#000;padding:2px 6px;border-radius:10px;margin-left:4px;">AKTIF</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:4px;">' +
        '<button class="proj-activate-btn" data-id="' + p.id + '" style="background:' +
        (isActive ? 'rgba(0,200,100,0.2)' : 'rgba(230,0,0,0.1)') + ';border:1px solid ' +
        (isActive ? '#00c864' : 'rgba(230,0,0,0.3)') + ';color:' +
        (isActive ? '#00c864' : 'var(--primary)') + ';padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;">' +
        (isActive ? '⏹ Stop' : '▶ Aktifkan') + '</button>' +
        '<button class="proj-del-btn" data-id="' + p.id + '" style="background:none;border:1px solid rgba(255,0,0,0.3);' +
        'color:#ff4444;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;" title="Hapus">' +
        '<i class="fas fa-trash"></i></button>' +
        '</div></div>' +
        '<div style="font-size:12px;color:var(--gray);overflow:hidden;text-overflow:ellipsis;' +
        'white-space:nowrap;">' + p.prompt.substring(0, 80) + '...</div>';

      list.appendChild(card);
    });

    // Bind buttons
    list.querySelectorAll('.proj-activate-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { activateProject(btn.dataset.id); });
    });
    list.querySelectorAll('.proj-del-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('Hapus proyek ini?')) deleteProject(btn.dataset.id);
      });
    });
  }

  // ── Panel open/close ──────────────────────────────────────
  function openPanel() {
    var modal   = document.getElementById('projects-modal');
    var overlay = document.getElementById('projects-overlay');
    if (modal)   { renderProjects(); modal.classList.add('active'); }
    if (overlay) overlay.classList.add('active');
  }
  function closePanel() {
    document.getElementById('projects-modal')?.classList.remove('active');
    document.getElementById('projects-overlay')?.classList.remove('active');
  }

  // ── Bind buttons ──────────────────────────────────────────
  document.getElementById('btn-projects')?.addEventListener('click', openPanel);
  document.getElementById('projects-close-btn')?.addEventListener('click', closePanel);
  document.getElementById('projects-overlay')?.addEventListener('click', closePanel);

  document.getElementById('proj-save-btn')?.addEventListener('click', function () {
    var name   = document.getElementById('proj-name')?.value   || '';
    var prompt = document.getElementById('proj-prompt')?.value || '';
    if (saveProject(name, prompt)) {
      if (document.getElementById('proj-name'))   document.getElementById('proj-name').value   = '';
      if (document.getElementById('proj-prompt')) document.getElementById('proj-prompt').value = '';
    }
  });

  // ── Init active indicator ─────────────────────────────────
  setTimeout(updateActiveIndicator, 500);

  function toast(msg) { if (typeof window.toast === 'function') window.toast(msg); }

  // ── Global API ────────────────────────────────────────────
  window.ProjectsPlugin = {
    getActiveProject,
    getActivePrompt,
    saveProject,
    deleteProject,
    activateProject,
    getAll: function () { return projects; },
    open:   openPanel,
    close:  closePanel,
  };

  // Expose for sendMessage to inject project context
  window.getProjectSystemPrompt = getActivePrompt;

  console.log('[Plugins] ✅ Projects loaded — Total:', projects.length, '| Active:', activeId);
})();
