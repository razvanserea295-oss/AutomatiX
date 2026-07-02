import { useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useLocation } from 'wouter';
import { Search } from '@/icons';
import { flattenV2Nav } from '@/v2/app/nav';
import { canAccessPage, type AppPage } from '@/lib/access';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  customPages?: string | null;
};

export default function CommandMenu({ open, onOpenChange, role, customPages }: Props) {
  const [, navigate] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const items = flattenV2Nav().filter(
    (i) => i.page && canAccessPage(role, i.page as AppPage, customPages),
  );

  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => onOpenChange(false)}>
      <div
        className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2 rounded-lg border bg-popover shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-lg">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Navigare rapidă…"
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nicio pagină găsită.
            </Command.Empty>
            <Command.Group heading="Pagini">
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.path}`}
                  onSelect={() => go(item.path)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
