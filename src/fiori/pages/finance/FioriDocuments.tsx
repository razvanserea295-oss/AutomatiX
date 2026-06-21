import { useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, AnalyticalTable, BusyIndicator,
} from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import Ui5ClassicControl from '@/fiori/classic/Ui5ClassicControl';
import type { SapGlobal } from '@/fiori/classic/ui5Loader';
import type { User } from '@/core/types';

// Raw document row returned by the `get_documents` command — the same source the
// SaaS DocumentsPage consumes. We mirror its field names exactly. The SaaS page
// renames `name` → title and `uploaded_at` → created_at; we keep the raw names.
interface RawDocument {
  id: number;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  category_id: number;
  category_name: string;
  project_id: number | null;
  project_name: string | null;
  uploaded_at: string;
}

// Shape the AnalyticalTable binds to (flat, display-ready).
interface DocRow {
  id: number;
  name: string;
  file_type: string;
  category_name: string;
  project_name: string;
  uploaded_at: string;
  raw: RawDocument;
}

// File payload returned by `get_document_file` (same command the SaaS download uses).
interface DocFile {
  data: string | null;
  mime: string | null;
  filename: string;
  size: number;
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('ro-RO');
}

// Builds a REAL classic sap.m.PDFViewer bound to a source URL. The wrapper calls
// placeAt for us, so we only construct and return the control.
function buildPdfViewer(sap: SapGlobal, source: string, title: string): SapGlobal {
  return new sap.m.PDFViewer({
    source,
    title,
    height: '100%',
    showDownloadButton: true,
  });
}

export default function FioriDocuments({ user }: { user: User }) {
  const [documents, setDocuments] = useState<RawDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<RawDocument | null>(null);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiCommand<RawDocument[]>('get_documents')
      .then((rows) => { if (!cancelled) setDocuments(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setDocuments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo<DocRow[]>(() => documents.map((d) => ({
    id: d.id,
    name: d.name,
    file_type: (d.file_type || '').toUpperCase(),
    category_name: d.category_name || '—',
    project_name: d.project_name || '—',
    uploaded_at: formatDate(d.uploaded_at),
    raw: d,
  })), [documents]);

  // Resolve a viewable PDF source for the chosen document. Mirrors the SaaS
  // download flow: fetch the stored base64 via `get_document_file`, build a blob
  // URL; fall back to the on-disk file_path served at /api/files when no data.
  async function openDocument(doc: RawDocument): Promise<void> {
    setSelected(doc);
    setPdfSource(null);
    setPdfError(null);
    setPdfLoading(true);
    try {
      const file = await apiCommand<DocFile>('get_document_file', { id: doc.id });
      if (file?.data) {
        const dataPart = file.data.includes(',') ? file.data.split(',')[1] : file.data;
        const mime = file.mime || guessMime(file.filename || doc.file_path);
        const bytes = atob(dataPart);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: mime });
        setPdfSource(URL.createObjectURL(blob));
      } else if (doc.file_path) {
        const url = doc.file_path.startsWith('http') || doc.file_path.startsWith('/')
          ? doc.file_path
          : `/api/files/${encodeURIComponent(doc.file_path)}`;
        setPdfSource(url);
      } else {
        setPdfError('Documentul nu are conținut salvat.');
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Eroare la deschiderea documentului.');
    } finally {
      setPdfLoading(false);
    }
  }

  const columns = useMemo(() => [
    { Header: 'Nume', accessor: 'name', minWidth: 220 },
    { Header: 'Tip', accessor: 'file_type', width: 110 },
    { Header: 'Categorie', accessor: 'category_name', minWidth: 150 },
    { Header: 'Proiect', accessor: 'project_name', minWidth: 150 },
    { Header: 'Dată', accessor: 'uploaded_at', minWidth: 160 },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Documente</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            design="Emphasized"
            disabled={!selected}
            onClick={() => { if (selected) void openDocument(selected); }}
          >
            Deschide PDF
          </Button>
          {selected && (
            <Button design="Transparent" onClick={() => { setSelected(null); setPdfSource(null); setPdfError(null); }}>
              Închide previzualizarea
            </Button>
          )}
          {user.role_name === 'admin' && (
            <Button design="Transparent" disabled>
              {`${documents.length} documente`}
            </Button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <div style={{ flexShrink: 0 }}>
            <AnalyticalTable
              data={rows}
              columns={columns}
              filterable
              sortable
              visibleRows={10}
              noDataText="Fără date"
              selectionMode="Single"
              onRowSelect={(e) => {
                const row = e.detail.row?.original as DocRow | undefined;
                if (row) void openDocument(row.raw);
              }}
            />
          </div>
        )}

        {selected && (
          <div style={{ flex: 1, minHeight: '24rem', display: 'flex', flexDirection: 'column' }}>
            {pdfLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <BusyIndicator active size="L" />
              </div>
            ) : pdfError ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sapNegativeColor, #bb0000)' }}>
                {pdfError}
              </div>
            ) : pdfSource ? (
              <Ui5ClassicControl
                key={pdfSource}
                height="100%"
                create={(sap) => buildPdfViewer(sap, pdfSource, selected.name)}
              />
            ) : null}
          </div>
        )}
      </div>
    </DynamicPage>
  );
}
