export type SwimlaneType = "task" | "state";

// Unified zoom configuration for 11-level system
// All levels use 40px column width by default
export interface ZoomConfig {
  level: number; // 1-11
  hoursPerColumn: number; // Time increment per column
  columnWidth: number; // Pixel width (default 40px)
  label: string; // Display label (e.g., "L1: 1 day")
  showDays: boolean; // Show days row
  showHours: boolean; // Show hours row
  showMinutes: boolean; // Show minutes row
}

export interface GanttState {
  id: string;
  start: number; // hours from 0
  duration: number; // hours
  color: string;
  label?: string;
  labelColor?: string;
  description?: string;
}

export interface GanttTask {
  id: string;
  start: number; // hours from 0
  duration: number; // hours
  color: string;
  label?: string;
  labelColor?: string;
  description?: string;
}

export interface GanttLink {
  id: string;
  fromId: string;
  toId: string;
  fromSwimlaneId: string;
  toSwimlaneId: string;
  fromHandle?: 'start' | 'finish'; // Which side of the source bar
  toHandle?: 'start' | 'finish'; // Which side of the target bar
  color?: string;
  label?: string;
  labelOffset?: { x: number; y: number }; // Manual offset for label position relative to default center
  customPath?: { x: number; y: number }[]; // Custom path points for manual routing
}

export interface GanttFlag {
  id: string;
  position: number; // hours from 0
  label: string;
  color: string;
  textColor?: string; // Color for the label text (defaults to white)
  iconColor?: string; // Color for the icon (defaults to white)
  icon?: string; // Lucide icon name
  swimlane?: "top" | "bottom"; // Which flag row (defaults to "top" for backward compatibility)
  description?: string;
}

export interface GanttSwimlane {
  id: string;
  name: string;
  type: SwimlaneType;
  parentId?: string;
  children: string[];
  expanded: boolean;
  tasks?: GanttTask[];
  states?: GanttState[];
}

export interface GanttData {
  swimlanes: Record<string, GanttSwimlane>;
  rootIds: string[];
  links: GanttLink[];
  flags: GanttFlag[];
}

export interface GanttConfig {
  columnWidths: number[]; // 13 values for each zoom level
  gridOpacity: number; // 1.0 - 2.0 (100% - 200%)
  timescaleContrast: number; // 1.0 - 2.0 (100% - 200%)
}

// 13-level zoom system with 40px columns
// L1: Only days, L2-L3: Only days (multi-day), L4-L8: Days + hours, L9-L13: Days + hours + minutes
export const ZOOM_LEVELS: ZoomConfig[] = [
  // L1: 1 day per column - show only days
  { level: 1, hoursPerColumn: 24, columnWidth: 40, label: "L1: 1 day", showDays: true, showHours: false, showMinutes: false },

  // L2: 2 days per column - show only days
  { level: 2, hoursPerColumn: 48, columnWidth: 40, label: "L2: 2 days", showDays: true, showHours: false, showMinutes: false },

  // L3: 4 days per column - show only days
  { level: 3, hoursPerColumn: 96, columnWidth: 40, label: "L3: 4 days", showDays: true, showHours: false, showMinutes: false },

  // L4: 12 hours per column - show days + hours
  { level: 4, hoursPerColumn: 12, columnWidth: 40, label: "L4: 12 hours", showDays: true, showHours: true, showMinutes: false },

  // L5: 6 hours per column - show days + hours
  { level: 5, hoursPerColumn: 6, columnWidth: 40, label: "L5: 6 hours", showDays: true, showHours: true, showMinutes: false },

  // L6: 4 hours per column - show days + hours
  { level: 6, hoursPerColumn: 4, columnWidth: 40, label: "L6: 4 hours", showDays: true, showHours: true, showMinutes: false },

  // L7: 2 hours per column - show days + hours
  { level: 7, hoursPerColumn: 2, columnWidth: 40, label: "L7: 2 hours", showDays: true, showHours: true, showMinutes: false },

  // L8: 1 hour per column - show days + hours
  { level: 8, hoursPerColumn: 1, columnWidth: 40, label: "L8: 1 hour", showDays: true, showHours: true, showMinutes: false },

  // L9: 30 minutes per column - show days + hours + minutes
  { level: 9, hoursPerColumn: 0.5, columnWidth: 40, label: "L9: 30 minutes", showDays: true, showHours: true, showMinutes: true },

  // L10: 15 minutes per column - show days + hours + minutes
  { level: 10, hoursPerColumn: 0.25, columnWidth: 40, label: "L10: 15 minutes", showDays: true, showHours: true, showMinutes: true },

  // L11: 10 minutes per column - show days + hours + minutes
  { level: 11, hoursPerColumn: 10/60, columnWidth: 40, label: "L11: 10 minutes", showDays: true, showHours: true, showMinutes: true },

  // L12: 5 minutes per column - show days + hours + minutes
  { level: 12, hoursPerColumn: 5/60, columnWidth: 40, label: "L12: 5 minutes", showDays: true, showHours: true, showMinutes: true },

  // L13: 1 minute per column - show days + hours + minutes
  { level: 13, hoursPerColumn: 1/60, columnWidth: 40, label: "L13: 1 minute", showDays: true, showHours: true, showMinutes: true },
];

// Default zoom level (L8: 1 hour at 40px)
export const DEFAULT_ZOOM_LEVEL = 8;

// Helper function to get zoom config by level (1-13)
export function getZoomConfig(level: number): ZoomConfig {
  const index = level - 1; // Convert 1-based to 0-based index
  if (index < 0 || index >= ZOOM_LEVELS.length) {
    return ZOOM_LEVELS[DEFAULT_ZOOM_LEVEL - 1];
  }
  return ZOOM_LEVELS[index];
}
