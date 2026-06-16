import { useEffect, useRef } from 'react';

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface Shortcut {
  





  keys: string;
  description: string;
  
  when?: () => boolean;
  handler: ShortcutHandler;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);


const SEQUENCE_TIMEOUT_MS = 1200;

function isSequence(keys: string): boolean {
  return keys.includes(' ');
}

export function formatKeys(keys: string): string {
  
  if (isSequence(keys)) {
    return keys.split(' ').map(formatKeys).join(' ');
  }
  const out = keys
    .replace(/Mod/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Shift/g, '⇧')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/\+/g, isMac ? '' : '+');
  
  return out.length === 1 ? out.toUpperCase() : out;
}

function matches(e: KeyboardEvent, spec: string): boolean {
  const parts = spec.split('+').map(p => p.trim());
  const wantMod = parts.includes('Mod');
  const wantShift = parts.includes('Shift');
  const wantAlt = parts.includes('Alt');
  const key = parts[parts.length - 1];

  const hasMod = isMac ? e.metaKey : e.ctrlKey;
  if (wantMod !== hasMod) return false;
  if (wantShift !== e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;

  
  const pressed = e.key;
  if (key.length === 1) return pressed.toLowerCase() === key.toLowerCase();
  return pressed === key;
}

/**
 * Attach a set of global shortcuts. Ignores keystrokes while the user is
 * typing into an input / textarea / contenteditable — otherwise Cmd+K in
 * the search field would also trigger the global search open.
 *
 * Safe to call in multiple components; listeners stack and each cleanup is
 * independent.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  
  
  
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    let pendingLeader: string | null = null;
    let leaderTimer: ReturnType<typeof setTimeout> | undefined;
    const clearLeader = () => { pendingLeader = null; clearTimeout(leaderTimer); };

    function isEditable(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }

    const active = (s: Shortcut) => !s.when || s.when();

    function onKeyDown(e: KeyboardEvent) {
      
      if (e.key !== 'Escape' && isEditable(e.target)) return;

      const list = ref.current;
      const noMods = !e.ctrlKey && !e.metaKey && !e.altKey;
      const isChar = e.key.length === 1;

      
      if (pendingLeader && noMods && isChar) {
        const leader = pendingLeader;
        const second = e.key.toLowerCase();
        const seq = list.find((s) => {
          if (!isSequence(s.keys) || !active(s)) return false;
          const [a, b] = s.keys.split(' ');
          return a.toLowerCase() === leader && b.toLowerCase() === second;
        });
        clearLeader();
        if (seq) {
          e.preventDefault();
          seq.handler(e);
          return;
        }
        
      }

      
      for (const s of list) {
        if (isSequence(s.keys) || !active(s)) continue;
        if (matches(e, s.keys)) {
          e.preventDefault();
          s.handler(e);
          return;
        }
      }

      
      if (noMods && isChar) {
        const startsSeq = list.some((s) =>
          isSequence(s.keys) && active(s) && s.keys.split(' ')[0].toLowerCase() === e.key.toLowerCase(),
        );
        if (startsSeq) {
          pendingLeader = e.key.toLowerCase();
          clearTimeout(leaderTimer);
          leaderTimer = setTimeout(clearLeader, SEQUENCE_TIMEOUT_MS);
        } else {
          clearLeader();
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(leaderTimer);
    };
  }, []);
}
