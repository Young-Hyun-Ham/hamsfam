import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // OAuth 팝업과의 통신 허용
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // COEP를 강제하지 않음
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
});