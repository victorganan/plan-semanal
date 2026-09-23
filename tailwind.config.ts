import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: 'rgb(var(--color-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-surface) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-muted) / <alpha-value>)',
        },
        area: {
          1: 'rgb(var(--color-area-1) / <alpha-value>)',
          2: 'rgb(var(--color-area-2) / <alpha-value>)',
          3: 'rgb(var(--color-area-3) / <alpha-value>)',
          4: 'rgb(var(--color-area-4) / <alpha-value>)',
          5: 'rgb(var(--color-area-5) / <alpha-value>)',
          6: 'rgb(var(--color-area-6) / <alpha-value>)',
          7: 'rgb(var(--color-area-7) / <alpha-value>)',
          8: 'rgb(var(--color-area-8) / <alpha-value>)',
        },
        priority: {
          low: 'rgb(var(--color-priority-low) / <alpha-value>)',
          medium: 'rgb(var(--color-priority-medium) / <alpha-value>)',
          high: 'rgb(var(--color-priority-high) / <alpha-value>)',
        },
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
