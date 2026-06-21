import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, ObjectStatus,
  BusyIndicator, Button, FlexBox,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useStationStore } from '@/store/stationStore';
import { statusState } from '@/fiori/lib/statusState';
import type { Station } from '@/store/stationStore';
import type { User } from '@/core/types';

// Romanian labels for the technical station-type / status codes coming from the store.
const STATUS_LABEL: Record<string, string> = {
  active: 'Activ',
  activa: 'Activă',
  inactive: 'Inactiv',
  inactiva: 'Inactivă',
  maintenance: 'În mentenanță',
  mentenanta: 'În mentenanță',
  repair: 'În reparație',
  reparatie: 'În reparație',
  retired: 'Casat',
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('ro-RO');
}

function label(v: string | null | undefined): string {
  if (!v) return '—';
  return STATUS_LABEL[v.toLowerCase().trim()] ?? v;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function FioriMaintenance(_props: { user: User }) {
  const stations = useStationStore(s => s.stations);
  const loading = useStationStore(s => s.loading);
  const loaded = useStationStore(s => s.loaded);
  const fetchStations = useStationStore(s => s.fetchStations);

  useEffect(() => { void fetchStations(); }, [fetchStations]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Utilaj', accessor: 'name', minWidth: 180 },
    { Header: 'Cod', accessor: 'code', width: 120 },
    {
      Header: 'Tip intervenție',
      accessor: 'station_type',
      minWidth: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => <>{label(value as string)}</>,
    },
    { Header: 'Locație', accessor: 'location', minWidth: 140 },
    { Header: 'Producător', accessor: 'manufacturer', minWidth: 140 },
    { Header: 'Model', accessor: 'model', minWidth: 120 },
    {
      Header: 'Dată punere în funcțiune',
      accessor: 'commissioned_date',
      minWidth: 170,
      Cell: ({ value }: AnalyticalTableCellInstance) => <>{fmtDate(value as string)}</>,
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 150,
      Cell: ({ row }: AnalyticalTableCellInstance) => {
        const station = row.original as Station;
        return (
          <ObjectStatus state={statusState(station.status)}>
            {label(station.status)}
          </ObjectStatus>
        );
      },
    },
  ], []);

  if (loading && !loaded) {
    return (
      <FlexBox style={{ height: '100%', width: '100%' }} justifyContent="Center" alignItems="Center">
        <BusyIndicator active size="L" />
      </FlexBox>
    );
  }

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Button slot="actionsBar" design="Emphasized" onClick={() => void fetchStations(true)}>
              Reîmprospătează
            </Button>
          }
        >
          <Title slot="heading" level="H3">Mentenanță utilaje</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        <AnalyticalTable
          data={stations}
          columns={columns}
          filterable
          sortable
          visibleRows={15}
          noDataText="Fără date"
        />
      </div>
    </DynamicPage>
  );
}
