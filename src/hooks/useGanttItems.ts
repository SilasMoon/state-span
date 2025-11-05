import { useCallback } from "react";
import { GanttData, GanttTask, GanttState } from "@/types/gantt";
import { DEFAULT_COLORS } from "@/lib/ganttConstants";

interface UseGanttItemsProps {
  data: GanttData;
  updateData: (updater: (prev: GanttData) => GanttData) => void;
  generateId: () => string;
}

// Helper to find the last created task across all swimlanes
const getLastTaskColor = (data: GanttData): string => {
  let lastTask: GanttTask | null = null;

  Object.values(data.swimlanes).forEach((swimlane) => {
    if (swimlane.tasks && swimlane.tasks.length > 0) {
      const lastInSwimlane = swimlane.tasks[swimlane.tasks.length - 1];
      if (!lastTask || lastInSwimlane.id > lastTask.id) {
        lastTask = lastInSwimlane;
      }
    }
  });

  return lastTask?.color || DEFAULT_COLORS.TASK;
};

// Helper to find the last created state across all swimlanes
const getLastStateColor = (data: GanttData): string => {
  let lastState: GanttState | null = null;

  Object.values(data.swimlanes).forEach((swimlane) => {
    if (swimlane.states && swimlane.states.length > 0) {
      const lastInSwimlane = swimlane.states[swimlane.states.length - 1];
      if (!lastState || lastInSwimlane.id > lastState.id) {
        lastState = lastInSwimlane;
      }
    }
  });

  return lastState?.color || DEFAULT_COLORS.STATE;
};

export const useGanttItems = ({ data, updateData, generateId }: UseGanttItemsProps) => {
  // Task operations
  const addTask = useCallback((swimlaneId: string, start: number, duration: number) => {
    const id = generateId();
    const task: GanttTask = {
      id,
      start,
      duration,
      color: getLastTaskColor(data),
      labelColor: DEFAULT_COLORS.LABEL,
    };

    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [swimlaneId]: {
          ...prev.swimlanes[swimlaneId],
          tasks: [...(prev.swimlanes[swimlaneId].tasks || []), task],
        },
      },
    }));

    return id;
  }, [data, updateData, generateId]);

  const updateTask = useCallback((swimlaneId: string, taskId: string, updates: Partial<GanttTask>) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [swimlaneId]: {
          ...prev.swimlanes[swimlaneId],
          tasks: prev.swimlanes[swimlaneId].tasks?.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
        },
      },
    }));
  }, [updateData]);

  const deleteTask = useCallback((swimlaneId: string, taskId: string) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [swimlaneId]: {
          ...prev.swimlanes[swimlaneId],
          tasks: prev.swimlanes[swimlaneId].tasks?.filter((task) => task.id !== taskId),
        },
      },
      links: prev.links.filter(
        (link) =>
          !(link.fromSwimlaneId === swimlaneId && link.fromId === taskId) &&
          !(link.toSwimlaneId === swimlaneId && link.toId === taskId)
      ),
    }));
  }, [updateData]);

  const moveTask = useCallback((fromSwimlaneId: string, taskId: string, toSwimlaneId: string, newStart: number) => {
    updateData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];

      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "task") {
        return prev;
      }

      const task = fromSwimlane.tasks?.find((a) => a.id === taskId);
      if (!task) return prev;

      const movedTask = { ...task, start: newStart };
      
      let newData: GanttData;
      
      if (fromSwimlaneId === toSwimlaneId) {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [fromSwimlaneId]: {
              ...fromSwimlane,
              tasks: fromSwimlane.tasks?.map((a) =>
                a.id === taskId ? movedTask : a
              ),
            },
          },
        };
      } else {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [fromSwimlaneId]: {
              ...fromSwimlane,
              tasks: fromSwimlane.tasks?.filter((a) => a.id !== taskId),
            },
            [toSwimlaneId]: {
              ...toSwimlane,
              tasks: [...(toSwimlane.tasks || []), movedTask],
            },
          },
        };
        
        newData.links = newData.links.map(link => {
          const needsUpdate = 
            (link.fromSwimlaneId === fromSwimlaneId && link.fromId === taskId) ||
            (link.toSwimlaneId === fromSwimlaneId && link.toId === taskId);
          
          if (!needsUpdate) return link;
          
          return {
            ...link,
            fromSwimlaneId: link.fromId === taskId ? toSwimlaneId : link.fromSwimlaneId,
            toSwimlaneId: link.toId === taskId ? toSwimlaneId : link.toSwimlaneId,
          };
        });
      }
      
      return newData;
    });
  }, [updateData]);

  // State operations
  const addState = useCallback((swimlaneId: string, start: number, duration: number) => {
    const id = generateId();
    const state: GanttState = {
      id,
      start,
      duration,
      color: getLastStateColor(data),
      labelColor: DEFAULT_COLORS.LABEL,
    };

    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [swimlaneId]: {
          ...prev.swimlanes[swimlaneId],
          states: [...(prev.swimlanes[swimlaneId].states || []), state],
        },
      },
    }));

    return id;
  }, [data, updateData, generateId]);

  const updateState = useCallback((swimlaneId: string, stateId: string, updates: Partial<GanttState>) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [swimlaneId]: {
          ...prev.swimlanes[swimlaneId],
          states: prev.swimlanes[swimlaneId].states?.map((state) =>
            state.id === stateId ? { ...state, ...updates } : state
          ),
        },
      },
    }));
  }, [updateData]);

  const deleteState = useCallback((swimlaneId: string, stateId: string) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [swimlaneId]: {
          ...prev.swimlanes[swimlaneId],
          states: prev.swimlanes[swimlaneId].states?.filter((state) => state.id !== stateId),
        },
      },
      links: prev.links.filter(
        (link) =>
          !(link.fromSwimlaneId === swimlaneId && link.fromId === stateId) &&
          !(link.toSwimlaneId === swimlaneId && link.toId === stateId)
      ),
    }));
  }, [updateData]);

  const moveState = useCallback((fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => {
    updateData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];

      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "state") {
        return prev;
      }

      const state = fromSwimlane.states?.find((s) => s.id === stateId);
      if (!state) return prev;

      const movedState = { ...state, start: newStart };
      
      let newData: GanttData;
      
      if (fromSwimlaneId === toSwimlaneId) {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [fromSwimlaneId]: {
              ...fromSwimlane,
              states: fromSwimlane.states?.map((s) =>
                s.id === stateId ? movedState : s
              ),
            },
          },
        };
      } else {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [fromSwimlaneId]: {
              ...fromSwimlane,
              states: fromSwimlane.states?.filter((s) => s.id !== stateId),
            },
            [toSwimlaneId]: {
              ...toSwimlane,
              states: [...(toSwimlane.states || []), movedState],
            },
          },
        };
        
        newData.links = newData.links.map(link => {
          const needsUpdate = 
            (link.fromSwimlaneId === fromSwimlaneId && link.fromId === stateId) ||
            (link.toSwimlaneId === fromSwimlaneId && link.toId === stateId);
          
          if (!needsUpdate) return link;
          
          return {
            ...link,
            fromSwimlaneId: link.fromId === stateId ? toSwimlaneId : link.fromSwimlaneId,
            toSwimlaneId: link.toId === stateId ? toSwimlaneId : link.toSwimlaneId,
          };
        });
      }
      
      return newData;
    });
  }, [updateData]);

  return {
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addState,
    updateState,
    deleteState,
    moveState,
  };
};
