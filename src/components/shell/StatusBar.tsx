





import { useEffect, useState } from 'react';
import { isServerReachable } from '@/config/server';

interface StatusBarProps {
  userName: string;
  roleName?: string;
}

const POLL_MS = 10_000;

export default function StatusBar({ userName, roleName }: StatusBarProps) {
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await isServerReachable();
      if (!cancelled) setServerConnected(ok);
    };
    void check();
    const id = setInterval(check, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const dotClass =
    serverConnected === null ? 'bg-content-muted shell-status-dot shell-status-dot--sync' :
    serverConnected ? 'bg-status-green shell-status-dot shell-status-dot--live' : 'bg-status-red shell-status-dot';
  const label =
    serverConnected === null ? 'Verificare…' :
    serverConnected ? 'Conectat' : 'Deconectat';

  const now = new Date();
  const time = now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="shell-status flex shrink-0 items-center justify-between border-t border-white/[0.08] bg-surface-rail px-4 text-pm-2xs font-mono tracking-wide text-white/50 select-none">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate">{userName}{roleName ? ` · ${roleName}` : ''}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="tabular-nums">{time}</span>
        <span className="text-white/20" aria-hidden>|</span>
        <span className={`shell-status-connection ${serverConnected ? 'shell-status--connected' : ''}`}>
          <span className={dotClass} aria-hidden />
          {label}
        </span>
      </div>
    </div>
  );
}
