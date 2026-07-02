import { useEffect, useState } from 'react';
import { apiCommand } from '@/api/commands';
import { getInterfaceMode, setInterfaceMode } from '@/v2/lib/interfaceMode';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import { Button } from '@/v2/components/ui/button';
import { Card, CardContent } from '@/v2/components/ui/card';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import Segmented from '@/v2/components/primitives/Segmented';
import { useDensity } from '@/hooks/useDensity';
import { toast } from 'sonner';

type CompanySettings = { company_name?: string; cui?: string; email?: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({});
  const [iface, setIface] = useState(getInterfaceMode());
  const { density, setDensity } = useDensity();

  useEffect(() => {
    apiCommand<CompanySettings>('get_company_settings').then(setSettings).catch(() => {});
  }, []);

  const save = async () => {
    try {
      await apiCommand('update_company_settings', settings);
      toast.success('Setări salvate');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const switchIface = (mode: 'v2' | 'classic') => {
    setInterfaceMode(mode);
    setIface(mode);
    window.location.hash = mode === 'classic' ? '#/settings' : '#/v2/settings';
    window.location.reload();
  };

  return (
    <Page fill>
      <PageHeader title="Setări" description="Configurare aplicație" actions={<Button size="sm" onClick={() => void save()}>Salvează</Button>} />
      <PageBody>
      <Card className="shadow-none">
        <CardContent className="density-form space-y-[var(--density-gap-section)]">
          <div className="density-setting-row rounded-md border border-border/60">
            <div>
              <Label className="mb-0">Interfață</Label>
              <p className="density-meta text-muted-foreground">Nouă (V2) sau clasică</p>
            </div>
            <div className="flex gap-1">
              <Button variant={iface === 'v2' ? 'default' : 'outline'} size="sm" onClick={() => switchIface('v2')}>Nouă</Button>
              <Button variant={iface === 'classic' ? 'default' : 'outline'} size="sm" onClick={() => switchIface('classic')}>Clasică</Button>
            </div>
          </div>

          <div className="density-setting-row rounded-md border border-border/60">
            <div>
              <Label className="mb-0">Densitate UI</Label>
              <p className="density-meta text-muted-foreground">Spațiere tabele, formulare, navigare</p>
            </div>
            <Segmented
              ariaLabel="Densitate UI"
              value={density}
              onChange={setDensity}
              options={[
                { id: 'comfortable', label: 'Confortabil' },
                { id: 'compact', label: 'Compact' },
                { id: 'dense', label: 'Dens' },
              ]}
            />
          </div>

          <div className="density-form-grid density-form-grid-3">
            <div className="space-y-[var(--density-label-mb)]">
              <Label>Companie</Label>
              <Input value={settings.company_name || ''} onChange={(e) => setSettings((s) => ({ ...s, company_name: e.target.value }))} />
            </div>
            <div className="space-y-[var(--density-label-mb)]">
              <Label>CUI</Label>
              <Input value={settings.cui || ''} onChange={(e) => setSettings((s) => ({ ...s, cui: e.target.value }))} />
            </div>
            <div className="space-y-[var(--density-label-mb)] md:col-span-2 xl:col-span-1">
              <Label>Email companie</Label>
              <Input value={settings.email || ''} onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>
      </PageBody>
    </Page>
  );
}
