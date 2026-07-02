import { useCallback, useEffect, useState } from 'react';
import { apiCommand } from '@/api/commands';
import { Page, PageHeader, PageBody, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Template { id: number; name: string; description: string | null }

export default function FisaTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Template[]>('get_fisa_templates')
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Page fill>
      <PageHeader title="Template-uri fișe" description="Șabloane pentru fișa proiectantului" />
      <PageBody>
        <AsyncContent loading={loading} error={null} empty={templates.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Descriere</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.description || '—'}</TableCell>
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
