export type SwimlaneType = "task" | "state";

export interface ZoomConfig {
  hoursPerColumn: number;
  columnWidth: number;
  label: string;
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

export const ZOOM_LEVELS: ZoomConfig[] = [
  { hoursPerColumn: 0.5, columnWidth: 48, label: "0.5h" },
  { hoursPerColumn: 0.5, columnWidth: 40, label: "0.5h" },
  { hoursPerColumn: 0.5, columnWidth: 32, label: "0.5h" },
  { hoursPerColumn: 0.5, columnWidth: 24, label: "0.5h" },
  { hoursPerColumn: 1, columnWidth: 44, label: "1h" },
  { hoursPerColumn: 1, columnWidth: 36, label: "1h" },
  { hoursPerColumn: 1, columnWidth: 28, label: "1h" },
  { hoursPerColumn: 1, columnWidth: 20, label: "1h" },
  { hoursPerColumn: 2, columnWidth: 64, label: "2h" },
  { hoursPerColumn: 2, columnWidth: 52, label: "2h" },
  { hoursPerColumn: 2, columnWidth: 40, label: "2h" },
  { hoursPerColumn: 2, columnWidth: 28, label: "2h" },
  { hoursPerColumn: 4, columnWidth: 84, label: "4h" },
  { hoursPerColumn: 4, columnWidth: 68, label: "4h" },
  { hoursPerColumn: 4, columnWidth: 52, label: "4h" },
  { hoursPerColumn: 4, columnWidth: 36, label: "4h" },
  { hoursPerColumn: 8, columnWidth: 104, label: "8h" },
  { hoursPerColumn: 8, columnWidth: 84, label: "8h" },
  { hoursPerColumn: 8, columnWidth: 64, label: "8h" },
  { hoursPerColumn: 8, columnWidth: 44, label: "8h" },
  { hoursPerColumn: 12, columnWidth: 124, label: "12h" },
  { hoursPerColumn: 12, columnWidth: 100, label: "12h" },
  { hoursPerColumn: 12, columnWidth: 76, label: "12h" },
  { hoursPerColumn: 12, columnWidth: 52, label: "12h" },
  { hoursPerColumn: 24, columnWidth: 150, label: "1d" },
  { hoursPerColumn: 24, columnWidth: 120, label: "1d" },
  { hoursPerColumn: 24, columnWidth: 90, label: "1d" },
  { hoursPerColumn: 24, columnWidth: 60, label: "1d" },
];
