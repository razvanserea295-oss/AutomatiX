// Generates src/icons/index.tsx — a lucide-react-compatible icon module backed
// by SAP Fiori (v5) glyphs. Components mapped below render Fiori path data;
// everything else falls through to lucide-react (`export *`) so nothing breaks.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const V5 = join(ROOT, 'node_modules/@ui5/webcomponents-icons/dist/v5');

// lucide component name -> Fiori (v5) icon name
const MAP = {
  // chrome / nav
  Home: 'home', LayoutDashboard: 'home', LayoutGrid: 'menu2', Layout: 'menu2',
  Menu: 'menu2', Search: 'search', Bell: 'bell', BellRing: 'bell', BellOff: 'bell',
  Settings: 'action-settings', Cog: 'action-settings',
  Grid3x3: 'grid', Columns2: 'table-view', Table: 'table-view',
  // people
  Users: 'group', User: 'employee', UserRound: 'employee', UserCheck: 'employee',
  UserPlus: 'add-employee', Crown: 'manager', GraduationCap: 'education',
  Handshake: 'collaborate', Hand: 'collaborate', Fingerprint: 'fingerprint',
  // business objects
  ShoppingCart: 'cart', Package: 'product', Box: 'product', Boxes: 'product',
  Container: 'container', PackageCheck: 'accept', Warehouse: 'inventory',
  Factory: 'factory', Truck: 'shipping-status', Building2: 'building',
  Briefcase: 'building', Wallet: 'money-bills', DollarSign: 'money-bills',
  CircleDollarSign: 'money-bills', Receipt: 'receipt', Scale: 'scale',
  Tags: 'tag', Tag: 'tag', Star: 'favorite', Bookmark: 'bookmark',
  Megaphone: 'megamenu', Target: 'target-group', Crosshair: 'target-group',
  // documents / files
  FileText: 'document-text', Files: 'documents', File: 'document', Clipboard: 'copy',
  ClipboardCheck: 'task', ScrollText: 'document', BookOpen: 'book', Library: 'course-book',
  FileSpreadsheet: 'excel-attachment', FileCode: 'syntax', FileImage: 'picture',
  FileArchive: 'attachment-zip-file', FileDown: 'download', FileBox: 'document',
  Archive: 'inbox', Inbox: 'inbox', Paperclip: 'attachment',
  Folder: 'folder', FolderOpen: 'open-folder', FolderKanban: 'folder',
  FolderTree: 'folder', FolderArchive: 'folder', FolderPlus: 'add-folder', FolderUp: 'upload',
  Stamp: 'stamp', ScanText: 'scan-barcode',
  // actions
  Plus: 'add', Minus: 'less', Trash: 'delete', Trash2: 'delete',
  Edit2: 'edit', Pencil: 'edit', PenSquare: 'edit', PenTool: 'edit',
  Filter: 'filter', Save: 'save', Printer: 'print', Download: 'download',
  Upload: 'upload', Copy: 'copy', Send: 'paper-plane', Reply: 'response',
  Eye: 'show', EyeOff: 'hide', Link2: 'chain-link', ExternalLink: 'action',
  RefreshCw: 'refresh', RefreshCcw: 'refresh', RotateCw: 'refresh', RotateCcw: 'undo',
  Repeat: 'repost', History: 'history', Play: 'media-play', Wand2: 'wand',
  Maximize: 'full-screen', Maximize2: 'full-screen', Minimize2: 'exit-full-screen',
  ZoomIn: 'zoom-in', ZoomOut: 'zoom-out', Printer2: 'print',
  // status / feedback
  Check: 'accept', CheckCircle: 'sys-enter-2', CheckCircle2: 'sys-enter-2', CheckSquare: 'complete',
  X: 'decline', XCircle: 'sys-cancel-2', AlertTriangle: 'alert', AlertCircle: 'message-warning',
  AlertOctagon: 'alert', Info: 'message-information', Flame: 'heating-cooling', Zap: 'energy-saving-lightbulb',
  Shield: 'shield', ShieldCheck: 'shield', ShieldAlert: 'shield', ShieldOff: 'shield', ShieldX: 'shield',
  Lock: 'locked', KeyRound: 'key', Sparkles: 'lightbulb', Activity: 'activity-items',
  // arrows / chevrons
  ChevronDown: 'slim-arrow-down', ChevronUp: 'slim-arrow-up',
  ChevronLeft: 'slim-arrow-left', ChevronRight: 'slim-arrow-right',
  ArrowDown: 'arrow-bottom', ArrowUp: 'arrow-top', ArrowLeft: 'arrow-left', ArrowRight: 'arrow-right',
  ArrowUpRight: 'arrow-top', ArrowRightLeft: 'switch-views', MoveHorizontal: 'resize-horizontal',
  TrendingUp: 'trend-up', TrendingDown: 'trend-down', BarChart3: 'bar-chart',
  // tech / devices
  Server: 'database', HardDrive: 'database', Cpu: 'it-system', Network: 'org-chart',
  Monitor: 'sys-monitor', Smartphone: 'iphone', Tablet: 'ipad', Keyboard: 'keyboard-and-mouse',
  Wifi: 'connected', WifiOff: 'disconnected', Cloud: 'cloud', Globe: 'world',
  Printer3: 'print', Camera: 'camera', Phone: 'phone', Mail: 'email',
  MessageSquare: 'discussion', MessageCircle: 'discussion', MessagesSquare: 'discussion-2',
  Wrench: 'wrench', Hammer: 'wrench', Plug: 'connected', GitBranch: 'org-chart',
  GitMerge: 'org-chart', Gauge: 'meter-arrow', Cake: 'birthday', Apple: 'nutrition-activity',
  MapPin: 'map-2', Calendar: 'calendar', CalendarClock: 'date-time', Clock4: 'history',
  LogOut: 'log', LogIn: 'visits', Loader2: 'synchronize', Bot: 'da', Sparkle: 'lightbulb',
};

