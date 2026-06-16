import { lazy, Suspense } from 'react';
import App from './App';
import BootLoader from './components/BootLoader';
import { useUiModeStore } from './store/uiModeStore';

// Thin entry that selects the presentation layer. SaaS is the default and is
// eager (zero overhead for the common path); the whole Fiori (UI5) tree is
// lazy-loaded only when the user opts into Fiori mode.
const FioriApp = lazy(() => import('./fiori/FioriApp'));

export default function Root() {
  const mode = useUiModeStore(s => s.mode);
  if (mode === 'fiori') {
    return (
      <Suspense fallback={<BootLoader />}>
        <FioriApp />
      </Suspense>
    );
  }
  return <App />;
}
