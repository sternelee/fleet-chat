/**
 * Keyboard API for Fleet Chat Plugins
 * Provides Raycast-compatible keyboard utilities
 */

export type KeyModifier = 'cmd' | 'ctrl' | 'alt' | 'shift' | 'meta';

export interface KeyboardShortcut {
  key: string;
  modifiers?: KeyModifier[];
}

/**
 * Check if a modifier key is pressed in the given keyboard event
 */
export function isModifierKeyPressed(event: KeyboardEvent, modifier: KeyModifier): boolean {
  switch (modifier) {
    case 'cmd':
    case 'meta':
      return event.metaKey;
    case 'ctrl':
      return event.ctrlKey;
    case 'alt':
      return event.altKey;
    case 'shift':
      return event.shiftKey;
    default:
      return false;
  }
}

/**
 * Get a human-readable string representation of a keyboard event
 */
export function getKeyComboString(event: KeyboardEvent): string {
  const modifiers: KeyModifier[] = [];
  
  if (event.metaKey) modifiers.push('cmd');
  if (event.ctrlKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  
  const key = event.key.toUpperCase();
  return [...modifiers, key].join('+');
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map(key => {
      const upperKey = key.trim().toUpperCase();
      switch (upperKey) {
        case 'CMD': return '⌘';
        case 'CTRL': return '⌃';
        case 'ALT': return '⌥';
        case 'SHIFT': return '⇧';
        case 'META': return '◆';
        default: return upperKey;
      }
    })
    .join('');
}

/**
 * Parse a shortcut string into components
 */
export function parseShortcut(shortcut: string): KeyboardShortcut {
  const parts = shortcut.toLowerCase().split('+').map(p => p.trim());
  const key = parts.pop() || '';
  
  const modifiers: KeyModifier[] = parts.filter(part => 
    ['cmd', 'ctrl', 'alt', 'shift', 'meta'].includes(part)
  ) as KeyModifier[];
  
  return { key, modifiers };
}

/**
 * Check if two keyboard shortcuts match
 */
export function shortcutsMatch(a: KeyboardShortcut, b: KeyboardShortcut): boolean {
  if (a.key.toLowerCase() !== b.key.toLowerCase()) {
    return false;
  }
  
  const aModifiers = new Set(a.modifiers || []);
  const bModifiers = new Set(b.modifiers || []);
  
  return aModifiers.size === bModifiers.size && 
         [...aModifiers].every(mod => bModifiers.has(mod));
}