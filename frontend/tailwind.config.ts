// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--border))',
        app: 'rgb(var(--bg))',
        card: 'rgb(var(--card))',
        muted: 'rgb(var(--muted))',
      },
    },
  },
  plugins: [],
} satisfies Config;
