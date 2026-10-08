import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Prepare the lazy editor before serving modules, avoiding late dependency re-optimization.
    include: ['@monaco-editor/react', 'monaco-editor/editor/editor.api.js', 'react-dom'],
  },
})