const used = readFileSync(join(__dirname, '..', '_lucide_used.txt'), 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean);

function readGlyph(fioriName) {
  const f = join(V5, `${fioriName}.js`);
  if (!existsSync(f)) return null;
  const src = readFileSync(f, 'utf8');
  const path = /const pathData = "([^"]+)"/.exec(src)?.[1];
  const viewBox = /const viewBox = "([^"]+)"/.exec(src)?.[1] || '0 0 16 16';
  if (!path) return null;
  return { path, viewBox };
}

const entries = [];
let mapped = 0, missing = [];
for (const [lucide, fiori] of Object.entries(MAP)) {
  if (used.length && !used.includes(lucide)) continue; // only emit icons the app actually uses
  const g = readGlyph(fiori);
  if (!g) { missing.push(`${lucide}->${fiori}`); continue; }
  entries.push({ lucide, ...g });
  mapped++;
}

const header = `// AUTO-GENERATED by scripts/gen-fiori-icons.mjs — do not edit by hand.
// Drop-in for lucide-react: SAP Fiori (v5) glyphs for mapped icons, lucide for the rest.
import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
export * from 'lucide-react';

// Returns a LucideIcon-compatible component (forwardRef → has $$typeof) so it is
// a drop-in wherever the app types an icon as LucideIcon. strokeWidth is accepted
// but ignored — Fiori glyphs are filled, not stroked.
function fiori(path: string, viewBox: string): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function FioriIcon(
    { size = 24, strokeWidth: _s, absoluteStrokeWidth: _a, color, className, style, ...rest }, ref) {
    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox}
        fill={(color as string) ?? 'currentColor'} className={className} style={style}
        aria-hidden focusable={false} {...rest}>
        <path d={path} />
      </svg>
    );
  });
  return Icon as unknown as LucideIcon;
}
`;

const body = entries.map((e) =>
  `export const ${e.lucide} = /* @__PURE__ */ fiori(${JSON.stringify(e.path)}, ${JSON.stringify(e.viewBox)});`
).join('\n');

const outDir = join(ROOT, 'src/icons');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.tsx'), header + '\n' + body + '\n');

console.log(`[fiori-icons] generated ${mapped} Fiori glyphs -> src/icons/index.tsx`);
if (missing.length) console.log(`[fiori-icons] fell back to lucide (Fiori name not found): ${missing.join(', ')}`);
