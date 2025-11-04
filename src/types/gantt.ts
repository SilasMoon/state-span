export type SwimlaneType = "task" | "state";

// Unified zoom configuration for 16-level system
// Odd levels define granularity with base 80px width
// Even levels double the width (160px) while maintaining same granularity
export interface ZoomConfig {
  level: number; // 1-16
  hoursPerColumn: number; // Time increment for Row 2 granularity
  columnWidth: number; // Pixel width (80px for odd, 160px for even)
  label: string; // Display label (e.g., "L5: 6h")
  row1Unit: "day" | "hour"; // Context unit for Row 1
  row2Increment: number | null; // Hours for Row 2 granularity (null for L1-L2)
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
  color?: string;
  label?: string;
}

export interface GanttFlag {
  id: string;
  position: number; // hours from 0
  label: string;
  color: string;
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

// 16-level unified zoom system
// Odd levels (L1, L3, L5, etc.): Define granularity with base 80px width
// Even levels (L2, L4, L6, etc.): Same granularity as previous level, double width (160px)
export const ZOOM_LEVELS: ZoomConfig[] = [
  // L1-L2: Day only (no Row 2)
  { level: 1, hoursPerColumn: 24, columnWidth: 80, label: "L1: Day", row1Unit: "day", row2Increment: null },
  { level: 2, hoursPerColumn: 24, columnWidth: 160, label: "L2: Day (x2)", row1Unit: "day", row2Increment: null },

  // L3-L4: 12-hour increments
  { level: 3, hoursPerColumn: 12, columnWidth: 80, label: "L3: 12h", row1Unit: "day", row2Increment: 12 },
  { level: 4, hoursPerColumn: 12, columnWidth: 160, label: "L4: 12h (x2)", row1Unit: "day", row2Increment: 12 },

  // L5-L6: 6-hour increments
  { level: 5, hoursPerColumn: 6, columnWidth: 80, label: "L5: 6h", row1Unit: "day", row2Increment: 6 },
  { level: 6, hoursPerColumn: 6, columnWidth: 160, label: "L6: 6h (x2)", row1Unit: "day", row2Increment: 6 },

  // L7-L8: 2-hour increments
  { level: 7, hoursPerColumn: 2, columnWidth: 80, label: "L7: 2h", row1Unit: "day", row2Increment: 2 },
  { level: 8, hoursPerColumn: 2, columnWidth: 160, label: "L8: 2h (x2)", row1Unit: "day", row2Increment: 2 },

  // L9-L10: 1-hour increments
  { level: 9, hoursPerColumn: 1, columnWidth: 80, label: "L9: 1h", row1Unit: "day", row2Increment: 1 },
  { level: 10, hoursPerColumn: 1, columnWidth: 160, label: "L10: 1h (x2)", row1Unit: "day", row2Increment: 1 },

  // L11-L12: 30-minute increments
  { level: 11, hoursPerColumn: 0.5, columnWidth: 80, label: "L11: 30min", row1Unit: "hour", row2Increment: 0.5 },
  { level: 12, hoursPerColumn: 0.5, columnWidth: 160, label: "L12: 30min (x2)", row1Unit: "hour", row2Increment: 0.5 },

  // L13-L14: 15-minute increments
  { level: 13, hoursPerColumn: 0.25, columnWidth: 80, label: "L13: 15min", row1Unit: "hour", row2Increment: 0.25 },
  { level: 14, hoursPerColumn: 0.25, columnWidth: 160, label: "L14: 15min (x2)", row1Unit: "hour", row2Increment: 0.25 },

  // L15-L16: 5-minute increments
  { level: 15, hoursPerColumn: 5/60, columnWidth: 80, label: "L15: 5min", row1Unit: "hour", row2Increment: 5/60 },
  { level: 16, hoursPerColumn: 5/60, columnWidth: 160, label: "L16: 5min (x2)", row1Unit: "hour", row2Increment: 5/60 },
];

// Default zoom level (L9: 1h at 80px)
export const DEFAULT_ZOOM_LEVEL = 9;

// Helper function to get zoom config by level (1-16)
export function getZoomConfig(level: number): ZoomConfig {
  const index = level - 1; // Convert 1-based to 0-based index
  if (index < 0 || index >= ZOOM_LEVELS.length) {
    return ZOOM_LEVELS[DEFAULT_ZOOM_LEVEL - 1];
  }
  return ZOOM_LEVELS[index];
}
