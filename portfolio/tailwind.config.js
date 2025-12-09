// tailwind.config.js
module.exports = {
  // ...
  theme: {
    extend: {
      keyframes: {
        'chat-fade-up': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'chat-message': 'chat-fade-up 0.16s ease-out',
      },
    },
  },
};
