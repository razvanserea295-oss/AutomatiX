import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, KeyRound } from '@/icons';
import { apiCommand } from '@/api/commands';
import { Page, PageHeader, PageBody, PageKpis, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface License {
  license_id: string; company_name: string; email: string; status: string; created_at: string;
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<{ licenses: License[] }>('list_licenses')
      .then((d) => setLicenses(Array.isArray(d?.licenses) ? d.licenses : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => ({
    total: licenses.length,
    active: licenses.filter((l) => l.status === 'active' || l.status === 'activ').length,
    revoked: licenses.filter((l) => l.status === 'revoked' || l.status === 'revocat').length,
  }), [licenses]);

  return (
    <Page fill>
      <PageHeader title="Licențe" description="Licențe activate pe această instanță" />
      <PageBody>
        <PageKpis>
          <KPICard label="Total" value={kpis.total} icon={<KeyRound className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Active" value={kpis.active} icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Revocat" value={kpis.revoked} icon={<ShieldOff className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>

        <AsyncContent loading={loading} error={null} empty={licenses.length === 0}>
          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firmă</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID Licență</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody stagger>
                {licenses.map((l) => (
                  <TableRow key={l.license_id}>
                    <TableCell className="font-medium">{l.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.email}</TableCell>
                    <TableCell><StatusBadge status={l.status} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.license_id.slice(0, 12)}…</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
