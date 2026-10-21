import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { inlineSampleXlsx } from './vite-plugins/inlineSampleXlsx.ts'

/**
 * Build config for the standalone single-file HTML deliverable:
 * every asset (JS, CSS, fonts) is inlined as base64/data-URI so the
 * app runs by simply double-clicking the HTML file — no server needed.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), inlineSampleXlsx()],
  base: './',
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 100000,
    rollupOptions: {
      output: {
        // force one JS chunk so the single-file HTML inliner has a single bundle
        manualChunks: () => 'app',
      },
    },
  },
})
