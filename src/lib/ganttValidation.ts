import { z } from 'zod';
import type { GanttData } from '@/types/gantt';

// Hex color validation regex
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

// Base validation for common fields with security limits
const ganttStateSchema = z.object({
  id: z.string().min(1).max(100),
  start: z.number().min(0).max(100000),
  duration: z.number().min(0).max(100000),
  color: z.string().regex(hexColorRegex, "Invalid hex color format"),
  label: z.string().max(200).optional(),
  labelColor: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
  description: z.string().max(2000).optional(),
});

const ganttTaskSchema = z.object({
  id: z.string().min(1).max(100),
  start: z.number().min(0).max(100000),
  duration: z.number().min(0).max(100000),
  color: z.string().regex(hexColorRegex, "Invalid hex color format"),
  label: z.string().max(200).optional(),
  labelColor: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
  description: z.string().max(2000).optional(),
});

const ganttLinkSchema = z.object({
  id: z.string().min(1).max(100),
  fromId: z.string().min(1).max(100),
  toId: z.string().min(1).max(100),
  fromSwimlaneId: z.string().min(1).max(100),
  toSwimlaneId: z.string().min(1).max(100),
  color: z.string().regex(hexColorRegex, "Invalid hex color format").optional(),
  label: z.string().max(200).optional(),
});

const ganttFlagSchema = z.object({
  id: z.string().min(1).max(100),
  position: z.number().min(0).max(100000),
  label: z.string().min(1).max(200),
  color: z.string().regex(hexColorRegex, "Invalid hex color format"),
  icon: z.string().max(50).optional(),
  swimlane: z.enum(["top", "bottom"]).optional(),
});

const ganttSwimlaneSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  type: z.enum(["task", "state"]),
  parentId: z.string().max(100).optional(),
  children: z.array(z.string().max(100)).max(1000),
  expanded: z.boolean(),
  tasks: z.array(ganttTaskSchema).max(10000).optional(),
  states: z.array(ganttStateSchema).max(10000).optional(),
});

export const ganttDataSchema = z.object({
  swimlanes: z.record(z.string().max(100), ganttSwimlaneSchema).refine(
    (swimlanes) => Object.keys(swimlanes).length <= 1000,
    "Too many swimlanes (max 1000)"
  ),
  rootIds: z.array(z.string().max(100)).max(1000),
  links: z.array(ganttLinkSchema).max(10000),
  flags: z.array(ganttFlagSchema).max(1000),
}) as z.ZodType<GanttData>;
