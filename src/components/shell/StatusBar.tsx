





import { useEffect, useState } from 'react';
import { isServerReachable } from '@/config/server';

interface StatusBarProps {
  currentPage: string;
  userName: string;
  roleName?: string;
}

const POLL_MS = 10_000;

export default function StatusBar({ currentPage, userName, roleName }: StatusBarProps) {
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
    serverConnected === null ? 'bg-content-muted' :
    serverConnected ? 'bg-status-green' : 'bg-status-red';
  const label =
    serverConnected === null ? 'Verificare…' :
    serverConnected ? 'Conectat' : 'Deconectat';

  const now = new Date();
  const time = now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-6 bg-surface-rail border-t border-white/8 flex items-center justify-between px-4 text-[10px] text-white/50 shrink-0 select-none font-mono tracking-wide">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="truncate">{currentPage}</span>
        <span className="text-white/20">|</span>
        <span className="truncate">{userName}{roleName ? ` · ${roleName}` : ''}</span>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="tabular-nums">{time}</span>
        <span className="text-white/20">|</span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {label}
        </span>
      </div>
    </div>
  );
}
