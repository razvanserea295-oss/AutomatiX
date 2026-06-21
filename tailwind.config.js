/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'SF Mono', 'Menlo', 'ui-monospace', 'monospace'],
      },
      // Promix typography scale — use these instead of arbitrary text-[10px]/[11px].
      // Pairs each size with a sensible line-height so vertical rhythm stays consistent.
      // Values are in `rem` (1rem = 16px at the default root) so type scales with the
      // user's browser font-size setting — a WCAG 1.4.4 ("Resize text") requirement.
      // Comments show the px equivalent at the 16px default for reference.
      fontSize: {
        'pm-2xs': ['0.625rem',  { lineHeight: '0.875rem', letterSpacing: '0.02em' }], // 10/14
        'pm-xs':  ['0.6875rem', { lineHeight: '1rem' }],                              // 11/16
        'pm-sm':  ['0.75rem',   { lineHeight: '1rem' }],                              // 12/16
        'pm-base':['0.8125rem', { lineHeight: '1.125rem' }],                          // 13/18
        'pm-md':  ['0.875rem',  { lineHeight: '1.25rem' }],                           // 14/20
        'pm-lg':  ['1rem',      { lineHeight: '1.375rem' }],                          // 16/22
        'pm-xl':  ['1.125rem',  { lineHeight: '1.5rem' }],                            // 18/24
        'pm-2xl': ['1.375rem',  { lineHeight: '1.75rem' }],                           // 22/28
        // Hero scale — used by empty-state heroes and large dashboard
        // counters. Tracking is tight to read as "engineered display".
        'pm-3xl': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],      // 32/36
        'pm-eyebrow': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.16em', fontWeight: '700' }], // 10/14
      },
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          muted: 'var(--color-accent-muted)',
        },
        surface: {
          rail: 'var(--color-bg-rail)',
          primary: 'var(--color-bg-primary)',
          page: 'var(--color-bg-page)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          elevated: 'var(--color-bg-elevated)',
          nav: 'var(--color-nav-bg)',
          'nav-hover': 'var(--color-nav-hover)',
          'nav-active': 'var(--color-nav-active-bg)',
        },
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        line: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        /* Legacy shell-* aliases — existing components still use these */
        shell: {
          bg: 'var(--color-bg-primary)',
          surface: 'var(--color-bg-secondary)',
          border: 'var(--color-border)',
          text: 'var(--color-text-primary)',
          muted: 'var(--color-text-muted)',
          accent: 'var(--color-accent)',
          hover: 'var(--color-bg-tertiary)',
        },
        status: {
          green:  'var(--status-green)',
          red:    'var(--status-red)',
          amber:  'var(--status-amber)',
          blue:   'var(--status-blue)',
          teal:   'var(--status-teal)',
          purple: 'var(--status-purple)',
        },
      },
      // NOTE: the previous `spacing` override pinned 0.5/1/2/3/4/6/8 to px.
      // Those values are *identical* to Tailwind's default rem scale
      // (0.25/0.5/0.75/1/1.5/2rem …) but in px they stopped responding to the
      // browser's root font-size. Removed so the default rem scale applies —
      // zero visual change at the 16px default, but spacing now scales for
      // low-vision users (WCAG 1.4.4). Re-add here only for *non-default* steps.
      // Fiori-tuned: tight, engineered radius. Smaller = more industrial,
      // matches SAP's "serious tool" aesthetic. Pill shapes still use
      // `rounded-full`. Adjusting these CASCADES through every component
      // that uses standard `rounded-*` classes.
      // Apple-soft radii — matches the login's large, gentle corners.
      borderRadius: {
        none: '0px',
        sm: '5px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        'pm-sm': '5px',
        'pm-md': '7px',
        'pm-lg': '9px',
      },
      boxShadow: {
        // Multi-layer soft shadows (Soft UI Evolution — softer than flat, clearer than pure neumorphism)
        card:
          '0 1px 2px rgba(17, 24, 39, 0.04), 0 2px 6px rgba(17, 24, 39, 0.06), 0 8px 24px -12px rgba(17, 24, 39, 0.10)',
        'card-hover':
          '0 2px 4px rgba(17, 24, 39, 0.06), 0 6px 14px rgba(17, 24, 39, 0.08), 0 16px 40px -16px rgba(17, 24, 39, 0.14)',
        soft: '0 1px 2px rgba(17, 24, 39, 0.04), 0 2px 8px rgba(17, 24, 39, 0.06)',
        'soft-lg': '0 4px 10px rgba(17, 24, 39, 0.06), 0 12px 28px rgba(17, 24, 39, 0.08)',
        'inner-soft': 'inset 0 1px 2px rgba(17, 24, 39, 0.05), inset 0 2px 4px rgba(17, 24, 39, 0.03)',
        // Elevation ladder — wired to CSS vars so light/dark themes pick the
        // right intensity automatically. Use these instead of hand-rolled
        // box-shadow strings going forward.
        'e1': 'var(--elevation-1)',
        'e2': 'var(--elevation-2)',
        'e3': 'var(--elevation-3)',
        'e4': 'var(--elevation-4)',
        // Soft turquoise focus halo — matches `--ring-soft`.
        'ring-soft': 'var(--ring-soft)',
        'ring-strong': 'var(--ring-strong)',
      },
      // Tablet vertical viewport — useful for the production-floor tablet
      // layouts. Below `sm` (640px) but above mobile.
      screens: {
        xs: '480px',
      },
      animation: {
        'page-in':         'pageIn 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right':  'slideInRight 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-up':        'slideUp 280ms cubic-bezier(0.2, 0, 0, 1) forwards',
        'scale-in':        'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in':         'fadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-dot':       'pulseDot 1.6s ease-in-out infinite',
        'progress-sweep':  'progressSweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      transitionDuration: {
        DEFAULT: '220ms',
      },
      transitionTimingFunction: {
        soft:        'cubic-bezier(0.22, 1, 0.36, 1)',
        spring:      'cubic-bezier(0.34, 1.56, 0.64, 1)',
        emphasized:  'cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        pageIn: {
          '0%':   { opacity: '0', transform: 'translateY(24px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '1' },
          '50%':      { transform: 'scale(1.18)', opacity: '0.85' },
        },
        progressSweep: {
          '0%':   { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(360%)' },
        },
      },
    },
  },
  plugins: [],
};
