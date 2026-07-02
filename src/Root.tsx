import App from './App';
import V2App from './v2/app/V2App';
import DensityProvider from './components/DensityProvider';
import { ensureDefaultV2Route, getInterfaceMode } from './v2/lib/interfaceMode';

ensureDefaultV2Route();

// Classic is the default interface. V2 available via Settings toggle.
export default function Root() {
  const mode = getInterfaceMode();
  if (mode === 'classic') {
    return (
      <DensityProvider>
        <div className="classic-root">
          <App />
        </div>
      </DensityProvider>
    );
  }
  return (
    <DensityProvider>
      <V2App />
    </DensityProvider>
  );
}
