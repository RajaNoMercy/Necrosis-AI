// ============================================================
//  NECROSIS AI — PLUGIN: IMAGE GENERATOR (image-generator.js)
//  Generates images via Pollinations AI (gratis, no key)
//  Supports: prompt enhancement, multiple providers, retry
// ============================================================

(function initImageGenerator() {
  'use strict';

  // ── Providers (dicoba berurutan sampai berhasil) ──────────
  var PROVIDERS = [
    function (prompt) {
      var enc = encodeURIComponent(prompt);
      return 'https://image.pollinations.ai/prompt/' + enc +
        '?width=1024&height=1024&nologo=true&seed=' + Date.now();
    },
    function (prompt) {
      var enc = encodeURIComponent(prompt + ', digital art, high quality');
      return 'https://image.pollinations.ai/prompt/' + enc +
        '?width=512&height=512&nologo=true';
    },
    function (prompt) {
      return 'https://image.pollinations.ai/prompt/' +
        encodeURIComponent(prompt) + '?width=768&height=768';
    },
  ];

  // ── Load image with retry ─────────────────────────────────
  function tryLoadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var timeout = setTimeout(function () {
        img.onload = img.onerror = null;
        reject(new Error('Timeout Loading Image'));
      }, 20000);
      img.onload = function () {
        clearTimeout(timeout);
        resolve(url);
      };
      img.onerror = function () {
        clearTimeout(timeout);
        reject(new Error('Failed To Load: ' + url));
      };
      img.src = url;
    });
  }

  // ── Main generate function ────────────────────────────────
  async function generateImage(prompt) {
    for (var i = 0; i < PROVIDERS.length; i++) {
      try {
        var url = PROVIDERS[i](prompt);
        var loaded = await tryLoadImage(url);
        return loaded;
      } catch (err) {
        if (i === PROVIDERS.length - 1) {
          throw new Error('Semua Server Gambar Gagal. Coba Lagi Nanti.');
        }
      }
    }
  }

  // ── Enhance prompt (English is better for image models) ──
  async function enhancePromptForImage(userPrompt) {
    var apiKey = window._groqKeyGlobal || '';
    if (!apiKey) return userPrompt;
    try {
      var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an image prompt engineer. Convert the user description into a detailed English image prompt for AI image generation. Reply ONLY with the prompt, no explanation. Include: style, lighting, quality keywords like "highly detailed, 8k, masterpiece".',
            },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      });
      var data = await res.json();
      return (data.choices && data.choices[0] && data.choices[0].message &&
        data.choices[0].message.content) || userPrompt;
    } catch (e) {
      return userPrompt; // fallback to original
    }
  }

  // ── Render image in chat ──────────────────────────────────
  function renderImageMessage(url, prompt, container) {
    var wrapper = document.createElement('div');
    wrapper.className = 'generated-image-wrap';
    wrapper.style.cssText = 'margin:10px 0;';

    var img = document.createElement('img');
    img.src   = url;
    img.alt   = prompt;
    img.style.cssText = 'max-width:100%;border-radius:12px;border:2px solid var(--primary);' +
      'display:block;cursor:pointer;transition:transform 0.2s;';
    img.title = 'Klik untuk lihat penuh';

    img.addEventListener('mouseenter', function () { this.style.transform = 'scale(1.02)'; });
    img.addEventListener('mouseleave', function () { this.style.transform = ''; });
    img.addEventListener('click', function () {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;' +
        'display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
      var bigImg = document.createElement('img');
      bigImg.src = url;
      bigImg.style.cssText = 'max-width:95vw;max-height:95vh;border-radius:8px;';
      overlay.appendChild(bigImg);
      overlay.addEventListener('click', function () { document.body.removeChild(overlay); });
      document.body.appendChild(overlay);
    });

    // Download button
    var dlBtn = document.createElement('a');
    dlBtn.href     = url;
    dlBtn.download = 'necrosis-ai-image-' + Date.now() + '.jpg';
    dlBtn.target   = '_blank';
    dlBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    dlBtn.style.cssText = 'display:inline-block;margin-top:6px;background:var(--dark);' +
      'color:var(--primary);border:1px solid var(--primary);padding:5px 12px;' +
      'border-radius:8px;font-size:12px;text-decoration:none;font-family:Poppins,sans-serif;';

    // Prompt label
    var label = document.createElement('p');
    label.style.cssText = 'font-size:11px;color:var(--gray);margin-top:4px;';
    label.textContent = '🎨 Prompt: ' + prompt.substring(0, 80) + (prompt.length > 80 ? '...' : '');

    wrapper.appendChild(img);
    wrapper.appendChild(dlBtn);
    wrapper.appendChild(label);

    if (container) container.appendChild(wrapper);
    return wrapper;
  }

  // ── Main handler: called from sendMessage when mode=createimg ──
  window.ImageGeneratorPlugin = {
    generate:       generateImage,
    enhancePrompt:  enhancePromptForImage,
    renderImage:    renderImageMessage,

    // Full flow: enhance + generate + render
    handleRequest: async function (prompt, chatContainer) {
      // Step 1: Enhance prompt
      var enhancedPrompt;
      try { enhancedPrompt = await enhancePromptForImage(prompt); }
      catch (e) { enhancedPrompt = prompt; }

      // Step 2: Generate
      var url = await generateImage(enhancedPrompt);

      // Step 3: Render
      if (chatContainer) {
        renderImageMessage(url, enhancedPrompt, chatContainer);
      }
      return { url, prompt: enhancedPrompt };
    },
  };

  console.log('[Plugins] ✅ Image Generator Loaded');
})();
