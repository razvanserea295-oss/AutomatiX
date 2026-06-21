import { useEffect, useRef, useState } from 'react';
import { BusyIndicator } from '@ui5/webcomponents-react';
import { loadClassicUi5, applyClassicTheme, type SapGlobal } from './ui5Loader';
import { useThemeStore } from '@/store/themeStore';

interface CreateCtx {
  // A JSONModel built from `data` (null when no `data` prop was given). The
  // factory may use it, or build/bind its own model (e.g. VizFrame datasets).
  model: SapGlobal | null;
}

interface Props {
  /**
   * Build the classic SAPUI5 control. Receives the global `sap` and a context
   * with a ready-made JSONModel (when `data` is provided). Return the control
   * (or a Promise of it). Do NOT call `.placeAt` — the wrapper does that.
   */
  create: (sap: SapGlobal, ctx: CreateCtx) => SapGlobal | Promise<SapGlobal>;
  /** Optional data → wrapped in a JSONModel and `setModel`'d on the control. */
  data?: unknown;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Mounts a single classic SAPUI5 control inside the React tree. Handles the
 * runtime load, model wiring, light/dark theme sync, and teardown on unmount.
 * This is integration glue for REAL SAP controls — not a reimplemented control.
 */
export default function Ui5ClassicControl({ create, data, height = '400px', className, style }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<SapGlobal>(null);
  const modelRef = useRef<SapGlobal>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const theme = useThemeStore(s => s.theme);

  // Mount once. Subsequent `data` changes are handled by the second effect so we
  // don't tear the control down on every render.
  useEffect(() => {
    let cancelled = false;
    loadClassicUi5(theme === 'dark' ? 'dark' : 'light')
      .then(async (sap) => {
        if (cancelled || !hostRef.current) return;
        try {
          const model = data !== undefined ? new sap.ui.model.json.JSONModel(data) : null;
          if (model?.setSizeLimit) model.setSizeLimit(100000); // tables can exceed the 100-row default
          modelRef.current = model;

          const control = await create(sap, { model });
          if (cancelled) { control?.destroy?.(); return; }
          if (model && control?.setModel) control.setModel(model);

          hostRef.current.innerHTML = '';
          control.placeAt(hostRef.current);
          controlRef.current = control;
          setStatus('ready');
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus('error');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controlRef.current?.destroy?.();
      modelRef.current?.destroy?.();
      controlRef.current = null;
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data updates into the existing model without re-creating the control.
  useEffect(() => {
    if (modelRef.current && data !== undefined) modelRef.current.setData(data);
  }, [data]);

  // Keep classic theme aligned with the app theme.
  useEffect(() => {
    if (status === 'ready') applyClassicTheme(theme === 'dark' ? 'dark' : 'light');
  }, [theme, status]);

  if (status === 'error') {
    return (
      <div style={{ padding: '1rem', color: 'var(--sapNegativeColor, #bb0000)', fontSize: '0.875rem' }}>
        Nu s-a putut încărca controlul SAPUI5 clasic: {error}
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height, minHeight: height, ...style }}>
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BusyIndicator active size="M" />
        </div>
      )}
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
