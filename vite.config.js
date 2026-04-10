// ============================================================
//  NECROSIS AI — VITE BUILD CONFIG
//  Output: semua JS dibundle + diminify jadi 1 file
//  Hasil: kode tidak bisa dibaca (seperti compiled Vite)
// ============================================================

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Root = folder NecrosisAI
  root: '.',

  build: {
    // Output ke folder dist/
    outDir: 'dist',
    emptyOutDir: true,

    // Minify pakai terser (paling kuat obfuscate-nya)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // hapus semua console.log
        drop_debugger: true,  // hapus debugger
        passes: 3,            // 3x compress = lebih kecil
        pure_funcs: ['console.log', 'console.warn', 'console.info'],
      },
      mangle: {
        // Rename semua variable jadi nama acak (a, b, c, ...)
        toplevel: true,
        eval: true,
      },
      format: {
        // Hapus semua komentar
        comments: false,
        beautify: false,
      },
    },

    rollupOptions: {
      input: {
        // Entry point utama
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Semua JS dibundle jadi 1 file dengan nama acak
        entryFileNames:   'assets/[name]-[hash].js',
        chunkFileNames:   'assets/[name]-[hash].js',
        assetFileNames:   'assets/[name]-[hash].[ext]',
        // Manual chunks — gabungkan plugins & tools jadi 1 bundle
        manualChunks: {
          'necrosis-core': [
            './script.js',
            './script_fixes.js',
          ],
          'necrosis-plugins': [
            './plugins/autocomplete.js',
            './plugins/bookmarks.js',
            './plugins/code-generator.js',
            './plugins/export-chat.js',
            './plugins/file-reader.js',
            './plugins/image-generator.js',
            './plugins/persona.js',
            './plugins/projects.js',
            './plugins/quick-reply.js',
            './plugins/shortcut-panel.js',
            './plugins/summarizer.js',
            './plugins/text-to-speech.js',
            './plugins/translator.js',
            './plugins/voice-input.js',
            './plugins/wake-word.js',
            './plugins/web-search.js',
          ],
          'necrosis-tools': [
            './plugins/autocomplete.js',
            './tools/bot-attack.js',
            './tools/my-ip.js',
            './tools/ngl-spam.js',
            './tools/track-ip.js',
          ],
        },
      },
    },

    // Source map = false biar kode asli gak bisa dilihat
    sourcemap: false,

    // Target browser modern
    target: 'es2015',

    // CSS juga diminify
    cssMinify: true,

    // Chunk size warning (opsional)
    chunkSizeWarningLimit: 2000,
  },

  // Plugin tambahan
  plugins: [],
});
