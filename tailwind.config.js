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
        display: ['Orbitron', 'Rajdhani', 'sans-serif'],
        body: ['Rajdhani', 'Orbitron', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0b0c15',
          card: 'rgba(255,255,255,0.05)',
          hover: 'rgba(255,255,255,0.08)',
          border: 'rgba(255,255,255,0.10)',
        },
        neon: {
          pink: '#ff4488',
          cyan: '#00ddff',
        },
        fluid: {
          bg: '#0b0c15',
          card: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.10)',
          cyan: '#22d3ee',
          violet: '#a78bfa',
          pink: '#f472b6',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
        difficulty: {
          basic: '#22c55e',
          basicLight: '#4ade80',
          advanced: '#eab308',
          advancedLight: '#facc15',
          expert: '#ff4488',
          expertLight: '#ff88aa',
          master: '#9944ff',
          masterLight: '#cc88ff',
          remaster: '#ffaa00',
          remasterLight: '#ffcc66',
        },
        card: {
          basic: '#22c55e',
          basicLight: '#4ade80',
          advanced: '#eab308',
          advancedLight: '#facc15',
          expert: '#ff4488',
          expertLight: '#ff88aa',
          master: '#9944ff',
          masterLight: '#cc88ff',
          remaster: '#ffaa00',
          remasterLight: '#ffcc66',
        },
        ui: {
          gold: '#f59e0b',
          goldLight: '#fbbf24',
          purple: '#8b5cf6',
          purpleLight: '#a78bfa',
          cyan: '#06b6d4',
          cyanLight: '#22d3ee',
        }
      },
      boxShadow: {
        'glow-pink': '0 0 20px rgba(255, 68, 136, 0.4)',
        'glow-cyan': '0 0 20px rgba(0, 221, 255, 0.4)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-blue': '0 0 24px rgba(59, 130, 246, 0.55), 0 0 60px rgba(59, 130, 246, 0.2)',
        'glow-violet': '0 0 24px rgba(139, 92, 246, 0.55), 0 0 60px rgba(139, 92, 246, 0.2)',
        'glow-soft': '0 8px 40px rgba(2, 6, 23, 0.45), 0 2px 10px rgba(0, 0, 0, 0.35)',
        'ring-inner': 'inset 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'btn-shadow': '0 6px 20px rgba(59, 130, 246, 0.25), 0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'inner-glow': 'inset 0 0 30px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        'grain-diagonal': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 320 320' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
        'hero-grid': "linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px)",
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '28px',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.6s ease-in-out infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'status-dot': 'statusDot 1.6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'fluid-float': 'fluidFloat 12s ease-in-out infinite',
        'fluid-float-reverse': 'fluidFloat 14s ease-in-out infinite reverse',
        'scale-in': 'scaleIn 0.7s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 24px rgba(255,68,136,0.55))' },
        },
        statusDot: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.6)', opacity: '1' },
          '50%': { boxShadow: '0 0 0 10px rgba(34,197,94,0)', opacity: '0.8' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fluidFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 30px) scale(0.95)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(20px)', filter: 'blur(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
      },
    },
  },
  plugins: [],
};
