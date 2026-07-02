import { useCallback, useEffect, useState } from 'react';
import { apiCommand } from '@/api/commands';
import { Page, PageHeader, PageBody, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface PieceOrder {
  id: number; piece_name: string; project_name: string; quantity: number; status: string;
}

export default function PiecesOrderingPage() {
  const [orders, setOrders] = useState<PieceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<PieceOrder[]>('get_piece_orders')
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Page fill>
      <PageHeader title="Piese de comandat" description="Cereri de achiziție piese din proiecte" />
      <PageBody>
        <AsyncContent loading={loading} error={null} empty={orders.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Piesă</TableHead>
                <TableHead>Proiect</TableHead>
                <TableHead>Cantitate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.piece_name}</TableCell>
                  <TableCell>{o.project_name}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
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
