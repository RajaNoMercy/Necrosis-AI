// ============================================================
//  NECROSIS AI — SETTINGS MANAGER v3.0
//  Mengelola settings UI dengan button-based system
//  Setiap fitur memiliki tombol sendiri dan modal tersendiri
// ============================================================

class SettingsManager {
  constructor() {
    this.activePanel = null;
    this.settings = this.loadSettings();
    this.initializeButtons();
  }

  loadSettings() {
    const saved = localStorage.getItem('necrosisSettings');
    return saved ? JSON.parse(saved) : {
      tts: { voice: 'Google US English', rate: 1.0, pitch: 1.0, enabled: true },
      translator: { sourceLang: 'auto', targetLang: 'id', enabled: true },
      voiceInput: { language: 'id-ID', enabled: true },
      codeGenerator: { language: 'javascript', theme: 'dark', enabled: true },
      imageGenerator: { model: 'pollinations', quality: 'high', enabled: true },
      summarizer: { style: 'concise', maxTokens: 200, enabled: true },
      persona: { selected: 'professional', customPrompt: '', enabled: true },
      webSearch: { engine: 'google', safeSearch: true, enabled: true },
      shortcuts: { enabled: true, customShortcuts: [] },
      autocomplete: { enabled: true, suggestions: 5 },
      quickReply: { enabled: true, templates: [] },
    };
  }

  saveSettings() {
    localStorage.setItem('necrosisSettings', JSON.stringify(this.settings));
  }

  // ─── Initialize all feature buttons ───────────────────────
  initializeButtons() {
    const features = [
      { id: 'tts', name: 'Text-to-Speech', icon: '🔊', color: '#FF6B6B' },
      { id: 'translator', name: 'Translator', icon: '🌐', color: '#4ECDC4' },
      { id: 'voiceInput', name: 'Voice Input', icon: '🎤', color: '#45B7D1' },
      { id: 'codeGenerator', name: 'Code Generator', icon: '💻', color: '#96CEB4' },
      { id: 'imageGenerator', name: 'Image Generator', icon: '🎨', color: '#FFEAA7' },
      { id: 'summarizer', name: 'Summarizer', icon: '📝', color: '#DDA15E' },
      { id: 'persona', name: 'Persona', icon: '👤', color: '#BC6C25' },
      { id: 'webSearch', name: 'Web Search', icon: '🔍', color: '#0084D0' },
      { id: 'shortcuts', name: 'Shortcuts', icon: '⌨️', color: '#A569BD' },
      { id: 'autocomplete', name: 'Autocomplete', icon: '✨', color: '#6C5B7B' },
      { id: 'quickReply', name: 'Quick Reply', icon: '💬', color: '#2D728F' },
    ];

    const container = document.getElementById('settings-buttons-container');
    if (!container) return;

    features.forEach(feature => {
      const btn = document.createElement('button');
      btn.className = 'settings-feature-btn';
      btn.innerHTML = `<span class="settings-btn-icon">${feature.icon}</span><span class="settings-btn-label">${feature.name}</span>`;
      btn.style.borderColor = feature.color;
      btn.style.color = feature.color;
      btn.onclick = () => this.openPanel(feature.id, feature.name, feature.icon, feature.color);
      container.appendChild(btn);
    });
  }

