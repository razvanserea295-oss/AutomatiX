import { PAGE_IDS } from '@/config/constants';
import { isDesktopRuntime, isElectronRuntime } from '@/lib/runtime';
import { isTauri, checkForUpdate } from '@/lib/tauriUpdater';
import { toast } from '@/store/toastStore';

export type TitleBarMenuId = 'file' | 'edit' | 'view' | 'go' | 'tools' | 'help';

export interface TitleBarMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
}

export interface TitleBarMenuGroup {
  id: TitleBarMenuId;
  label: string;
  items: TitleBarMenuItem[];
}

export interface TitleBarActionContext {
  onNavigate: (pageId: string) => void;
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
  onToggleSidebar: () => void;
  onToggleDensity: () => void;
  onToggleTheme: () => void;
  onGoBack?: () => void;
  canGoBack: boolean;
  onNewProject: () => void;
}

function zoomLevel(): number {
  const raw = document.documentElement.style.zoom;
  const parsed = raw ? parseFloat(raw) : 1;
  return Number.isFinite(parsed) ? parsed : 1;
}

function setZoom(level: number): void {
  const clamped = Math.min(2, Math.max(0.5, level));
  document.documentElement.style.zoom = String(clamped);
}

function tryUndo(): void {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    document.execCommand('undo');
    return;
  }
  window.dispatchEvent(new CustomEvent('promix:undo'));
}

async function quitApp(): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
    return;
  }
  if (isElectronRuntime()) {
    await window.electron.invoke('window_close');
    return;
  }
  window.close();
}

function openSettingsSection(section: string, onNavigate: (pageId: string) => void): void {
  sessionStorage.setItem('promix_settings_section', section);
  onNavigate(PAGE_IDS.SETTINGS);
}

async function checkUpdates(): Promise<void> {
  if (isTauri()) {
    const info = await checkForUpdate();
    if (info) {
      toast.info(`Actualizare disponibilă: v${info.version}`);
    } else {
      toast.info('Ești pe ultima versiune.');
    }
    return;
  }
  if (isElectronRuntime()) {
    try {
      const status = await window.electron.invoke('updater_get_status') as { updateAvailable?: boolean } | null;
      if (status?.updateAvailable) {
        toast.info('Actualizare disponibilă — verifică Setări → Despre.');
      } else {
        toast.info('Ești pe ultima versiune.');
      }
    } catch {
      toast.warning('Verificare actualizări indisponibilă.');
    }
    return;
  }
  toast.info('Actualizările automate sunt disponibile în aplicația desktop.');
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen?.();
  } else {
    void document.exitFullscreen?.();
  }
}

function showAbout(): void {
  const version = import.meta.env.VITE_APP_VERSION ?? '—';
  toast.info(`Automatix v${version} — Automatix Software`);
}

