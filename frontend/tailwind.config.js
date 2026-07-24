export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                /* Curated teal palette — matches MediXpulse brand */
                teal: {
                    50: '#edfbf8',
                    100: '#d1f5ee',
                    200: '#a6e9de',
                    300: '#6fd6c7',
                    400: '#38bcad',
                    500: '#18a093',
                    600: '#0d8076',
                    700: '#0b6660',
                    800: '#0c514d',
                    900: '#0c4340',
                    950: '#052926',
                },
            },
            boxShadow: {
                soft: '0 4px 24px -8px rgba(14,116,130,0.22)',
                card: '0 20px 56px -28px rgba(15,118,110,0.26)',
                glow: '0 0 0 1px rgba(255,255,255,0.7), 0 20px 50px -20px rgba(14,116,144,0.32)',
                up: '0 -8px 32px -8px rgba(15,118,110,0.12)',
            },
            backgroundImage: {
                'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,184,166,0.14), transparent 70%), ' +
                    'linear-gradient(180deg, hsl(150 30% 98%), hsl(160 28% 96%))',
                'teal-gradient': 'linear-gradient(135deg, hsl(171 75% 30%), hsl(180 70% 38%))',
                'mesh-pattern': 'linear-gradient(rgba(15,118,110,0.04) 1px, transparent 1px), ' +
                    'linear-gradient(90deg, rgba(15,118,110,0.04) 1px, transparent 1px)',
            },
            fontFamily: {
                sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
                display: ['Cormorant Garamond', 'Georgia', 'serif'],
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.96)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
            },
            animation: {
                float: 'float 6s ease-in-out infinite',
                shimmer: 'shimmer 1.8s linear infinite',
                'fade-up': 'fade-up 0.4s ease-out forwards',
                'scale-in': 'scale-in 0.25s ease-out forwards',
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
        },
    },
    plugins: [],
};
