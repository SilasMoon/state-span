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

// Default Colors
export const DEFAULT_COLORS = {
  TASK: '#2196f3',
  STATE: '#4caf50',
  LINK: '#757575',
  FLAG: '#2196f3',
  LABEL: '#ffffff',
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
  BAR: 10,
  STATE: 30,
  SELECTED: 50,
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
