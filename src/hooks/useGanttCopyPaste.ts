import { useState, useEffect } from "react";
import { GanttData } from "@/types/gantt";
import { toast } from "sonner";

interface CopiedItem {
  type: "task" | "state";
  swimlaneId: string;
  itemId: string;
  color: string;
  label: string;
  labelColor: string;
  description: string;
  duration: number;
}

interface CopyGhost {
  mouseX: number;
  mouseY: number;
  duration: number;
  color: string;
  label: string;
  labelColor: string;
}

interface UseGanttCopyPasteParams {
  data: GanttData;
  addTask: (swimlaneId: string, start: number, duration: number) => string;
  addState: (swimlaneId: string, start: number, duration: number) => string;
  updateTask: (swimlaneId: string, taskId: string, updates: any) => void;
  updateState: (swimlaneId: string, stateId: string, updates: any) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
  zoomHoursPerColumn: number;
  zoomColumnWidth: number;
  swimlaneColumnWidth: number;
}

export const useGanttCopyPaste = ({
  data,
  addTask,
  addState,
  updateTask,
  updateState,
  checkOverlap,
  zoomHoursPerColumn,
  zoomColumnWidth,
  swimlaneColumnWidth,
}: UseGanttCopyPasteParams) => {
  const [copiedItem, setCopiedItem] = useState<CopiedItem | null>(null);
  const [copyGhost, setCopyGhost] = useState<CopyGhost | null>(null);

  // Track mouse movement for copy ghost
  useEffect(() => {
    if (!copiedItem) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCopyGhost({
        mouseX: e.clientX,
        mouseY: e.clientY,
        duration: copiedItem.duration,
        color: copiedItem.color,
        label: copiedItem.label,
        labelColor: copiedItem.labelColor,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [copiedItem]);

  const handleCopy = (selected: { type: string; swimlaneId: string; itemId?: string } | null) => {
    if (selected && selected.type !== 'swimlane' && selected.itemId) {
      const swimlane = data.swimlanes[selected.swimlaneId];
      if (!swimlane) return;
      
      const item = selected.type === 'task' 
        ? swimlane.tasks?.find(a => a.id === selected.itemId)
        : swimlane.states?.find(s => s.id === selected.itemId);
      
      if (item) {
        setCopiedItem({
          type: selected.type as "task" | "state",
          swimlaneId: selected.swimlaneId,
          itemId: selected.itemId,
          color: item.color,
          label: item.label || "",
          labelColor: item.labelColor || "#000000",
          description: item.description || "",
          duration: item.duration,
        });
        toast.success("Item copied - move mouse and click or press Ctrl+V to paste");
      }
    }
  };

  const handlePaste = () => {
    if (!copiedItem || !copyGhost) return;

    const element = document.elementFromPoint(copyGhost.mouseX, copyGhost.mouseY);
    const rowElement = element?.closest('[data-swimlane-id]');
    
    if (!rowElement) {
      toast.error("Position cursor over a swimlane to paste");
      return;
    }

    const targetSwimlaneId = rowElement.getAttribute('data-swimlane-id');
    if (!targetSwimlaneId) return;

    const targetSwimlane = data.swimlanes[targetSwimlaneId];
    if (!targetSwimlane) return;

    if (copiedItem.type === 'task' && targetSwimlane.type !== 'task') {
      toast.error("Can only paste tasks to task swimlanes");
      return;
    }
    if (copiedItem.type === 'state' && targetSwimlane.type !== 'state') {
      toast.error("Can only paste states to state swimlanes");
      return;
    }

    const scrollContainer = document.querySelector('.overflow-auto');
    const scrollLeft = scrollContainer?.scrollLeft || 0;
    
    const gridX = copyGhost.mouseX + scrollLeft - swimlaneColumnWidth;
    const start = Math.max(0, Math.round((gridX / zoomColumnWidth) * zoomHoursPerColumn / zoomHoursPerColumn) * zoomHoursPerColumn);

    if (checkOverlap(targetSwimlaneId, '', start, copiedItem.duration)) {
      toast.error("Cannot paste here - overlaps with existing item");
      return;
    }

    if (copiedItem.type === 'task') {
      const newTaskId = addTask(targetSwimlaneId, start, copiedItem.duration);
      updateTask(targetSwimlaneId, newTaskId, {
        color: copiedItem.color,
        label: copiedItem.label,
        labelColor: copiedItem.labelColor,
        description: copiedItem.description,
      });
      toast.success("Task pasted");
    } else {
      const newStateId = addState(targetSwimlaneId, start, copiedItem.duration);
      updateState(targetSwimlaneId, newStateId, {
        color: copiedItem.color,
        label: copiedItem.label,
        labelColor: copiedItem.labelColor,
        description: copiedItem.description,
      });
      toast.success("State pasted");
    }

    setCopiedItem(null);
    setCopyGhost(null);
  };

  const cancelCopy = () => {
    setCopiedItem(null);
    setCopyGhost(null);
    toast.info("Copy cancelled");
  };

  return {
    copiedItem,
    copyGhost,
    handleCopy,
    handlePaste,
    cancelCopy,
  };
};
