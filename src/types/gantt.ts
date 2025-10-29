export type SwimlaneType = "activity" | "state";

export interface GanttState {
  id: string;
  start: number; // hours from 0
  duration: number; // hours
  color: string;
  description?: string;
}

export interface GanttActivity {
  id: string;
  start: number; // hours from 0
  duration: number; // hours
  color: string;
  description?: string;
}

export interface GanttLink {
  id: string;
  fromId: string;
  toId: string;
  fromSwimlaneId: string;
  toSwimlaneId: string;
  color?: string;
}

export interface GanttSwimlane {
  id: string;
  name: string;
  type: SwimlaneType;
  parentId?: string;
  children: string[];
  expanded: boolean;
  activities?: GanttActivity[];
  states?: GanttState[];
}

export interface GanttData {
  swimlanes: Record<string, GanttSwimlane>;
  rootIds: string[];
  links: GanttLink[];
}

export type ZoomLevel = 1 | 2 | 4 | 8 | 12 | 24; // hours per column
