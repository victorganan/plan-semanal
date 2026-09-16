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
          servilia: 'rgb(var(--color-servilia) / <alpha-value>)',
          gestiona: 'rgb(var(--color-gestiona) / <alpha-value>)',
          personal: 'rgb(var(--color-personal) / <alpha-value>)',
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
