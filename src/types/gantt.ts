export type SwimlaneType = "task" | "state";

// Granularity configuration (time per column)
export interface GranularityConfig {
  hoursPerColumn: number;
  label: string;
}

// Zoom configuration (pixel width per column)
export interface ZoomLevel {
  columnWidth: number;
  label: string;
}

// Combined configuration used throughout the app
export interface ZoomConfig {
  hoursPerColumn: number;
  columnWidth: number;
  granularityLabel: string;
  zoomLabel: string;
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

// Granularity levels: 24h, 12h, 6h, 2h, 1h, 30min, 10min
export const GRANULARITY_LEVELS: GranularityConfig[] = [
  { hoursPerColumn: 24, label: "24h" },
  { hoursPerColumn: 12, label: "12h" },
  { hoursPerColumn: 6, label: "6h" },
  { hoursPerColumn: 2, label: "2h" },
  { hoursPerColumn: 1, label: "1h" },
  { hoursPerColumn: 0.5, label: "30min" },
  { hoursPerColumn: 1/6, label: "10min" },  // 0.166... hours = 10 minutes
];

// Zoom levels: control pixel width of columns
export const ZOOM_LEVELS: ZoomLevel[] = [
  { columnWidth: 200, label: "200%" },
  { columnWidth: 150, label: "150%" },
  { columnWidth: 120, label: "120%" },
  { columnWidth: 100, label: "100%" },
  { columnWidth: 80, label: "80%" },
  { columnWidth: 60, label: "60%" },
  { columnWidth: 40, label: "40%" },
  { columnWidth: 30, label: "30%" },
  { columnWidth: 20, label: "20%" },
];

// Default indices
export const DEFAULT_GRANULARITY_INDEX = 4; // 1h
export const DEFAULT_ZOOM_INDEX = 3; // 100%

// Helper function to create combined ZoomConfig
export function createZoomConfig(granularityIndex: number, zoomIndex: number): ZoomConfig {
  const granularity = GRANULARITY_LEVELS[granularityIndex];
  const zoom = ZOOM_LEVELS[zoomIndex];

  return {
    hoursPerColumn: granularity.hoursPerColumn,
    columnWidth: zoom.columnWidth,
    granularityLabel: granularity.label,
    zoomLabel: zoom.label,
  };
}