export function buildTitleBarMenus(ctx: TitleBarActionContext): TitleBarMenuGroup[] {
  const desktop = isDesktopRuntime();

  return [
    {
      id: 'file',
      label: 'Fișier',
      items: [
        { id: 'new-project', label: 'Proiect nou…', action: ctx.onNewProject },
        { id: 'sep-1', label: '', separator: true },
        { id: 'export-docs', label: 'Documente & export', action: () => ctx.onNavigate(PAGE_IDS.DOCUMENTS) },
        { id: 'print', label: 'Imprimare…', action: () => ctx.onNavigate(PAGE_IDS.PRINT) },
        { id: 'backup', label: 'Backup bază de date', action: () => openSettingsSection('backup', ctx.onNavigate) },
        { id: 'sep-2', label: '', separator: true },
        { id: 'settings', label: 'Setări', shortcut: 'Ctrl+,', action: () => ctx.onNavigate(PAGE_IDS.SETTINGS) },
        {
          id: 'quit',
          label: desktop ? 'Ieșire' : 'Închide fila',
          shortcut: desktop ? 'Alt+F4' : undefined,
          action: () => { void quitApp(); },
        },
      ],
    },
    {
      id: 'edit',
      label: 'Editare',
      items: [
        { id: 'undo', label: 'Anulează', shortcut: 'Ctrl+Z', action: tryUndo },
        { id: 'sep-1', label: '', separator: true },
        { id: 'find', label: 'Caută în aplicație…', shortcut: 'Ctrl+K', action: ctx.onOpenCommandPalette },
        { id: 'preferences', label: 'Preferințe…', shortcut: 'Ctrl+,', action: () => ctx.onNavigate(PAGE_IDS.SETTINGS) },
      ],
    },
    {
      id: 'view',
      label: 'Vizualizare',
      items: [
        {
          id: 'toggle-sidebar',
          label: 'Comută bara laterală',
          shortcut: 'Ctrl+\\',
          action: ctx.onToggleSidebar,
        },
        { id: 'density', label: 'Comută densitatea UI', action: ctx.onToggleDensity },
        { id: 'theme', label: 'Comută tema (luminos/întunecat)', action: ctx.onToggleTheme },
        { id: 'sep-1', label: '', separator: true },
        { id: 'zoom-in', label: 'Mărește', shortcut: 'Ctrl+=', action: () => setZoom(zoomLevel() + 0.1) },
        { id: 'zoom-out', label: 'Micșorează', shortcut: 'Ctrl+-', action: () => setZoom(zoomLevel() - 0.1) },
        { id: 'zoom-reset', label: 'Zoom implicit', shortcut: 'Ctrl+0', action: () => setZoom(1) },
        { id: 'sep-2', label: '', separator: true },
        { id: 'fullscreen', label: 'Ecran complet', shortcut: 'F11', action: toggleFullscreen },
      ],
    },
    {
      id: 'go',
      label: 'Navigare',
      items: [
        {
          id: 'back',
          label: 'Înapoi',
          shortcut: 'Alt+←',
          disabled: !ctx.canGoBack,
          action: ctx.onGoBack,
        },
        {
          id: 'forward',
          label: 'Înainte',
          shortcut: 'Alt+→',
          action: () => window.history.forward(),
        },
        { id: 'sep-1', label: '', separator: true },
        { id: 'dashboard', label: 'Acasă', shortcut: 'G D', action: () => ctx.onNavigate(PAGE_IDS.DASHBOARD) },
        { id: 'projects', label: 'Proiecte', shortcut: 'G R', action: () => ctx.onNavigate(PAGE_IDS.PROJECTS) },
        { id: 'sales', label: 'Vânzări', shortcut: 'G V', action: () => ctx.onNavigate(PAGE_IDS.SALES_HUB) },
        { id: 'sep-2', label: '', separator: true },
        { id: 'go-to', label: 'Mergi la pagină…', shortcut: 'Ctrl+K', action: ctx.onOpenCommandPalette },
      ],
    },
    {
      id: 'tools',
      label: 'Instrumente',
      items: [
        { id: 'reports', label: 'Rapoarte', action: () => ctx.onNavigate(PAGE_IDS.REPORTS) },
        { id: 'ai', label: 'Asistent AI', action: () => ctx.onNavigate(PAGE_IDS.CHAT) },
        { id: 'remote', label: 'Asistență la distanță', action: () => ctx.onNavigate(PAGE_IDS.REMOTE_SUPPORT) },
        { id: 'download', label: 'Aplicație desktop', action: () => ctx.onNavigate('download-app') },
        { id: 'sep-1', label: '', separator: true },
        { id: 'shortcuts', label: 'Scurtături tastatură', shortcut: 'Shift+?', action: ctx.onOpenShortcuts },
      ],
    },
    {
      id: 'help',
      label: 'Ajutor',
      items: [
        { id: 'tutorial', label: 'Tutorial', action: () => ctx.onNavigate(PAGE_IDS.TUTORIAL) },
        { id: 'docs', label: 'Documentație', action: () => openSettingsSection('ajutor', ctx.onNavigate) },
        { id: 'sep-1', label: '', separator: true },
        { id: 'about', label: 'Despre Automatix', action: showAbout },
        { id: 'updates', label: 'Verifică actualizări', action: () => { void checkUpdates(); } },
      ],
    },
  ];
}
