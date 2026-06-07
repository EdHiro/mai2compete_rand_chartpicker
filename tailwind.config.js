/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#1a4080',
          card: '#2a50a0',
          hover: '#3a60c0',
        },
        neon: {
          pink: '#ff4488',
          cyan: '#00ddff',
        },
        difficulty: {
          expert: '#ff4488',
          expertLight: '#ff88aa',
          master: '#9944ff',
          masterLight: '#cc88ff',
          remaster: '#ffaa00',
          remasterLight: '#ffcc66',
        },
        card: {
          expert: '#ff4488',
          expertLight: '#ff88aa',
          master: '#9944ff',
          masterLight: '#cc88ff',
          remaster: '#ffaa00',
          remasterLight: '#ffcc66',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
