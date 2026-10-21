import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { inlineSampleXlsx } from './vite-plugins/inlineSampleXlsx.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), inlineSampleXlsx()],
})
