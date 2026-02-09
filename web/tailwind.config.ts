import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom moltNBA Palette
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'accent-nba-primary': 'var(--accent-nba-primary)',
        'accent-nba-secondary': 'var(--accent-nba-secondary)',
        'accent-nba-danger': 'var(--accent-nba-danger)',
        'border-color': 'var(--border)', // Renamed to avoid conflict with default 'border'
        'border-light': 'var(--border-light)',
        'shadow-color': 'var(--shadow-color)',
      },
      // Extend typography if custom fonts are used or specific line-heights are needed
      // For system fonts, this might not be strictly necessary if default Tailwind base styles are sufficient
      fontFamily: {
        sans: [
          'Inter', // Preferred font if loaded
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      // You can add other theme extensions here if needed, like spacing, borderRadius, etc.
    },
  },
  plugins: [],
};

export default config;