  // ─── Open settings panel for feature ───────────────────────
  openPanel(featureId, featureName, icon, color) {
    // Close previous panel
    if (this.activePanel) this.activePanel.remove();

    const panel = document.createElement('div');
    panel.className = 'settings-panel-modal';
    panel.id = `settings-panel-${featureId}`;

    let content = '';
    const set = this.settings[featureId];

    // Build content based on feature
    switch (featureId) {
      case 'tts':
        content = this.buildTTSPanel(set);
        break;
      case 'translator':
        content = this.buildTranslatorPanel(set);
        break;
      case 'voiceInput':
        content = this.buildVoiceInputPanel(set);
        break;
      case 'codeGenerator':
        content = this.buildCodeGeneratorPanel(set);
        break;
      case 'imageGenerator':
        content = this.buildImageGeneratorPanel(set);
        break;
      case 'summarizer':
        content = this.buildSummarizerPanel(set);
        break;
      case 'persona':
        content = this.buildPersonaPanel(set);
        break;
      case 'webSearch':
        content = this.buildWebSearchPanel(set);
        break;
      case 'shortcuts':
        content = this.buildShortcutsPanel(set);
        break;
      case 'autocomplete':
        content = this.buildAutocompletePanel(set);
        break;
      case 'quickReply':
        content = this.buildQuickReplyPanel(set);
        break;
    }

    panel.innerHTML = `
      <div class="settings-modal-header" style="border-bottom-color: ${color}; border-left-color: ${color}">
        <span class="settings-modal-icon">${icon}</span>
        <h2 class="settings-modal-title">${featureName}</h2>
        <button class="settings-modal-close" onclick="window.necrosisSettingsManager.closePanel()">&times;</button>
      </div>
      <div class="settings-modal-content">
        ${content}
      </div>
      <div class="settings-modal-footer">
        <button class="settings-save-btn" onclick="window.necrosisSettingsManager.saveAndClose('${featureId}')">💾 Save</button>
        <button class="settings-cancel-btn" onclick="window.necrosisSettingsManager.closePanel()">Cancel</button>
      </div>
    `;

    document.body.appendChild(panel);
    this.activePanel = panel;
  }

  closePanel() {
    if (this.activePanel) {
      this.activePanel.remove();
      this.activePanel = null;
    }
  }

  saveAndClose(featureId) {
    // Collect values from form
    const inputs = document.querySelectorAll(`#settings-panel-${featureId} input, #settings-panel-${featureId} select, #settings-panel-${featureId} textarea`);
    inputs.forEach(input => {
      if (input.name && input.name.startsWith(featureId + '_')) {
        const key = input.name.replace(featureId + '_', '');
        if (input.type === 'checkbox') {
          this.settings[featureId][key] = input.checked;
        } else if (input.type === 'number') {
          this.settings[featureId][key] = parseFloat(input.value);
        } else {
          this.settings[featureId][key] = input.value;
        }
      }
    });
    this.saveSettings();
    this.closePanel();
    console.log(`[Settings] ✅ ${featureId} saved`);
  }

  // ─── Build individual feature panels ───────────────────────

  buildTTSPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Voice</label>
        <select name="tts_voice" class="settings-input">
          <option value="Google US English" ${set.voice === 'Google US English' ? 'selected' : ''}>Google US English</option>
          <option value="Google UK English" ${set.voice === 'Google UK English' ? 'selected' : ''}>Google UK English</option>
          <option value="Microsoft David" ${set.voice === 'Microsoft David' ? 'selected' : ''}>Microsoft David</option>
          <option value="Natural Female" ${set.voice === 'Natural Female' ? 'selected' : ''}>Natural Female</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label>Speed <span class="settings-value">${set.rate}x</span></label>
        <input type="range" name="tts_rate" min="0.5" max="2" step="0.1" value="${set.rate}" class="settings-slider" onchange="document.querySelector('.settings-value').textContent = this.value + 'x'">
      </div>
      <div class="settings-control-group">
        <label>Pitch <span class="settings-value">${set.pitch}x</span></label>
        <input type="range" name="tts_pitch" min="0.5" max="2" step="0.1" value="${set.pitch}" class="settings-slider" onchange="document.querySelector('.settings-value').textContent = this.value + 'x'">
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="tts_enabled" ${set.enabled ? 'checked' : ''}>
          Enable TTS
        </label>
      </div>
      <div class="settings-info">ℹ️ Fitur Text-to-Speech untuk membaca respon AI dengan suara</div>
    `;
  }

  buildTranslatorPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Source Language</label>
        <select name="translator_sourceLang" class="settings-input">
          <option value="auto" ${set.sourceLang === 'auto' ? 'selected' : ''}>Auto Detect</option>
          <option value="en" ${set.sourceLang === 'en' ? 'selected' : ''}>English</option>
          <option value="id" ${set.sourceLang === 'id' ? 'selected' : ''}>Indonesian</option>
          <option value="fr" ${set.sourceLang === 'fr' ? 'selected' : ''}>French</option>
          <option value="es" ${set.sourceLang === 'es' ? 'selected' : ''}>Spanish</option>
          <option value="de" ${set.sourceLang === 'de' ? 'selected' : ''}>German</option>
          <option value="ja" ${set.sourceLang === 'ja' ? 'selected' : ''}>Japanese</option>
          <option value="zh" ${set.sourceLang === 'zh' ? 'selected' : ''}>Chinese</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label>Target Language</label>
        <select name="translator_targetLang" class="settings-input">
          <option value="id" ${set.targetLang === 'id' ? 'selected' : ''}>Indonesian</option>
          <option value="en" ${set.targetLang === 'en' ? 'selected' : ''}>English</option>
          <option value="fr" ${set.targetLang === 'fr' ? 'selected' : ''}>French</option>
          <option value="es" ${set.targetLang === 'es' ? 'selected' : ''}>Spanish</option>
          <option value="de" ${set.targetLang === 'de' ? 'selected' : ''}>German</option>
          <option value="ja" ${set.targetLang === 'ja' ? 'selected' : ''}>Japanese</option>
          <option value="zh" ${set.targetLang === 'zh' ? 'selected' : ''}>Chinese</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="translator_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Translator
        </label>
      </div>
      <div class="settings-info">ℹ️ Terjemahkan teks ke bahasa yang Anda pilih</div>
    `;
  }

  buildVoiceInputPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Language</label>
        <select name="voiceInput_language" class="settings-input">
          <option value="id-ID" ${set.language === 'id-ID' ? 'selected' : ''}>Indonesian</option>
          <option value="en-US" ${set.language === 'en-US' ? 'selected' : ''}>English (US)</option>
          <option value="en-GB" ${set.language === 'en-GB' ? 'selected' : ''}>English (UK)</option>
          <option value="ja-JP" ${set.language === 'ja-JP' ? 'selected' : ''}>Japanese</option>
          <option value="zh-CN" ${set.language === 'zh-CN' ? 'selected' : ''}>Chinese (Simplified)</option>
          <option value="fr-FR" ${set.language === 'fr-FR' ? 'selected' : ''}>French</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="voiceInput_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Voice Input
        </label>
      </div>
      <div class="settings-info">ℹ️ Gunakan microphone untuk input suara</div>
    `;
  }

  buildCodeGeneratorPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Programming Language</label>
        <select name="codeGenerator_language" class="settings-input">
          <option value="javascript" ${set.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
          <option value="python" ${set.language === 'python' ? 'selected' : ''}>Python</option>
          <option value="java" ${set.language === 'java' ? 'selected' : ''}>Java</option>
          <option value="cpp" ${set.language === 'cpp' ? 'selected' : ''}>C++</option>
          <option value="php" ${set.language === 'php' ? 'selected' : ''}>PHP</option>
          <option value="sql" ${set.language === 'sql' ? 'selected' : ''}>SQL</option>
          <option value="go" ${set.language === 'go' ? 'selected' : ''}>Go</option>
          <option value="rust" ${set.language === 'rust' ? 'selected' : ''}>Rust</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label>Theme</label>
        <select name="codeGenerator_theme" class="settings-input">
          <option value="dark" ${set.theme === 'dark' ? 'selected' : ''}>Dark</option>
          <option value="light" ${set.theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="monokai" ${set.theme === 'monokai' ? 'selected' : ''}>Monokai</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="codeGenerator_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Code Generator
        </label>
      </div>
      <div class="settings-info">ℹ️ Generate dan highlight syntax kode otomatis</div>
    `;
  }

  buildImageGeneratorPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Model</label>
        <select name="imageGenerator_model" class="settings-input">
          <option value="pollinations" ${set.model === 'pollinations' ? 'selected' : ''}>Pollinations AI</option>
          <option value="stable" ${set.model === 'stable' ? 'selected' : ''}>Stable Diffusion</option>
          <option value="dalle" ${set.model === 'dalle' ? 'selected' : ''}>DALL-E</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label>Quality</label>
        <select name="imageGenerator_quality" class="settings-input">
          <option value="low" ${set.quality === 'low' ? 'selected' : ''}>Low (Fast)</option>
          <option value="medium" ${set.quality === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="high" ${set.quality === 'high' ? 'selected' : ''}>High (Slow)</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="imageGenerator_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Image Generator
        </label>
      </div>
      <div class="settings-info">ℹ️ Generate gambar dari text prompt</div>
    `;
  }

  buildSummarizerPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Summary Style</label>
        <select name="summarizer_style" class="settings-input">
          <option value="concise" ${set.style === 'concise' ? 'selected' : ''}>Concise (Singkat)</option>
          <option value="detailed" ${set.style === 'detailed' ? 'selected' : ''}>Detailed (Rinci)</option>
          <option value="bullet" ${set.style === 'bullet' ? 'selected' : ''}>Bullet Points</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label>Max Tokens <span class="settings-value">${set.maxTokens}</span></label>
        <input type="range" name="summarizer_maxTokens" min="50" max="500" step="50" value="${set.maxTokens}" class="settings-slider" onchange="document.querySelector('.settings-value').textContent = this.value">
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="summarizer_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Summarizer
        </label>
      </div>
      <div class="settings-info">ℹ️ Buat ringkasan otomatis dari percakapan</div>
    `;
  }

  buildPersonaPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Persona</label>
        <select name="persona_selected" class="settings-input">
          <option value="professional" ${set.selected === 'professional' ? 'selected' : ''}>Professional</option>
          <option value="friendly" ${set.selected === 'friendly' ? 'selected' : ''}>Friendly</option>
          <option value="technical" ${set.selected === 'technical' ? 'selected' : ''}>Technical Expert</option>
          <option value="creative" ${set.selected === 'creative' ? 'selected' : ''}>Creative</option>
          <option value="teacher" ${set.selected === 'teacher' ? 'selected' : ''}>Teacher</option>
          <option value="custom" ${set.selected === 'custom' ? 'selected' : ''}>Custom</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label>Custom Prompt</label>
        <textarea name="persona_customPrompt" class="settings-textarea" placeholder="Enter custom system prompt...">${set.customPrompt}</textarea>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="persona_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Persona
        </label>
      </div>
      <div class="settings-info">ℹ️ Pilih persona AI untuk gaya respons yang berbeda</div>
    `;
  }

  buildWebSearchPanel(set) {
    return `
      <div class="settings-control-group">
        <label>Search Engine</label>
        <select name="webSearch_engine" class="settings-input">
          <option value="google" ${set.engine === 'google' ? 'selected' : ''}>Google</option>
          <option value="bing" ${set.engine === 'bing' ? 'selected' : ''}>Bing</option>
          <option value="duckduckgo" ${set.engine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
        </select>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="webSearch_safeSearch" ${set.safeSearch ? 'checked' : ''}>
          Enable Safe Search
        </label>
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="webSearch_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Web Search
        </label>
      </div>
      <div class="settings-info">ℹ️ Cari informasi terbaru dari internet</div>
    `;
  }

  buildShortcutsPanel(set) {
    return `
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="shortcuts_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Shortcuts
        </label>
      </div>
      <div class="settings-info">ℹ️ Gunakan keyboard shortcuts untuk aksi cepat</div>
      <div class="settings-shortcuts-list">
        <p><strong>Keyboard Shortcuts:</strong></p>
        <ul>
          <li><code>Ctrl+Enter</code> - Send message</li>
          <li><code>Ctrl+/</code> - Focus search</li>
          <li><code>Ctrl+S</code> - Save chat</li>
          <li><code>Ctrl+K</code> - Command palette</li>
        </ul>
      </div>
    `;
  }

  buildAutocompletePanel(set) {
    return `
      <div class="settings-control-group">
        <label>Number of Suggestions <span class="settings-value">${set.suggestions}</span></label>
        <input type="range" name="autocomplete_suggestions" min="1" max="10" value="${set.suggestions}" class="settings-slider" onchange="document.querySelector('.settings-value').textContent = this.value">
      </div>
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="autocomplete_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Autocomplete
        </label>
      </div>
      <div class="settings-info">ℹ️ Autocomplete suggestions saat mengetik</div>
    `;
  }

  buildQuickReplyPanel(set) {
    return `
      <div class="settings-control-group">
        <label class="settings-checkbox-label">
          <input type="checkbox" name="quickReply_enabled" ${set.enabled ? 'checked' : ''}>
          Enable Quick Reply
        </label>
      </div>
      <div class="settings-info">ℹ️ Quick reply templates untuk respon cepat</div>
      <div class="settings-info">
        <p><strong>Default Templates:</strong></p>
        <ul>
          <li>"Yes, that's correct"</li>
          <li>"Can you explain that again?"</li>
          <li>"That was helpful, thanks!"</li>
          <li>"I need more details"</li>
        </ul>
      </div>
    `;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.necrosisSettingsManager = new SettingsManager();
});
