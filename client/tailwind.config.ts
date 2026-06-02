import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        signal: '#FF8E53',
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 55%, #FFAD3B 100%)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require('daisyui'), require('@tailwindcss/forms')],
  daisyui: {
    themes: [
      {
        hifly: {
          primary: '#FF8E53',
          'primary-content': '#0d0d18',
          secondary: '#FF6B6B',
          'secondary-content': '#0d0d18',
          accent: '#FFAD3B',
          'accent-content': '#0d0d18',
          neutral: '#1e1e35',
          'neutral-content': '#e8e8f5',
          'base-100': '#0d0d18',
          'base-200': '#161625',
          'base-300': '#1e1e35',
          'base-content': '#e2e8f0',
          info: '#60a5fa',
          'info-content': '#0d0d18',
          success: '#34d399',
          'success-content': '#0d0d18',
          warning: '#fbbf24',
          'warning-content': '#0d0d18',
          error: '#f87171',
          'error-content': '#0d0d18',
        },
      },
    ],
    darkTheme: 'hifly',
    base: true,
    styled: true,
    utils: true,
  },
} satisfies Config;
