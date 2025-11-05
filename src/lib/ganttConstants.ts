/**
 * Gantt Chart Constants
 * Centralized configuration values for the Gantt chart
 */

// Layout Constants
export const LAYOUT = {
  DEFAULT_SWIMLANE_WIDTH: 280,
  MIN_SWIMLANE_WIDTH: 200,
  MAX_SWIMLANE_WIDTH: 600,
  DEFAULT_TOTAL_HOURS: 240,
  ROW_HEIGHT: 48,
  BAR_HEIGHT: {
    TASK: 24,
    STATE: 22,
    SUMMARY: 2,
  },
  INDENT_SIZE: 20,
} as const;

// Color Palette with Names
export const COLOR_PALETTE = [
  { name: 'Maroon', hex: '#800000' },
  { name: 'Brown', hex: '#9A6324' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Teal', hex: '#469990' },
  { name: 'Navy', hex: '#000075' },
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#e6194B' },
  { name: 'Orange', hex: '#f58231' },
  { name: 'Yellow', hex: '#ffe119' },
  { name: 'Lime', hex: '#bfef45' },
  { name: 'Green', hex: '#3cb44b' },
  { name: 'Cyan', hex: '#42d4f4' },
  { name: 'Blue', hex: '#4363d8' },
  { name: 'Purple', hex: '#911eb4' },
  { name: 'Magenta', hex: '#f032e6' },
  { name: 'Grey', hex: '#a9a9a9' },
  { name: 'Pink', hex: '#fabed4' },
  { name: 'Apricot', hex: '#ffd8b1' },
  { name: 'Beige', hex: '#fffac8' },
  { name: 'Mint', hex: '#aaffc3' },
  { name: 'Lavender', hex: '#dcbeff' },
  { name: 'White', hex: '#ffffff' },
] as const;

// Helper to get color name from hex
export function getColorName(hex: string): string | undefined {
  const normalized = hex.toLowerCase();
  return COLOR_PALETTE.find(c => c.hex.toLowerCase() === normalized)?.name;
}

// Default Colors
export const DEFAULT_COLORS = {
  TASK: '#4363d8', // Blue from palette
  STATE: '#3cb44b', // Green from palette
  LINK: '#a9a9a9', // Grey from palette
  FLAG: '#4363d8', // Blue from palette
  LABEL: '#ffffff', // White from palette
} as const;

// Timing Constants
export const TIMING = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 3000,
} as const;

// Input Limits
export const LIMITS = {
  MAX_LABEL_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_TITLE_LENGTH: 200,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  LINK: 5,         // Links below all bars
  BAR: 10,         // Task bars above links
  STATE: 30,       // State bars above task bars
  SELECTED: 50,    // Selected items above all
  DRAG_PREVIEW: 100,
  COPY_GHOST: 110,
  MODAL: 1000,
} as const;

// Keyboard Shortcuts
export const KEYBOARD = {
  COPY: 'c',
  PASTE: 'v',
  UNDO: 'z',
  REDO: 'y',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  ESCAPE: 'Escape',
  FLAG: 'f',
} as const;

// ARIA Labels
export const ARIA_LABELS = {
  GANTT_CHART: 'Gantt Chart Timeline',
  SWIMLANE: 'Swimlane',
  TASK_BAR: 'Task Bar',
  STATE_BAR: 'State Bar',
  LINK: 'Task Link',
  FLAG: 'Timeline Flag',
  ADD_SWIMLANE: 'Add new swimlane',
  DELETE_ITEM: 'Delete item',
  ZOOM_IN: 'Zoom in',
  ZOOM_OUT: 'Zoom out',
  UNDO: 'Undo last action',
  REDO: 'Redo last action',
  EXPORT: 'Export chart data',
  IMPORT: 'Import chart data',
  CLEAR: 'Clear all data',
} as const;
