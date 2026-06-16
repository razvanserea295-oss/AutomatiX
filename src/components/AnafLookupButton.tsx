import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';

export interface AnafCompanyInfo {
  cui: string; denumire: string; adresa: string; judet: string;
  oras: string; cod_postal: string; reg_com: string; telefon: string;
  fax: string; email: string;
  is_tva_payer: boolean; status_inregistrare_tva: string;
  data_inregistrare: string | null;
}





export default function AnafLookupButton({ cui, onResult, disabled }: {
  cui: string;
  onResult: (data: AnafCompanyInfo) => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!cui?.trim()) { toast.error('Introduceți CUI-ul'); return; }
    setLoading(true);
    try {
      const data = await apiCommand<AnafCompanyInfo>('anaf_lookup_cui', { cui });
      onResult(data);
      toast.success(`Date completate: ${data.denumire}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'CUI negăsit la ANAF');
    } finally { setLoading(false); }
  };

  return (
    <button type="button" onClick={lookup} disabled={loading || disabled || !cui?.trim()}
      title="Caută la ANAF"
      className="inline-flex items-center gap-1.5 px-2 py-1 text-pm-2xs font-semibold rounded bg-status-blue/15 text-status-blue hover:bg-status-blue/25 disabled:opacity-50 transition-colors">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
      Caută ANAF
    </button>
  );
}
