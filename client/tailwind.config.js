/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Cosmos base palette — obligatoria */
        'jarvis-navy': '#1A1A2E',
        'jarvis-red': '#E94560',
        'jarvis-gold': '#C9A84C',
        'jarvis-void': '#0A0A15',
        'jarvis-deep': '#0D0D1F',
        'jarvis-nebula': '#16213E',
        'jarvis-surface': '#1E1E35',
        'jarvis-elevated': '#252540',
        'jarvis-border': '#2A2A50',
        'jarvis-cyan': '#00D4FF',
        'jarvis-violet': '#7B61FF',
        'jarvis-emerald': '#00FFB2',
        'jarvis-amber': '#FFB347',
        'jarvis-plasma': '#FF6B9D',
        /* LCS aliases compatibles */
        'lcs-navy': '#1A1A2E',
        'lcs-navy-dark': '#0A0A15',
        'lcs-neon': '#C9A84C',
        'lcs-blue': '#00D4FF',
        'lcs-silver': '#E0E0E0',
        'lcs-surface': '#1E1E35',
        'lcs-elevated': '#252540'
      },
      backgroundImage: {
        cosmos: 'linear-gradient(135deg, #0A0A15 0%, #1A1A2E 50%, #16213E 100%)',
        nebula: 'linear-gradient(135deg, #E94560 0%, #7B61FF 50%, #00D4FF 100%)',
        'gold-shine': 'linear-gradient(135deg, #C9A84C 0%, #FFD700 50%, #C9A84C 100%)',
        aurora: 'linear-gradient(135deg, #00D4FF 0%, #7B61FF 50%, #E94560 100%)',
        panel: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(13,13,31,0.98) 100%)',
        'red-hot': 'linear-gradient(135deg, #E94560 0%, #FF6B9D 100%)'
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(233,69,96,0.4), 0 0 60px rgba(233,69,96,0.15)',
        'glow-gold': '0 0 20px rgba(201,168,76,0.4), 0 0 60px rgba(201,168,76,0.15)',
        'glow-cyan': '0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)',
        panel: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        'panel-gold': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.15)',
        'panel-red': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(233,69,96,0.15)',
        orb: '0 0 40px rgba(201,168,76,0.3), 0 0 80px rgba(201,168,76,0.1)',
        orbActive: '0 0 40px rgba(233,69,96,0.6), 0 0 80px rgba(233,69,96,0.3)'
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'orb-idle': 'orbIdle 4s ease-in-out infinite',
        'orb-listen': 'orbListen 0.8s ease-in-out infinite',
        'orb-think': 'orbThink 1.5s linear infinite',
        shimmer: 'shimmer 2s linear infinite',
        'warp-in': 'warpIn 0.6s ease forwards'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        orbIdle: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.04)', filter: 'brightness(1.1)' }
        },
        orbListen: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' }
        },
        orbThink: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        warpIn: {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        }
      },
      backdropBlur: {
        cosmos: '16px',
        'cosmos-lg': '24px'
      },
      fontFamily: {
        jarvis: ['Orbitron', 'Sora', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
        body: ['Inter', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  },
  plugins: []
};
