/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'SF Mono', 'Menlo', 'ui-monospace', 'monospace'],
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
        /* Canonical design-token scale */
        'ds-2xs': ['var(--text-2xs-size)', { lineHeight: 'var(--text-2xs-leading)', letterSpacing: 'var(--text-2xs-tracking)' }],
        'ds-xs':  ['var(--text-xs-size)',  { lineHeight: 'var(--text-xs-leading)',  letterSpacing: 'var(--text-xs-tracking)' }],
        'ds-sm':  ['var(--text-sm-size)',  { lineHeight: 'var(--text-sm-leading)',  letterSpacing: 'var(--text-sm-tracking)' }],
        'ds-base':['var(--text-base-size)',{ lineHeight: 'var(--text-base-leading)',letterSpacing: 'var(--text-base-tracking)'}],
        'ds-lg':  ['var(--text-lg-size)',  { lineHeight: 'var(--text-lg-leading)',  letterSpacing: 'var(--text-lg-tracking)' }],
        'ds-xl':  ['var(--text-xl-size)',  { lineHeight: 'var(--text-xl-leading)',  letterSpacing: 'var(--text-xl-tracking)' }],
        'ds-2xl': ['var(--text-2xl-size)', { lineHeight: 'var(--text-2xl-leading)', letterSpacing: 'var(--text-2xl-tracking)'}],
        'ds-3xl': ['var(--text-3xl-size)', { lineHeight: 'var(--text-3xl-leading)', letterSpacing: 'var(--text-3xl-tracking)'}],
        'ds-4xl': ['var(--text-4xl-size)', { lineHeight: 'var(--text-4xl-leading)', letterSpacing: 'var(--text-4xl-tracking)'}],
        'ds-5xl': ['var(--text-5xl-size)', { lineHeight: 'var(--text-5xl-leading)', letterSpacing: 'var(--text-5xl-tracking)'}],
      },
      spacing: {
        'ds-1':  'var(--space-1)',
        'ds-2':  'var(--space-2)',
        'ds-3':  'var(--space-3)',
        'ds-4':  'var(--space-4)',
        'ds-5':  'var(--space-5)',
        'ds-6':  'var(--space-6)',
        'ds-8':  'var(--space-8)',
        'ds-10': 'var(--space-10)',
        'ds-12': 'var(--space-12)',
        'ds-16': 'var(--space-16)',
        'ds-20': 'var(--space-20)',
        'ds-24': 'var(--space-24)',
        'ds-32': 'var(--space-32)',
      },
      gap: {
        'ds-tight':   'var(--gap-tight)',
        'ds-default': 'var(--gap-default)',
        'ds-loose':   'var(--gap-loose)',
        'ds-section': 'var(--gap-section)',
      },
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
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          muted: 'var(--color-accent-muted)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
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
          /* Canonical canvas ladder */
          void: 'var(--bg-void)',
          base: 'var(--bg-base)',
          canvas: 'var(--bg-base)',
          panel: 'var(--bg-surface)',
          overlay: 'var(--bg-overlay)',
        },
        canvas: {
          void: 'var(--bg-void)',
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          hover: 'var(--bg-hover)',
        },
        brand: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          subtle: 'var(--accent-subtle)',
          muted: 'var(--accent-muted)',
          fg: 'var(--accent-fg)',
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--text-disabled)',
          accent: 'var(--text-accent)',
          danger: 'var(--text-danger)',
        },
        ds: {
          void: 'var(--bg-void)',
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          hover: 'var(--bg-hover)',
        },
        accentScale: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          subtle: 'var(--accent-subtle)',
          muted: 'var(--accent-muted)',
          fg: 'var(--accent-fg)',
        },
        line: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--border-strong)',
          accent: 'var(--border-accent)',
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
          success: {
            fg: 'var(--status-success-fg)',
            DEFAULT: 'var(--status-success-bg)',
            border: 'var(--status-success-border)',
          },
          warning: {
            fg: 'var(--status-warning-fg)',
            DEFAULT: 'var(--status-warning-bg)',
            border: 'var(--status-warning-border)',
          },
          error: {
            fg: 'var(--status-error-fg)',
            DEFAULT: 'var(--status-error-bg)',
            border: 'var(--status-error-border)',
          },
          info: {
            fg: 'var(--status-info-fg)',
            DEFAULT: 'var(--status-info-bg)',
            border: 'var(--status-info-border)',
          },
        },
      },
      borderRadius: {
        none: '0px',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
        'pm-sm': 'var(--radius-sm)',
        'pm-md': 'var(--radius-md)',
        'pm-lg': 'var(--radius-lg)',
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
        'ds-0': 'var(--shadow-0)',
        'ds-1': 'var(--shadow-1)',
        'ds-2': 'var(--shadow-2)',
        'ds-3': 'var(--shadow-3)',
        'ds-4': 'var(--shadow-4)',
        'ds-accent': 'var(--shadow-accent)',
        // Soft turquoise focus halo — matches `--ring-soft`.
        'ring-soft': 'var(--ring-soft)',
        'ring-strong': 'var(--ring-strong)',
        'ring-default': 'var(--ring-default)',
        'ring-error': 'var(--ring-error)',
        'ring-inset': 'var(--ring-inset)',
      },
      zIndex: {
        'base-content': 'var(--z-base-content)',
        'sticky-header': 'var(--z-sticky-header)',
        dropdown: 'var(--z-dropdown)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
        tooltip: 'var(--z-tooltip)',
        'command-palette': 'var(--z-command-palette)',
      },
      blur: {
        'ds-sm': 'var(--blur-sm)',
        'ds-md': 'var(--blur-md)',
        'ds-lg': 'var(--blur-lg)',
      },
      // Tablet vertical viewport — useful for the production-floor tablet
      // layouts. Below `sm` (640px) but above mobile.
      screens: {
        xs: '480px',
      },
      transitionDuration: {
        DEFAULT: '280ms',
        instant: 'var(--duration-instant)',
        snappy: 'var(--duration-snappy)',
        responsive: 'var(--duration-responsive)',
        deliberate: 'var(--duration-deliberate)',
        cinematic: 'var(--duration-cinematic)',
      },
      transitionTimingFunction: {
        soft:        'var(--ease-out-expo)',
        spring:      'var(--spring-bounce-ease)',
        emphasized:  'var(--ease-in-out-expo)',
        'out-expo':  'var(--ease-out-expo)',
        'in-expo':   'var(--ease-in-expo)',
        'in-out-expo': 'var(--ease-in-out-expo)',
        'spring-soft': 'var(--spring-soft-ease)',
        'spring-snappy': 'var(--spring-snappy-ease)',
      },
      animation: {
        'page-in':         'page-in var(--duration-page-in) var(--ease-out-expo) both',
        'page-out':        'page-out var(--duration-page-out) var(--ease-in-expo) forwards',
        'slide-in-right':  'slide-right var(--duration-responsive) var(--ease-out-expo) forwards',
        'slide-up':        'slide-up var(--duration-responsive) var(--ease-out-expo) forwards',
        'scale-in':        'scale-in var(--duration-snappy) var(--spring-bounce-ease) forwards',
        'scale-in-bounce': 'scale-in-bounce var(--duration-command-in) var(--spring-bounce-ease) forwards',
        'fade-in':         'fade-in var(--duration-snappy) var(--ease-out-expo) forwards',
        'fade-out':        'fade-out var(--duration-snappy) var(--ease-in-expo) forwards',
        'modal-in':        'modal-panel-in var(--duration-modal-panel-in) var(--spring-soft-ease) forwards',
        'modal-out':       'modal-panel-out var(--duration-modal-panel-out) var(--ease-in-expo) forwards',
        'dropdown-in':     'dropdown-in var(--duration-dropdown-in) var(--ease-out-expo) forwards',
        'dropdown-out':    'dropdown-out var(--duration-dropdown-out) var(--ease-in-expo) forwards',
        'toast-in':        'toast-in-right var(--spring-snappy-duration) var(--spring-snappy-ease) both',
        'toast-out':       'toast-out-right var(--duration-toast-out) var(--ease-in-expo) forwards',
        'spin':            'spin var(--duration-spin) var(--ease-out-expo) infinite',
        'spin-slow':       'spin-slow var(--duration-spin-slow) var(--ease-in-out-expo) infinite',
        'shimmer':         'shimmer 1.8s var(--ease-in-out-expo) infinite',
        'pulse-ring':      'pulse-ring 2s var(--ease-out-expo) infinite',
        'float':           'float var(--duration-spin-slow) var(--ease-in-out-expo) infinite',
        'attention':       'attention 600ms var(--ease-in-out-expo)',
        'count-up':        'count-up var(--duration-responsive) var(--ease-out-expo) both',
        'pulse-dot':       'pulseDot 1.6s var(--ease-in-out-expo) infinite',
        'progress-sweep':  'progress-indeterminate 1.4s var(--ease-in-out-expo) infinite',
      },
      keyframes: {
        pageIn: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'page-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'page-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to:   { opacity: '0', transform: 'translateY(-6px)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in-bounce': {
          from: { opacity: '0', transform: 'scale(0.5)' },
          '70%': { transform: 'scale(1.12)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
        'modal-panel-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'modal-panel-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to:   { opacity: '0', transform: 'scale(0.94)' },
        },
        'dropdown-in': {
          from: { opacity: '0', transform: 'scaleY(0.9)' },
          to:   { opacity: '1', transform: 'scaleY(1)' },
        },
        'dropdown-out': {
          from: { opacity: '1', transform: 'scaleY(1)' },
          to:   { opacity: '0', transform: 'scaleY(0.9)' },
        },
        'toast-in-right': {
          from: { opacity: '0', transform: 'translateX(32px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-out-right': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to:   { opacity: '0', transform: 'translateX(20px)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        attention: {
          '0%, 100%': { transform: 'scale(1)' },
          '20%':      { transform: 'scale(1.08)' },
          '40%':      { transform: 'scale(0.96)' },
          '60%':      { transform: 'scale(1.04)' },
          '80%':      { transform: 'scale(0.98)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.9)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)',    opacity: '1' },
          '50%':      { transform: 'scale(1.18)', opacity: '0.85' },
        },
        progressSweep: {
          '0%':   { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(360%)' },
        },
        'progress-indeterminate': {
          '0%':   { left: '-35%', width: '35%' },
          '60%':  { left: '100%', width: '90%' },
          '100%': { left: '100%', width: '90%' },
        },
      },
    },
  },
  plugins: [],
};
