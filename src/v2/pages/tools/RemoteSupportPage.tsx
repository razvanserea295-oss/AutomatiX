import { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Monitor, Plug, RefreshCw } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { getServerUrl } from '@/config/server';
import { isDesktopRuntime } from '@/lib/runtime';
import { formatDateTimeRo } from '@/lib/format';
import RustDeskWebViewer from '@/components/remote/RustDeskWebViewer';
import { Page, PageHeader, PageBody, PageToolbar } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';

interface RemoteEndpoint {
  id: number; name: string; rustdesk_id: string; client_name: string | null; enabled: boolean;
}
interface RemoteSession {
  id: number; endpoint_name: string | null; customer_ref: string | null;
  rustdesk_id: string | null; status: string; created_at: string; quick_code: string | null;
}
interface QuickCreated {
  session: RemoteSession; code: string; path_hint: string; message_template: string;
}

function publicLink(pathHint: string): string {
  const base = (getServerUrl() || window.location.origin).replace(/\/+$/, '');
  const path = pathHint.startsWith('/') ? pathHint : `/${pathHint}`;
  return `${base}/#${path}`;
}

export default function RemoteSupportPage() {
  const isDesktop = isDesktopRuntime();
  const [tab, setTab] = useState<'connect' | 'endpoints' | 'history'>('connect');
  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [endpoints, setEndpoints] = useState<RemoteEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerRef, setCustomerRef] = useState('');
  const [quick, setQuick] = useState<QuickCreated | null>(null);
  const [connectSessionId, setConnectSessionId] = useState<number | null>(null);
  const [connectId, setConnectId] = useState('');
  const [connectPassword, setConnectPassword] = useState('');
  const [showViewer, setShowViewer] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<RemoteSession[]>('list_remote_sessions', { limit: 40 }),
      apiCommand<RemoteEndpoint[]>('get_remote_endpoints'),
    ])
      .then(([s, e]) => {
        setSessions(Array.isArray(s) ? s : []);
        setEndpoints(Array.isArray(e) ? e : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createQuick = async () => {
    try {
      const created = await apiCommand<QuickCreated>('create_quick_remote_support', {
        customer_ref: customerRef.trim() || null,
      });
      setQuick(created);
      setConnectSessionId(created.session.id);
      toast.success('Link generat');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const connect = async () => {
    const id = connectId.replace(/\s+/g, '').trim();
    if (!id || !connectPassword || !connectSessionId) {
      toast.error('ID, parolă și sesiune sunt obligatorii');
      return;
    }
    setConnecting(true);
    try {
      await apiCommand('start_remote_connection', { session_id: connectSessionId, rustdesk_id: id });
      if (isDesktop) {
        const launch = await apiCommand<{ ok: boolean; message: string }>('launch_rustdesk_viewer', {
          rustdesk_id: id, password: connectPassword,
        });
        if (launch.ok) toast.success('RustDesk deschis');
        else toast.error(launch.message);
      } else {
        setShowViewer(true);
        toast.success('Conectat — viewer în pagină');
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Conectare eșuată');
    } finally {
      setConnecting(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiat');
    } catch {
      toast.error('Nu s-a putut copia');
    }
  };

  const endSession = async (sessionId: number) => {
    try {
      await apiCommand('end_remote_session', { session_id: sessionId });
      if (quick?.session.id === sessionId) setQuick(null);
      setShowViewer(false);
      toast.success('Sesiune încheiată');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Suport remote"
        description="RustDesk — link rapid pentru clienți sau conectare la endpoint-uri înregistrate"
        actions={<Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Reîncarcă</Button>}
      />

      <PageBody>
      {showViewer && connectId && connectPassword && (
        <Card className="shadow-none overflow-hidden">
          <div className="p-0">
            <RustDeskWebViewer rustdeskId={connectId.replace(/\s+/g, '')} password={connectPassword} />
          </div>
        </Card>
      )}

      <PageToolbar>
        <Tabs>
          <TabsList>
            <TabsTrigger active={tab === 'connect'} onClick={() => setTab('connect')}>Conectare</TabsTrigger>
            <TabsTrigger active={tab === 'endpoints'} onClick={() => setTab('endpoints')}>Endpoint-uri</TabsTrigger>
            <TabsTrigger active={tab === 'history'} onClick={() => setTab('history')}>Istoric</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageToolbar>

      {tab === 'connect' && (
        <div className="grid gap-[var(--density-gap-section)] lg:grid-cols-2">
          <Card className="shadow-none">
            <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
              <h3 className="font-semibold flex items-center gap-2 text-[length:var(--density-fs-body)]"><Link2 className="h-4 w-4" />Link rapid client</h3>
              <div className="grid gap-2">
                <Label>Referință client (opțional)</Label>
                <Input value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} placeholder="ex. SC Exemplu" />
              </div>
              <Button onClick={() => void createQuick()}>Generează link</Button>
              {quick && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
                  <p>Cod: <strong>{quick.code}</strong></p>
                  <p className="break-all">{publicLink(quick.path_hint)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void copy(publicLink(quick.path_hint))}><Copy className="mr-1 h-3 w-3" />Link</Button>
                    <Button size="sm" variant="outline" onClick={() => void copy(quick.message_template)}><Copy className="mr-1 h-3 w-3" />Mesaj</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="shadow-none">
            <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
              <h3 className="font-semibold flex items-center gap-2 text-[length:var(--density-fs-body)]"><Plug className="h-4 w-4" />Conectare RustDesk</h3>
              <div className="grid gap-2">
                <Label>ID RustDesk</Label>
                <Input value={connectId} onChange={(e) => setConnectId(e.target.value)} placeholder="123 456 789" />
              </div>
              <div className="grid gap-2">
                <Label>Parolă</Label>
                <Input type="password" value={connectPassword} onChange={(e) => setConnectPassword(e.target.value)} />
              </div>
              <Button disabled={connecting} onClick={() => void connect()}>
                <Monitor className="mr-2 h-4 w-4" />{connecting ? 'Se conectează…' : 'Conectează'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AsyncContent loading={loading && tab !== 'connect'} error={null}>
        {tab === 'endpoints' && (
          <Card className="shadow-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>ID RustDesk</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.rustdesk_id}</TableCell>
                    <TableCell>{e.client_name || '—'}</TableCell>
                    <TableCell><StatusBadge status={e.enabled ? 'activ' : 'inactiv'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        {tab === 'history' && (
          <Card className="shadow-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Creat</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.customer_ref || s.endpoint_name || '—'}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>{formatDateTimeRo(s.created_at)}</TableCell>
                    <TableCell>
                      {s.status === 'active' && (
                        <Button size="sm" variant="ghost" onClick={() => void endSession(s.id)}>Încheie</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </AsyncContent>
      </PageBody>
    </Page>
  );
}
