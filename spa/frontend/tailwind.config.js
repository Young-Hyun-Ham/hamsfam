/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        panel: 'var(--color-panel)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        text: 'var(--color-text)',
        you: 'var(--color-you)',
        bot: 'var(--color-bot)',
        accent: 'var(--color-accent)',
      },
      boxShadow: {
        bubble: '0 4px 16px rgba(0,0,0,0.30)',
        composer: '0 6px 22px rgba(0,0,0,0.35)',
      },
      maxWidth: {
        chat: '900px',
      },
    },
  },
  plugins: [],
}
