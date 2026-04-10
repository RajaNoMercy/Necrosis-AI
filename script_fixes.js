// ============================================================
//  NECROSIS AI — SCRIPT FIXES v2.0 (script_fixes.js)
//  Fix semua masalah:
//  1. Model Selector dropdown tidak bisa dibuka
//  2. TTS Voice hanya tampil "Default"
//  3. Custom Prompt tidak berpengaruh
//  4. Rename Chat + AI Auto-naming
//  5. Semua Obrolan panel baru
//  6. Cari Obrolan di atas riwayat chat
//  7. Ringkas & Batch Export dipindah ke Settings
//  8. Settings semua fitur benar-benar berfungsi
// ============================================================

(function NecrosisFixes() {
  'use strict';

  /* ── Helper toast ───────────────────────────────────────── */
  function toast(msg, dur) {
    var n = document.getElementById('copy-notification');
    if (!n) return;
    var sp = n.querySelector('span');
    if (sp) sp.textContent = msg;
    n.classList.add('show');
    clearTimeout(n._tid);
    n._tid = setTimeout(function() { n.classList.remove('show'); }, dur || 2200);
  }

  /* ── Get allChats dari localStorage ─────────────────────── */
  function getChats() {
    try { return JSON.parse(localStorage.getItem('necrosis_ai_chats')) || []; }
    catch(e) { return []; }
  }
  function saveChats(chats) {
    localStorage.setItem('necrosis_ai_chats', JSON.stringify(chats));
  }

  // ============================================================
  // 1. FIX MODEL SELECTOR — dropdown tidak bisa dibuka
  //    Problem: z-index terpotong parent overflow,
  //             selector mencari element yang belum ready
  // ============================================================
  function fixModelSelector() {
    var wrapBtn  = document.getElementById('model-selector-btn');
    var dropdown = document.getElementById('model-dropdown');
    var labelEl  = document.getElementById('model-label-display');
    if (!wrapBtn || !dropdown) return;

    // Saved model
    var savedModel = localStorage.getItem('necrosis_selected_model') || '1.5-Beta';
    if (labelEl) labelEl.textContent = savedModel;

    // Fix dropdown style — pakai position fixed supaya tidak terpotong
    dropdown.style.cssText = [
      'display:none',
      'position:fixed',
      'background:var(--sidebar-bg)',
      'border:1px solid var(--border)',
      'border-radius:12px',
      'padding:6px',
      'min-width:220px',
      'box-shadow:0 8px 30px rgba(0,0,0,0.7)',
      'z-index:9999',
    ].join(';');

    // Remove ALL old click listeners by replacing with clone
    var newBtn = wrapBtn.cloneNode(true);
    wrapBtn.parentNode.replaceChild(newBtn, wrapBtn);
    wrapBtn = newBtn;

    var isOpen = false;

    function openDropdown() {
      var rect = wrapBtn.getBoundingClientRect();
      dropdown.style.display = 'block';
      // Position above the button
      dropdown.style.bottom  = (window.innerHeight - rect.top + 6) + 'px';
      dropdown.style.right   = (window.innerWidth - rect.right) + 'px';
      dropdown.style.left    = 'auto';
      dropdown.style.top     = 'auto';
      isOpen = true;
      var chevron = wrapBtn.querySelector('[class*="chevron"]');
      if (chevron) chevron.className = 'fas fa-chevron-down';
    }

    function closeDropdown() {
      dropdown.style.display = 'none';
      isOpen = false;
      var chevron = wrapBtn.querySelector('[class*="chevron"]');
      if (chevron) chevron.className = 'fas fa-chevron-up';
    }

    wrapBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      isOpen ? closeDropdown() : openDropdown();
    });

    // Model options
    dropdown.querySelectorAll('.model-opt').forEach(function(opt) {
      // Remove old listeners
      var newOpt = opt.cloneNode(true);
      opt.parentNode.replaceChild(newOpt, opt);
      newOpt.addEventListener('click', function() {
        var label = this.getAttribute('data-model');
        var full  = this.getAttribute('data-full');
        if (labelEl) labelEl.textContent = label;
        localStorage.setItem('necrosis_selected_model', label);
        dropdown.querySelectorAll('.model-opt').forEach(function(o) {
          o.style.background = '';
        });
        this.style.background = 'rgba(230,0,0,0.18)';
        closeDropdown();
        toast('⚡ Model: ' + full);
      });
      newOpt.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(230,0,0,0.08)';
      });
      newOpt.addEventListener('mouseleave', function() {
        if (this.getAttribute('data-model') !== savedModel)
          this.style.background = '';
      });
    });

    // Highlight saved model
    dropdown.querySelectorAll('.model-opt').forEach(function(o) {
      if (o.getAttribute('data-model') === savedModel)
        o.style.background = 'rgba(230,0,0,0.18)';
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && e.target !== wrapBtn) closeDropdown();
    });

    // Reposition on scroll/resize
    window.addEventListener('resize', function() { if (isOpen) openDropdown(); });

    console.log('[Fix] ✅ Model Selector fixed');
  }

  // ============================================================
  // 2. FIX TTS VOICE SELECTOR — hanya tampil "Default"
  //    Problem: getVoices() kosong saat dipanggil pertama kali
  // ============================================================
  function fixTTSVoices() {
    if (!window.speechSynthesis) return;

    var VOICE_KEY = 'necrosis_tts_voice';

    function populateVoiceSelect() {
      var sel = document.getElementById('tts-voice-select');
      if (!sel) return;
      var voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return; // retry via onvoiceschanged
      var saved = localStorage.getItem(VOICE_KEY) || '';
      var html = '<option value="">🔊 Default</option>';
      // Filter: prioritaskan bahasa Indonesia & Inggris
      var sorted = voices.slice().sort(function(a, b) {
        var aID = a.lang.startsWith('id') ? 0 : a.lang.startsWith('en') ? 1 : 2;
        var bID = b.lang.startsWith('id') ? 0 : b.lang.startsWith('en') ? 1 : 2;
        return aID - bID;
      });
      sorted.forEach(function(v) {
        var flag = v.lang.startsWith('id') ? '🇮🇩 ' : v.lang.startsWith('en') ? '🇬🇧 ' :
                   v.lang.startsWith('ja') ? '🇯🇵 ' : v.lang.startsWith('ko') ? '🇰🇷 ' : '🌐 ';
        html += '<option value="' + v.name + '"' +
          (v.name === saved ? ' selected' : '') + '>' +
          flag + v.name + ' (' + v.lang + ')' +
          '</option>';
      });
      sel.innerHTML = html;
      console.log('[Fix] ✅ TTS Voices loaded:', voices.length, 'voices');
    }

    // Multiple attempts — Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = populateVoiceSelect;
    populateVoiceSelect();
    setTimeout(populateVoiceSelect, 300);
    setTimeout(populateVoiceSelect, 1000);
    setTimeout(populateVoiceSelect, 2500);

    // Save selection
    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'tts-voice-select') {
        localStorage.setItem(VOICE_KEY, e.target.value);
        toast('✅ Suara TTS disimpan!');
      }
    });

    // Test button
    document.addEventListener('click', function(e) {
      if (e.target && (e.target.id === 'tts-test-btn' || e.target.closest('#tts-test-btn'))) {
        var saved = localStorage.getItem(VOICE_KEY) || '';
        window.speechSynthesis.cancel();
        var utter = new SpeechSynthesisUtterance('Halo! Ini adalah suara Necrosis AI, asisten pintarmu!');
        utter.lang = 'id-ID';
        if (saved) {
          var v = window.speechSynthesis.getVoices().find(function(x) { return x.name === saved; });
          if (v) utter.voice = v;
        }
        window.speechSynthesis.speak(utter);
        toast('🔊 Testing suara...');
      }
    });
  }

  // ============================================================
  // 3. FIX CUSTOM PROMPT — tidak berpengaruh ke AI
  //    Problem: fetch patch hanya tangkap groq.com,
  //             tidak semua provider
  // ============================================================
  function fixCustomPrompt() {
    var P_KEY = 'necrosis_custom_prompt';
    var U_KEY = 'necrosis_user_name';

    // Re-inject fetch patch yang lebih comprehensive
    var _origFetch = window.__origFetch || window.fetch;
    window.__origFetch = _origFetch;

    window.fetch = function(url, options) {
      // Tangkap semua API provider LLM
      var isLLM = typeof url === 'string' && (
        url.includes('api.groq.com') ||
        url.includes('generativelanguage.googleapis.com') ||
        url.includes('api.cerebras.ai') ||
        url.includes('api.mistral.ai') ||
        url.includes('openrouter.ai') ||
        url.includes('api.sambanova.ai') ||
        url.includes('integrate.api.nvidia.com') ||
        url.includes('api-inference.huggingface.co')
      );

      if (isLLM && options && options.body) {
        try {
          var body = JSON.parse(options.body);
          if (body.messages && body.messages.length > 0) {
            var sysIdx = body.messages.findIndex(function(m) { return m.role === 'system'; });
            var sysContent = sysIdx >= 0 ? body.messages[sysIdx].content : '';

            // Jangan inject ulang kalau sudah ada
            if (!sysContent.includes('[NECROSIS_INJECTED]')) {
              var name   = window._necrosisUserName || localStorage.getItem(U_KEY) || 'User';
              var custom = window._necrosisCustomPrompt || localStorage.getItem(P_KEY) || '';

              var inj = '[NECROSIS_INJECTED]\n';
              inj += 'Nama user: "' + name + '". Sapa dengan namanya.\n';
              if (custom) {
                inj += '\n[INSTRUKSI KHUSUS DARI USER — WAJIB DIIKUTI]:\n' + custom + '\n';
              }

              if (sysIdx >= 0) {
                body.messages[sysIdx].content = inj + '\n' + body.messages[sysIdx].content;
              } else {
                body.messages.unshift({ role: 'system', content: inj });
              }
              options = Object.assign({}, options, { body: JSON.stringify(body) });
            }
          }
        } catch(e) { /* ignore parse errors */ }
      }
      return _origFetch(url, options);
    };

    // Fix save button di settings
    var cpSave = document.getElementById('cp-save-btn');
    var cpReset = document.getElementById('cp-reset-btn');
    var cpTA = document.getElementById('cp-textarea');
    var cpNum = document.getElementById('cp-charnum');
    var cpBadge = document.getElementById('cp-badge');

    if (cpTA) {
      var saved = localStorage.getItem(P_KEY) || '';
      cpTA.value = saved;
      window._necrosisCustomPrompt = saved;
      if (cpNum) cpNum.textContent = saved.length;
      if (cpBadge) cpBadge.style.display = saved ? 'inline-flex' : 'none';

      cpTA.addEventListener('input', function() {
        if (this.value.length > 500) this.value = this.value.slice(0, 500);
        if (cpNum) cpNum.textContent = this.value.length;
      });
    }

    if (cpSave) {
      var newSave = cpSave.cloneNode(true);
      cpSave.parentNode.replaceChild(newSave, cpSave);
      newSave.addEventListener('click', function() {
        var p = cpTA ? cpTA.value.trim() : '';
        localStorage.setItem(P_KEY, p);
        window._necrosisCustomPrompt = p;
        if (cpBadge) cpBadge.style.display = p ? 'inline-flex' : 'none';
        toast(p ? '✅ Custom prompt aktif! AI akan mengikuti instruksi ini.' : '✅ Custom prompt dikosongkan');
      });
    }

    if (cpReset) {
      var newReset = cpReset.cloneNode(true);
      cpReset.parentNode.replaceChild(newReset, cpReset);
      newReset.addEventListener('click', function() {
        if (cpTA) { cpTA.value = ''; if (cpNum) cpNum.textContent = '0'; }
        localStorage.removeItem(P_KEY);
        window._necrosisCustomPrompt = '';
        if (cpBadge) cpBadge.style.display = 'none';
        toast('🔄 Custom prompt di-reset ke default');
      });
    }

    console.log('[Fix] ✅ Custom Prompt fixed');
  }

  // ============================================================
  // 4. RENAME CHAT + AI AUTO-NAMING yang benar
  // ============================================================
  function fixRenameChat() {
    // Override renderChatHistory untuk tambah rename button
    var chatHistoryEl = document.querySelector('.chat-history');
    if (!chatHistoryEl) return;

    // Observe untuk intercept render
    var observer = new MutationObserver(function() {
      enhanceChatItems();
    });
    observer.observe(chatHistoryEl, { childList: true });
    enhanceChatItems(); // initial

    function enhanceChatItems() {
      var items = chatHistoryEl.querySelectorAll('.chat-item');
      items.forEach(function(item) {
        if (item.dataset.renameAdded) return;
        item.dataset.renameAdded = '1';

        var titleEl = item.querySelector('.chat-item-title');
        var delBtn  = item.querySelector('.chat-del-btn');
        if (!titleEl) return;

        // Rename button
        var renameBtn = document.createElement('button');
        renameBtn.className = 'chat-rename-btn';
        renameBtn.title = 'Rename chat';
        renameBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        renameBtn.style.cssText = [
          'background:none', 'border:none', 'color:var(--gray)',
          'cursor:pointer', 'padding:3px 5px', 'font-size:11px',
          'opacity:0', 'transition:opacity 0.2s', 'flex-shrink:0',
        ].join(';');

        // Show on hover
        item.addEventListener('mouseenter', function() { renameBtn.style.opacity = '1'; });
        item.addEventListener('mouseleave', function() { renameBtn.style.opacity = '0'; });

        // Insert before delete btn
        if (delBtn) {
          item.insertBefore(renameBtn, delBtn);
        } else {
          item.appendChild(renameBtn);
        }

        renameBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          startRename(item, titleEl);
        });

        // Double-click title to rename
        titleEl.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          startRename(item, titleEl);
        });
      });
    }

    function startRename(item, titleEl) {
      var currentTitle = titleEl.textContent.trim();
      var input = document.createElement('input');
      input.type = 'text';
      input.value = currentTitle;
      input.maxLength = 60;
      input.style.cssText = [
        'background:var(--darker)', 'border:1px solid var(--primary)',
        'border-radius:6px', 'color:var(--light)', 'font-size:12px',
        'padding:3px 8px', 'width:100%', 'font-family:Poppins,sans-serif',
        'outline:none',
      ].join(';');

      titleEl.style.display = 'none';
      item.insertBefore(input, titleEl.nextSibling);
      input.focus();
      input.select();

      function commit() {
        var newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
          // Find and update chat in allChats
          var chats = getChats();
          var idx   = parseInt(item.dataset.index || '0');
          // Find by title match if index not available
          if (isNaN(idx)) {
            idx = chats.findIndex(function(c) {
              var t = c.title || (c.messages && c.messages.find(function(m) { return m.sender === 'user' && !m.isInitial; })?.text?.substring(0, 28));
              return t === currentTitle;
            });
          }
          if (idx >= 0 && chats[idx]) {
            chats[idx].title = newTitle;
            saveChats(chats);
            toast('✅ Nama chat diubah!');
          }
          titleEl.textContent = newTitle;
        }
        input.remove();
        titleEl.style.display = '';
      }

      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { input.remove(); titleEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);
    }

    console.log('[Fix] ✅ Rename Chat fixed');
  }

  // ============================================================
  // 5. PANEL "SEMUA OBROLAN" — tombol baru di sidebar
  // ============================================================
  function initSemuaObrolan() {
    // Buat panel
    var panel = document.createElement('div');
    panel.id  = 'semua-obrolan-panel';
    panel.style.cssText = [
      'position:fixed', 'top:0', 'left:-360px', 'width:340px', 'height:100vh',
      'background:var(--sidebar-bg)', 'z-index:1050',
      'border-right:1px solid var(--border)',
      'transition:left 0.3s cubic-bezier(0.4,0,0.2,1)',
      'display:flex', 'flex-direction:column',
      'box-shadow:4px 0 20px rgba(0,0,0,0.4)',
    ].join(';');

    panel.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);">',
        '<h3 style="color:var(--primary);font-size:16px;margin:0;"><i class="fas fa-comments"></i> Semua Obrolan</h3>',
        '<button id="semua-obrolan-close" style="background:none;border:none;color:var(--gray);font-size:22px;cursor:pointer;line-height:1;">&times;</button>',
      '</div>',
      // Search
      '<div style="padding:10px 14px 6px;">',
        '<div style="display:flex;align-items:center;gap:8px;background:var(--dark);border:1px solid var(--border);border-radius:10px;padding:8px 12px;">',
          '<i class="fas fa-search" style="color:var(--gray);font-size:12px;"></i>',
          '<input id="so-search" type="text" placeholder="🔍 Cari obrolan..." style="background:none;border:none;outline:none;color:var(--light);font-size:13px;width:100%;font-family:Poppins,sans-serif;">',
        '</div>',
      '</div>',
      // Stats + Hapus Semua
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 14px 8px;">',
        '<div id="so-stats" style="font-size:11px;color:var(--gray);"></div>',
        '<button id="so-delete-all-btn" style="background:rgba(255,69,0,0.1);border:1px solid rgba(255,69,0,0.3);color:#ff4444;font-size:11px;padding:4px 10px;border-radius:8px;cursor:pointer;font-family:Poppins,sans-serif;">',
          '<i class=\"fas fa-trash\"></i> Hapus Semua',
        '</button>',
      '</div>',
      // List
      '<div id="so-list" style="flex:1;overflow-y:auto;padding:0 10px 10px;scrollbar-width:thin;"></div>',
    ].join('');

    document.body.appendChild(panel);

    // Overlay
    var overlay = document.createElement('div');
    overlay.id = 'semua-obrolan-overlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1049;backdrop-filter:blur(3px);';
    document.body.appendChild(overlay);

    function openPanel() {
      renderSOList('');
      panel.style.left = '0';
      overlay.style.display = 'block';
    }
    function closePanel() {
      panel.style.left = '-360px';
      overlay.style.display = 'none';
    }

    document.getElementById('semua-obrolan-close').addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);

    // Delete All button handler
    panel.addEventListener('click', function(e) {
      if (e.target.closest('#so-delete-all-btn')) {
        var chats = getChats();
        if (!chats.length) { toast('⚠️ Tidak ada obrolan!'); return; }
        if (!confirm('Hapus SEMUA ' + chats.length + ' obrolan? Tidak bisa dikembalikan!')) return;
        localStorage.removeItem('necrosis_ai_chats');
        localStorage.removeItem('currentChatIndex');
        renderSOList('');
        toast('🗑️ Semua obrolan dihapus!');
        setTimeout(function() { location.reload(); }, 800);
      }
    });

    // Search input
    document.getElementById('so-search').addEventListener('input', function() {
      renderSOList(this.value.trim().toLowerCase());
    });

    function renderSOList(query) {
      var list   = document.getElementById('so-list');
      var stats  = document.getElementById('so-stats');
      var chats  = getChats();
      if (!list) return;

      var filtered = chats.filter(function(c, i) {
        if (!query) return true;
        var title = getTitle(c, i);
        var msgs  = (c.messages || []).map(function(m) { return m.text || ''; }).join(' ');
        return title.toLowerCase().includes(query) || msgs.toLowerCase().includes(query);
      });

      if (stats) stats.textContent = filtered.length + ' dari ' + chats.length + ' obrolan';

      if (!filtered.length) {
        list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:24px;font-size:13px;">' +
          (query ? '🔍 Tidak ada hasil untuk "' + query + '"' : '💬 Belum ada obrolan') + '</p>';
        return;
      }

      list.innerHTML = '';
      filtered.forEach(function(chat, fi) {
        // Find original index
        var origIdx = chats.indexOf(chat);
        var title   = getTitle(chat, origIdx);
        var msgCount = (chat.messages || []).filter(function(m) { return !m.isInitial; }).length;
        var lastMsg  = '';
        for (var i = (chat.messages || []).length - 1; i >= 0; i--) {
          if (!chat.messages[i].isInitial && chat.messages[i].text) {
            lastMsg = chat.messages[i].text.substring(0, 60) + (chat.messages[i].text.length > 60 ? '...' : '');
            break;
          }
        }
        var modeIcon = getModeIcon(chat.mode || 'necrosis_ai');
        var isActive = origIdx === getCurrentChatIndex();

        var item = document.createElement('div');
        item.style.cssText = [
          'background:' + (isActive ? 'rgba(230,0,0,0.1)' : 'var(--dark)'),
          'border:1px solid ' + (isActive ? 'rgba(230,0,0,0.3)' : 'var(--border)'),
          'border-radius:10px', 'padding:10px 12px', 'margin-bottom:6px',
          'cursor:pointer', 'transition:all 0.2s',
        ].join(';');

        item.innerHTML = [
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">',
            '<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">',
              '<i class="' + modeIcon + '" style="color:var(--primary);font-size:13px;flex-shrink:0;"></i>',
              '<span style="font-size:13px;font-weight:600;color:var(--light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(title) + '</span>',
            '</div>',
            '<div style="display:flex;gap:4px;flex-shrink:0;">',
              '<button class="so-rename-btn" data-idx="' + origIdx + '" style="background:none;border:none;color:var(--gray);cursor:pointer;font-size:11px;padding:3px;" title="Rename"><i class="fas fa-pencil-alt"></i></button>',
              '<button class="so-del-btn" data-idx="' + origIdx + '" style="background:none;border:1px solid rgba(255,0,0,0.3);color:#ff4444;cursor:pointer;font-size:11px;padding:3px 6px;border-radius:5px;" title="Hapus"><i class="fas fa-trash"></i></button>',
            '</div>',
          '</div>',
          lastMsg ? '<div style="font-size:11px;color:var(--gray);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(lastMsg) + '</div>' : '',
          '<div style="font-size:10px;color:rgba(255,255,255,0.2);margin-top:3px;">' + msgCount + ' pesan</div>',
        ].join('');

        item.addEventListener('click', function(e) {
          if (e.target.closest('.so-rename-btn') || e.target.closest('.so-del-btn')) return;
          // Select chat
          var selectBtn = document.querySelector('.chat-item:nth-child(' + (origIdx + 1) + ') .chat-item-title');
          // Trigger selectChat
          if (window._necrosisSelectChat) {
            window._necrosisSelectChat(origIdx);
          } else {
            // fallback — find and click in sidebar
            var chatItems = document.querySelectorAll('.chat-item');
            if (chatItems[origIdx]) {
              var titleBtn = chatItems[origIdx].querySelector('.chat-item-title');
              if (titleBtn) titleBtn.click();
            }
          }
          closePanel();
        });

        // Rename btn
        item.querySelector('.so-rename-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(this.dataset.idx);
          var chats = getChats();
          if (!chats[idx]) return;
          var curTitle = getTitle(chats[idx], idx);
          var newTitle = prompt('Rename obrolan:', curTitle);
          if (newTitle && newTitle.trim()) {
            chats[idx].title = newTitle.trim();
            saveChats(chats);
            renderSOList(document.getElementById('so-search')?.value || '');
            toast('✅ Nama obrolan diubah!');
          }
        });

        // Delete btn
        item.querySelector('.so-del-btn').addEventListener('click', function(e) {
          e.stopPropagation();
          if (!confirm('Hapus obrolan ini?')) return;
          var idx = parseInt(this.dataset.idx);
          var chats = getChats();
          chats.splice(idx, 1);
          saveChats(chats);
          renderSOList(document.getElementById('so-search')?.value || '');
          toast('🗑️ Obrolan dihapus');
          // Re-render sidebar
          setTimeout(function() {
            var delBtns = document.querySelectorAll('.chat-del-btn');
            // trigger a re-render via the delete button event if available
          }, 100);
        });

        list.appendChild(item);
      });
    }

    // Add "Semua Obrolan" button to sidebar
    var settingsSection = document.querySelector('.settings-section');
    if (settingsSection) {
      var soDiv = document.createElement('div');
      soDiv.style.cssText = 'padding:10px 20px;border-bottom:1px solid var(--border);margin-bottom:10px;';
      soDiv.innerHTML = '<button id="semua-obrolan-btn" class="sidebar-action-btn">' +
        '<i class="fas fa-comments"></i> Semua Obrolan' +
        '</button>';
      settingsSection.parentNode.insertBefore(soDiv, settingsSection);
      document.getElementById('semua-obrolan-btn').addEventListener('click', function() {
        openPanel();
        var sidebar = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
      });
    }

    function getTitle(chat, idx) {
      if (chat.title) return chat.title;
      var firstUser = (chat.messages || []).find(function(m) { return m.sender === 'user' && !m.isInitial; });
      return firstUser ? firstUser.text.substring(0, 35) + (firstUser.text.length > 35 ? '...' : '') : 'Chat ' + (idx + 1);
    }
    function getModeIcon(mode) {
      var icons = { necrosis_ai: 'fas fa-dragon', programmer: 'fas fa-terminal', thinking: 'fas fa-brain', search: 'fas fa-globe', curhat: 'fas fa-dove', createimg: 'fas fa-image' };
      return icons[mode] || 'fas fa-comment';
    }
    function getCurrentChatIndex() {
      try { return parseInt(localStorage.getItem('currentChatIndex') || '-1'); } catch(e) { return -1; }
    }
    function escHtml(str) {
      return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    console.log('[Fix] ✅ Semua Obrolan panel loaded');
  }

  // ============================================================
  // 6. FIX CARI OBROLAN — improve existing search di sidebar
  // ============================================================
  function fixCariObrolan() {
    // Ganti label "Riwayat Chat" jadi juga punya tombol search
    var label = document.querySelector('.chat-history-label');
    if (!label) return;

    // Update label
    label.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;">',
        '<span><i class="fas fa-history"></i> Riwayat Chat</span>',
        '<span id="chat-count-badge" style="font-size:10px;color:var(--gray);background:var(--dark);padding:2px 7px;border-radius:10px;"></span>',
      '</div>',
    ].join('');

    // Update count badge
    function updateBadge() {
      var badge = document.getElementById('chat-count-badge');
      if (badge) badge.textContent = getChats().length + ' chat';
    }
    updateBadge();
    setInterval(updateBadge, 3000);

    // Improve existing search
    var searchInput = document.getElementById('chat-search-input');
    if (!searchInput) return;

    // Restyle the search container
    var searchWrap = searchInput.closest('div[style]');
    if (searchWrap) {
      var parent = searchWrap.parentElement;
      if (parent) parent.style.padding = '6px 14px 8px';
    }

    // Clear button
    var clearBtn = document.createElement('button');
    clearBtn.innerHTML = '&times;';
    clearBtn.style.cssText = 'background:none;border:none;color:var(--gray);cursor:pointer;font-size:16px;line-height:1;padding:0;display:none;';
    searchInput.parentNode.appendChild(clearBtn);

    searchInput.addEventListener('input', function() {
      clearBtn.style.display = this.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', function() {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.focus();
    });

    console.log('[Fix] ✅ Cari Obrolan fixed');
  }

  // ============================================================
  // 7. PINDAH RINGKAS + BATCH EXPORT KE SETTINGS
  //    + fix fungsi export bener-bener jalan
  // ============================================================
  function fixExportAndSummarize() {
    // Hapus dari sidebar
    var ringkasDiv = document.getElementById('summarize-chat-btn')?.closest('div[style]');
    var batchDiv   = document.getElementById('batch-export-btn')?.closest('div[style]');
    if (ringkasDiv) ringkasDiv.remove();
    if (batchDiv)   batchDiv.remove();

    // Tambahkan ke settings panel
    var settingsPanel = document.getElementById('settings-panel');
    var exportItem    = document.querySelector('.settings-item:has(#export-txt-btn)') ||
                        document.getElementById('export-txt-btn')?.closest('.settings-item');
    if (!settingsPanel) return;

    // Find export section and enhance it
    var exportTxt = document.getElementById('export-txt-btn');
    var exportPdf = document.getElementById('export-pdf-btn');
    var parent    = exportTxt?.closest('.settings-item');

    if (parent) {
      // Add Ringkas & Batch Export buttons in same section
      var extra = document.createElement('div');
      extra.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
      extra.innerHTML = [
        '<button id="settings-summarize-btn" class="export-btn" style="flex:1;border-color:#00c864;color:#00c864;background:rgba(0,200,100,0.05);">',
          '<i class="fas fa-compress-alt"></i> Ringkas Chat',
        '</button>',
        '<button id="settings-batch-export-btn" class="export-btn" style="flex:1;border-color:#bc13fe;color:#bc13fe;background:rgba(188,19,254,0.05);">',
          '<i class="fas fa-file-archive"></i> Batch Export',
        '</button>',
      ].join('');
      parent.appendChild(extra);
    }

    // Fix Export TXT — actually works
    var realExportTxt = document.getElementById('export-txt-btn');
    if (realExportTxt) {
      realExportTxt.onclick = function() {
        var chats  = getChats();
        var curIdx = parseInt(localStorage.getItem('currentChatIndex') || '0');
        var chat   = chats[curIdx];
        if (!chat) { toast('⚠️ Tidak ada chat aktif'); return; }
        var msgs = (chat.messages || []).filter(function(m) { return !m.isInitial; });
        if (!msgs.length) { toast('⚠️ Chat masih kosong'); return; }
        var title  = chat.title || 'Chat ' + (curIdx + 1);
        var text   = '=== ' + title + ' ===\nDiekspor: ' + new Date().toLocaleString('id-ID') + '\n\n';
        msgs.forEach(function(m) {
          text += (m.sender === 'user' ? '👤 Kamu' : '🤖 Necrosis AI') + ':\n' + (m.text || '') + '\n\n';
        });
        downloadText(text, 'necrosis-' + Date.now() + '.txt');
        toast('✅ Chat diekspor sebagai TXT!');
      };
    }

    // Fix Export PDF
    var realExportPdf = document.getElementById('export-pdf-btn');
    if (realExportPdf) {
      realExportPdf.onclick = function() {
        var chats  = getChats();
        var curIdx = parseInt(localStorage.getItem('currentChatIndex') || '0');
        var chat   = chats[curIdx];
        if (!chat) { toast('⚠️ Tidak ada chat aktif'); return; }
        var msgs = (chat.messages || []).filter(function(m) { return !m.isInitial; });
        if (!msgs.length) { toast('⚠️ Chat masih kosong'); return; }
        var title = chat.title || 'Chat';
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title>' +
          '<style>body{font-family:Arial,sans-serif;max-width:750px;margin:0 auto;padding:20px;color:#111;}' +
          'h1{color:#e60000;border-bottom:2px solid #e60000;padding-bottom:8px;}' +
          '.msg{margin:14px 0;padding:12px;border-radius:8px;}' +
          '.user{background:#f5f5f5;border-left:4px solid #e60000;}' +
          '.ai{background:#f9f0ff;border-left:4px solid #bc13fe;}' +
          '.sender{font-weight:700;margin-bottom:4px;}' +
          'pre{background:#f0f0f0;padding:8px;border-radius:4px;overflow-x:auto;}</style></head>' +
          '<body><h1>🤖 ' + title + '</h1><p style="color:#666;font-size:13px;">Diekspor: ' + new Date().toLocaleString('id-ID') + '</p>';
        msgs.forEach(function(m) {
          var isUser = m.sender === 'user';
          html += '<div class="msg ' + (isUser ? 'user' : 'ai') + '">' +
            '<div class="sender">' + (isUser ? '👤 Kamu' : '🤖 Necrosis AI') + '</div>' +
            '<div>' + (m.text || '').replace(/\n/g,'<br>').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div></div>';
        });
        html += '</body></html>';
        var w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.onload = function() { w.print(); }; }
        toast('✅ PDF sedang dibuka...');
      };
    }

    // Ringkas Chat (in settings)
    document.addEventListener('click', function(e) {
      if (e.target && (e.target.id === 'settings-summarize-btn' || e.target.closest('#settings-summarize-btn'))) {
        doSummarize();
      }
    });

    async function doSummarize() {
      var chats  = getChats();
      var curIdx = parseInt(localStorage.getItem('currentChatIndex') || '0');
      var chat   = chats[curIdx];
      if (!chat) { toast('⚠️ Tidak ada chat aktif'); return; }
      var msgs = (chat.messages || []).filter(function(m) { return !m.isInitial && m.text; });
      if (msgs.length < 3) { toast('⚠️ Chat terlalu pendek untuk diringkas'); return; }

      var btn = document.getElementById('settings-summarize-btn');
      if (btn) { btn.textContent = '⏳ Meringkas...'; btn.disabled = true; }

      var convo = msgs.map(function(m) {
        return (m.sender === 'user' ? 'User' : 'AI') + ': ' + (m.text || '').substring(0, 200);
      }).join('\n');
      var prompt = 'Buat ringkasan singkat (maks 3 paragraf) dari percakapan berikut:\n\n' + convo;

      try {
        var apiKey = window._groqKeyGlobal || '';
        var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }], max_tokens: 400 }),
        });
        var data = await res.json();
        var summary = data.choices?.[0]?.message?.content || '';
        if (summary) {
          // Show in chat
          var cc = document.getElementById('chat-container');
          if (cc) {
            var div = document.createElement('div');
            div.style.cssText = 'background:rgba(0,200,100,0.07);border:1px solid rgba(0,200,100,0.2);border-radius:12px;padding:14px 16px;margin:10px 0;font-size:13px;';
            div.innerHTML = '<b style="color:#00c864"><i class="fas fa-compress-alt"></i> Ringkasan Chat:</b><br><br>' + summary.replace(/\n/g,'<br>');
            cc.appendChild(div);
            cc.scrollTop = cc.scrollHeight;
          }
          toast('✅ Chat berhasil diringkas!');
        }
      } catch(e) {
        toast('❌ Gagal meringkas: ' + e.message);
      } finally {
        if (btn) { btn.innerHTML = '<i class="fas fa-compress-alt"></i> Ringkas Chat'; btn.disabled = false; }
      }
    }

    // Batch Export (in settings)
    document.addEventListener('click', function(e) {
      if (e.target && (e.target.id === 'settings-batch-export-btn' || e.target.closest('#settings-batch-export-btn'))) {
        var chats = getChats();
        if (!chats.length) { toast('⚠️ Tidak ada chat untuk diekspor!'); return; }
        var text = 'NECROSIS AI — BATCH EXPORT\nDiekspor: ' + new Date().toLocaleString('id-ID') + '\nTotal: ' + chats.length + ' chat\n\n';
        chats.forEach(function(c, i) {
          var title = c.title || 'Chat ' + (i + 1);
          var msgs  = (c.messages || []).filter(function(m) { return !m.isInitial; });
          text += '═'.repeat(40) + '\n' + title + '\n' + '═'.repeat(40) + '\n';
          msgs.forEach(function(m) {
            text += (m.sender === 'user' ? '👤 ' : '🤖 ') + (m.text || '') + '\n\n';
          });
          text += '\n';
        });
        downloadText(text, 'necrosis-batch-' + Date.now() + '.txt');
        toast('✅ ' + chats.length + ' chat diekspor!');
      }
    });

    function downloadText(content, filename) {
      var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    console.log('[Fix] ✅ Export & Summarize in Settings fixed');
  }

  // ============================================================
  // 8. FIX SETTINGS — semua fitur benar-benar berfungsi
  // ============================================================
  function fixSettings() {
    // ── Font Size ──────────────────────────────────────────
    var fontDecBtn = document.getElementById('font-decrease');
    var fontIncBtn = document.getElementById('font-increase');
    var fontValEl  = document.getElementById('font-size-value');
    var FS_KEY     = 'necrosis_font_size';
    var fontSize   = parseInt(localStorage.getItem(FS_KEY)) || 16;

    function applyFont(size) {
      fontSize = Math.max(12, Math.min(22, size));
      document.documentElement.style.setProperty('--font-size', fontSize + 'px');
      document.body.style.fontSize = fontSize + 'px';
      if (fontValEl) fontValEl.textContent = fontSize;
      localStorage.setItem(FS_KEY, fontSize);
    }
    applyFont(fontSize);

    if (fontDecBtn) { fontDecBtn.onclick = function() { applyFont(fontSize - 1); }; }
    if (fontIncBtn) { fontIncBtn.onclick = function() { applyFont(fontSize + 1); }; }

    // ── Theme ──────────────────────────────────────────────
    var THEME_KEY = 'necrosis_theme';
    function applyTheme(t) {
      document.body.classList.remove('blue-theme', 'light-theme');
      if (t === 'blue')  document.body.classList.add('blue-theme');
      if (t === 'light') document.body.classList.add('light-theme');
      localStorage.setItem(THEME_KEY, t);
      document.querySelectorAll('.theme-option').forEach(function(el) {
        el.classList.toggle('active', el.dataset.theme === t);
        el.style.border = el.dataset.theme === t ? '2px solid var(--primary)' : '';
      });
    }
    applyTheme(localStorage.getItem(THEME_KEY) || 'red');
    document.querySelectorAll('.theme-option').forEach(function(el) {
      el.addEventListener('click', function() { applyTheme(this.dataset.theme); });
    });

    // ── Snow Effect ────────────────────────────────────────
    var SNOW_KEY  = 'necrosis_snow';
    var snowToggle = document.getElementById('snow-toggle');
    var isSnowing  = localStorage.getItem(SNOW_KEY) === 'true';
    if (snowToggle) {
      snowToggle.classList.toggle('active', isSnowing);
      if (isSnowing && window.snowEffect) window.snowEffect.start();
      snowToggle.onclick = function() {
        isSnowing = !isSnowing;
        snowToggle.classList.toggle('active', isSnowing);
        localStorage.setItem(SNOW_KEY, isSnowing);
        if (window.snowEffect) { isSnowing ? window.snowEffect.start() : window.snowEffect.stop(); }
        toast(isSnowing ? '❄️ Efek salju aktif!' : '❌ Efek salju dimatikan');
      };
    }

    // ── Response Style ─────────────────────────────────────
    var RS_KEY = 'necrosis_response_style';
    var savedStyle = localStorage.getItem(RS_KEY) || 'friendly';
    document.querySelectorAll('input[name="response-style"]').forEach(function(r) {
      r.checked = (r.value === savedStyle);
      r.addEventListener('change', function() {
        localStorage.setItem(RS_KEY, this.value);
        window._necrosisResponseStyle = this.value;
        toast('✅ Gaya bicara: ' + this.value);
      });
    });

    // ── Clear Memory ───────────────────────────────────────
    var clearMemBtn = document.getElementById('clear-memory-btn');
    if (clearMemBtn) {
      clearMemBtn.onclick = function() {
        if (!confirm('Hapus semua memori? Riwayat chat di localStorage akan dihapus.')) return;
        localStorage.removeItem('necrosis_ai_chats');
        localStorage.removeItem('currentChatIndex');
        toast('🗑️ Semua memori dihapus!');
        setTimeout(function() { location.reload(); }, 1000);
      };
    }

    // Update memory stats
    function updateMemStats() {
      var chats = getChats();
      var totalMsgs = chats.reduce(function(acc, c) { return acc + (c.messages || []).length; }, 0);
      var sizeKB = Math.round(JSON.stringify(chats).length / 1024);
      var el1 = document.getElementById('total-chats-count');
      var el2 = document.getElementById('total-messages-count');
      var el3 = document.getElementById('memory-size');
      if (el1) el1.textContent = chats.length;
      if (el2) el2.textContent = totalMsgs;
      if (el3) el3.textContent = sizeKB + ' KB';
    }
    updateMemStats();
    setInterval(updateMemStats, 5000);

    // ── Notification ───────────────────────────────────────
    var notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
      if (Notification.permission === 'granted') {
        notifBtn.innerHTML = '<i class="fas fa-bell"></i> Notifikasi Aktif ✅';
        notifBtn.style.borderColor = '#00c864';
        notifBtn.style.color = '#00c864';
      }
      notifBtn.onclick = function() {
        if (Notification.permission === 'granted') {
          toast('✅ Notifikasi sudah aktif!'); return;
        }
        Notification.requestPermission().then(function(perm) {
          if (perm === 'granted') {
            notifBtn.innerHTML = '<i class="fas fa-bell"></i> Notifikasi Aktif ✅';
            notifBtn.style.borderColor = '#00c864';
            notifBtn.style.color = '#00c864';
            new Notification('Necrosis AI', { body: '✅ Notifikasi berhasil diaktifkan!' });
            toast('✅ Notifikasi aktif!');
          } else {
            toast('❌ Izin notifikasi ditolak');
          }
        });
      };
    }

    // ── Follow-up Questions toggle ─────────────────────────
    var FQ_KEY  = 'necrosis_followup';
    var fqToggle = document.getElementById('followup-toggle');
    var fqActive = localStorage.getItem(FQ_KEY) !== 'false';
    if (fqToggle) {
      fqToggle.classList.toggle('active', fqActive);
      fqToggle.onclick = function() {
        fqActive = !fqActive;
        localStorage.setItem(FQ_KEY, fqActive);
        fqToggle.classList.toggle('active', fqActive);
        window._necrosisFollowup = fqActive;
        toast(fqActive ? '✅ Follow-up questions aktif' : '❌ Follow-up questions dimatikan');
      };
    }

    console.log('[Fix] ✅ Settings all fixed');
  }

  // ============================================================
  // 9. FIX AI AUTO-NAMING — trigger segera setelah pesan pertama
  // ============================================================
  function fixAutoNaming() {
    // Expose selectChat to global so Semua Obrolan panel bisa pakai
    var origSelectChat = window._necrosisSelectChat;

    // Patch: intercept setelah sendMessage berhasil
    var chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    var autoNameDone = {};

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1 || !node.classList.contains('ai')) return;
          // Ambil index chat aktif
          var curIdx = parseInt(localStorage.getItem('currentChatIndex') || '-1');
          if (curIdx < 0 || autoNameDone[curIdx]) return;

          var chats = getChats();
          var chat  = chats[curIdx];
          if (!chat || chat.title) return; // sudah ada title

          // Cek apakah ini respons pertama
          var userMsgs = (chat.messages || []).filter(function(m) { return m.sender === 'user' && !m.isInitial; });
          if (userMsgs.length !== 1) return; // hanya auto-name setelah pesan pertama

          autoNameDone[curIdx] = true;
          var firstMsg = userMsgs[0].text || '';

          // Auto-name via AI
          (async function() {
            try {
              var apiKey = window._groqKeyGlobal || '';
              var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                  model: 'llama3-8b-8192',
                  messages: [
                    { role: 'system', content: 'Buat judul singkat (maks 5 kata, tanpa tanda kutip, tanpa titik) untuk chat. Balas HANYA judulnya.' },
                    { role: 'user', content: firstMsg.substring(0, 120) },
                  ],
                  max_tokens: 20,
                }),
              });
              var data = await res.json();
              var title = (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
              if (title && title.length > 0 && title.length < 60) {
                var chats2 = getChats();
                if (chats2[curIdx] && !chats2[curIdx].title) {
                  chats2[curIdx].title = title;
                  saveChats(chats2);
                  // Re-render history
                  var histEl = document.querySelector('.chat-history');
                  var items  = histEl ? histEl.querySelectorAll('.chat-item') : [];
                  if (items[curIdx]) {
                    var titleEl = items[curIdx].querySelector('.chat-item-title');
                    if (titleEl) titleEl.textContent = title;
                  }
                }
              }
            } catch(e) { /* gagal auto-name = ok */ }
          })();
        });
      });
    });
    observer.observe(chatContainer, { childList: true });

    console.log('[Fix] ✅ AI Auto-naming fixed');
  }

  // ============================================================
  // INIT — jalankan semua fix
  // ============================================================
  function init() {
    fixModelSelector();
    fixTTSVoices();
    fixCustomPrompt();
    fixRenameChat();
    initSemuaObrolan();
    fixCariObrolan();
    fixExportAndSummarize();
    fixSettings();
    fixAutoNaming();
    console.log('[NecrosisFixes] ✅ Semua fix berhasil dimuat!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Delay sedikit supaya script.js selesai dulu
    setTimeout(init, 600);
  }

})();
