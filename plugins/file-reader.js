// ============================================================
//  NECROSIS AI — PLUGIN: FILE READER (file-reader.js)
//  Read uploaded files and inject content as AI context
//  Supports: TXT, JS, PY, HTML, CSS, JSON, MD, XML, CSV, IMG
// ============================================================

(function initFileReader() {
  'use strict';

  var uploadBtn    = document.getElementById('upload-btn');
  var fileInput    = document.getElementById('file-input');
  var filePreview  = document.getElementById('file-preview');
  var promptInput  = document.getElementById('prompt-input');

  if (!uploadBtn || !fileInput) return;

  // ── Supported types ───────────────────────────────────────
  var TEXT_EXTENSIONS = ['txt', 'js', 'py', 'html', 'css', 'json', 'md', 'xml', 'csv',
    'ts', 'jsx', 'tsx', 'php', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs', 'sql',
    'yaml', 'yml', 'sh', 'bat', 'env', 'gitignore', 'htaccess'];
  var IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
  var MAX_FILE_SIZE_MB = 5;
  var MAX_TEXT_CHARS   = 8000;

  // ── Stored files ─────────────────────────────────────────
  var attachedFiles = []; // { name, type, content, base64, preview }

  // ── Click trigger ─────────────────────────────────────────
  uploadBtn.addEventListener('click', function () {
    fileInput.value = '';
    fileInput.click();
  });

  // ── File selected ─────────────────────────────────────────
  fileInput.addEventListener('change', function (e) {
    var files = Array.from(e.target.files || []);
    if (!files.length) return;
    addFiles(files);
  });

  // ── Drag and drop support ─────────────────────────────────
  var inputArea = document.getElementById('input-area');
  if (inputArea) {
    inputArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.style.borderColor = 'var(--primary)';
    });
    inputArea.addEventListener('dragleave', function () {
      this.style.borderColor = '';
    });
    inputArea.addEventListener('drop', function (e) {
      e.preventDefault();
      this.style.borderColor = '';
      var files = Array.from(e.dataTransfer.files || []);
      if (files.length) addFiles(files);
    });
  }

  // ── Process files ─────────────────────────────────────────
  function addFiles(files) {
    files.forEach(function (file) {
      var sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        showError(file.name + ' Terlalu Besar (Max ' + MAX_FILE_SIZE_MB + 'MB)');
        return;
      }

      var ext  = file.name.split('.').pop().toLowerCase();
      var isImg  = IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith('image/');
      var isText = TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/');

      if (isImg) {
        readAsBase64(file, function (b64) {
          attachedFiles.push({ name: file.name, type: 'image', base64: b64, mimeType: file.type });
          renderPreview();
        });
      } else if (isText) {
        readAsText(file, function (text) {
          var content = text.length > MAX_TEXT_CHARS
            ? text.substring(0, MAX_TEXT_CHARS) + '\n... [Dipotong, Terlalu Panjang]'
            : text;
          attachedFiles.push({ name: file.name, type: 'text', content: content, ext });
          renderPreview();
          injectTextContext(file.name, content, ext);
        });
      } else {
        showError(file.name + ': Format Tidak Didukung');
      }
    });
  }

  function readAsText(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) { cb(e.target.result); };
    reader.readAsText(file, 'UTF-8');
  }

  function readAsBase64(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      cb(e.target.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  // ── Inject text content into prompt ──────────────────────
  function injectTextContext(name, content, ext) {
    var tag = ext && ['js','py','html','css','ts','sql','php'].includes(ext) ? '```' + ext + '\n' + content + '\n```' : content;
    var prefix = '[FILE: ' + name + ']\n' + tag + '\n\n';
    if (promptInput) {
      var current = promptInput.value;
      if (!current.includes('[FILE: ' + name + ']')) {
        promptInput.value = prefix + current;
        promptInput.dispatchEvent(new Event('input'));
      }
    }
    // Also store for AI context
    window._necrosisFileContext = (window._necrosisFileContext || '') + prefix;
  }

  // ── Render preview chips ──────────────────────────────────
  function renderPreview() {
    if (!filePreview) return;
    filePreview.innerHTML = '';
    if (!attachedFiles.length) { filePreview.style.display = 'none'; return; }
    filePreview.style.display = 'flex';

    attachedFiles.forEach(function (f, i) {
      var chip = document.createElement('div');
      chip.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--dark);' +
        'border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:12px;' +
        'color:var(--light);max-width:180px;';

      var icon = f.type === 'image'
        ? '<i class="fas fa-image" style="color:#ff9900;"></i>'
        : '<i class="fas fa-file-code" style="color:var(--primary);"></i>';

      chip.innerHTML = icon +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">' + f.name + '</span>';

      // Thumbnail for images
      if (f.type === 'image' && f.base64) {
        var thumb = document.createElement('img');
        thumb.src = 'data:' + f.mimeType + ';base64,' + f.base64;
        thumb.style.cssText = 'width:24px;height:24px;object-fit:cover;border-radius:4px;';
        chip.insertBefore(thumb, chip.firstChild);
      }

      var removeBtn = document.createElement('button');
      removeBtn.innerHTML = '&times;';
      removeBtn.style.cssText = 'background:none;border:none;color:var(--gray);cursor:pointer;' +
        'font-size:16px;line-height:1;padding:0;margin-left:2px;';
      removeBtn.addEventListener('click', (function (idx) {
        return function () { removeFile(idx); };
      })(i));

      chip.appendChild(removeBtn);
      filePreview.appendChild(chip);
    });
  }

  function removeFile(idx) {
    var removed = attachedFiles.splice(idx, 1)[0];
    if (removed && removed.type === 'text' && promptInput) {
      var prefix = '[FILE: ' + removed.name + ']';
      if (promptInput.value.includes(prefix)) {
        promptInput.value = promptInput.value.split(prefix)[0].trim();
        promptInput.dispatchEvent(new Event('input'));
      }
    }
    renderPreview();
  }

  // ── Clear all files after send ────────────────────────────
  function clearFiles() {
    attachedFiles = [];
    window._necrosisFileContext = '';
    if (filePreview) { filePreview.innerHTML = ''; filePreview.style.display = 'none'; }
  }

  // ── Error toast ───────────────────────────────────────────
  function showError(msg) {
    if (typeof window.toast === 'function') { window.toast('❌ ' + msg); return; }
    alert('Error: ' + msg);
  }

  // ── Global API ────────────────────────────────────────────
  window.FileReaderPlugin = {
    addFiles,
    clearFiles,
    getAttachedFiles: function () { return attachedFiles; },
    hasFiles:         function () { return attachedFiles.length > 0; },
    getImages:        function () { return attachedFiles.filter(function (f) { return f.type === 'image'; }); },
    getTextFiles:     function () { return attachedFiles.filter(function (f) { return f.type === 'text'; }); },
  };

  console.log('[Plugins] ✅ File Reader Loaded');
})();
