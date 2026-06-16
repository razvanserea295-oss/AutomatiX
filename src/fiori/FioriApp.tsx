import { ShellBar, Card, CardHeader, Button, Text } from '@ui5/webcomponents-react';
import { useUiModeStore } from '@/store/uiModeStore';

// Phase-0 placeholder for the SAP UI5 (Fiori Horizon) presentation tree. Renders a
// real UI5 ShellBar + Card so the selectable mode and the Horizon theme/brand are
// verifiable now; Phase 1 replaces this with the generalized FioriAppShell
// (ShellBar + 2-tier SideNavigation) + routed UI5 pages, reusing the shared data
// layer (stores / apiCommand / lib / config) verbatim.
export default function FioriApp() {
  const setMode = useUiModeStore(s => s.setMode);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ShellBar primaryTitle="Automatix" secondaryTitle="SAP Fiori (Horizon)" />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <Card
          header={<CardHeader titleText="Interfața SAP Fiori" subtitleText="În construcție — Faza 1 adaugă shell-ul complet și paginile UI5" />}
          style={{ maxWidth: '34rem', width: '100%' }}
        >
          <div style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Text>
              Modul Fiori este activ (UI5 Horizon, shell navy + accent emerald). Navigarea completă
              (ShellBar + SideNavigation) și paginile UI5 sosesc în fazele următoare; toată logica de
              date este partajată cu interfața Modern.
            </Text>
            <div>
              <Button design="Emphasized" onClick={() => setMode('saas')}>Înapoi la interfața Modern</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
