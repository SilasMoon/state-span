import { useState } from "react";
import { GanttData, GanttSwimlane, GanttActivity, GanttState, GanttLink, ZoomLevel } from "@/types/gantt";

let nextId = 1;
const generateId = () => `item-${nextId++}`;

const createDefaultData = (): GanttData => {
  const activityLane: GanttSwimlane = {
    id: generateId(),
    name: "Planning Phase",
    type: "activity",
    parentId: undefined,
    children: [],
    expanded: true,
    activities: [
      { id: generateId(), start: 8, duration: 16, color: "#00bcd4", label: "Planning", labelColor: "#000000", description: "Initial planning" },
      { id: generateId(), start: 32, duration: 24, color: "#4caf50", label: "Design", labelColor: "#000000", description: "Design phase" },
    ],
  };

  const stateLane: GanttSwimlane = {
    id: generateId(),
    name: "Project Status",
    type: "state",
    parentId: undefined,
    children: [],
    expanded: true,
    states: [
      { id: generateId(), start: 0, duration: 24, color: "#ff9800", label: "Review", labelColor: "#000000", description: "In Review" },
      { id: generateId(), start: 24, duration: 40, color: "#4caf50", label: "Approved", labelColor: "#000000", description: "Approved" },
    ],
  };

  return {
    swimlanes: {
      [activityLane.id]: activityLane,
      [stateLane.id]: stateLane,
    },
    rootIds: [activityLane.id, stateLane.id],
    links: [],
  };
};

export const useGanttData = () => {
  const [data, setData] = useState<GanttData>(createDefaultData());
  const [zoom, setZoom] = useState<ZoomLevel>(8);
  const [history, setHistory] = useState<GanttData[]>([]);
  const [future, setFuture] = useState<GanttData[]>([]);

  // Wrapper to track history when data changes
  const updateData = (updater: (prev: GanttData) => GanttData) => {
    setData((prev) => {
      const next = updater(prev);
      if (next !== prev) {
        setHistory((h) => [...h, prev].slice(-50)); // Keep last 50 states
        setFuture([]); // Clear redo stack when new action is made
      }
      return next;
    });
  };

  const undo = () => {
    if (history.length === 0) return;
    
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [data, ...f].slice(0, 50));
    setData(previous);
  };

  const redo = () => {
    if (future.length === 0) return;
    
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, data].slice(-50));
    setData(next);
  };

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  // Helper function to calculate summary bar from children
  const calculateSummaryBar = (swimlaneId: string, swimlanes: Record<string, GanttSwimlane>): { start: number; duration: number; hasContent: boolean } | null => {
    const swimlane = swimlanes[swimlaneId];
    if (!swimlane) return null;

    let minStart = Infinity;
    let maxEnd = -Infinity;
    let hasContent = false;

    const collectItems = (id: string) => {
      const lane = swimlanes[id];
      if (!lane) return;

      // Collect from direct items
      const items = lane.type === "activity" ? lane.activities : lane.states;
      if (items && items.length > 0) {
        items.forEach((item) => {
          hasContent = true;
          minStart = Math.min(minStart, item.start);
          maxEnd = Math.max(maxEnd, item.start + item.duration);
        });
      }

      // Recursively collect from children
      lane.children.forEach(collectItems);
    };

    // Collect from all children
    swimlane.children.forEach(collectItems);

    if (!hasContent) return null;

    return {
      start: minStart,
      duration: maxEnd - minStart,
      hasContent: true,
    };
  };

  const addSwimlane = (type: "activity" | "state", parentId?: string) => {
    const id = generateId();
    const newSwimlane: GanttSwimlane = {
      id,
      name: type === "activity" ? "New Activity Lane" : "New State Lane",
      type,
      parentId,
      children: [],
      expanded: true,
      activities: type === "activity" ? [] : undefined,
      states: type === "state" ? [] : undefined,
    };

    updateData((prev) => {
      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes, [id]: newSwimlane };

      if (parentId) {
        const parent = newData.swimlanes[parentId];
        // Clear parent's activities/states when adding a child
        newData.swimlanes[parentId] = {
          ...parent,
          children: [...parent.children, id],
          activities: parent.type === "activity" ? [] : parent.activities,
          states: parent.type === "state" ? [] : parent.states,
        };
      } else {
        newData.rootIds = [...prev.rootIds, id];
      }

      return newData;
    });

    return id;
  };

  const deleteSwimlane = (id: string) => {
    updateData((prev) => {
      const newData = { ...prev };
      const swimlane = newData.swimlanes[id];
      if (!swimlane) return prev;

      // Delete all children recursively
      const deleteRecursive = (swimlaneId: string) => {
        const lane = newData.swimlanes[swimlaneId];
        if (!lane) return;
        
        lane.children.forEach(deleteRecursive);
        delete newData.swimlanes[swimlaneId];
      };

      swimlane.children.forEach(deleteRecursive);

      // Remove from parent or root
      if (swimlane.parentId) {
        const parent = newData.swimlanes[swimlane.parentId];
        newData.swimlanes[swimlane.parentId] = {
          ...parent,
          children: parent.children.filter((childId) => childId !== id),
        };
      } else {
        newData.rootIds = newData.rootIds.filter((rootId) => rootId !== id);
      }

      // Remove links associated with this swimlane
      newData.links = newData.links.filter(
        (link) => link.fromSwimlaneId !== id && link.toSwimlaneId !== id
      );

      delete newData.swimlanes[id];
      return newData;
    });
  };

  const toggleExpanded = (id: string) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [id]: {
          ...prev.swimlanes[id],
          expanded: !prev.swimlanes[id].expanded,
        },
      },
    }));
  };

  const addActivity = (swimlaneId: string, start: number, duration: number) => {
    const id = generateId();
    const activity: GanttActivity = {
      id,
      start,
      duration,
      color: "#00bcd4",
      label: "",
      labelColor: "#000000",
      description: "",
    };

    setData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || swimlane.type !== "activity") return prev;
      
      // Prevent adding activities to parent swimlanes
      if (swimlane.children.length > 0) {
        console.warn("Cannot add activities to parent swimlanes");
        return prev;
      }

      return {
        ...prev,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            activities: [...(swimlane.activities || []), activity],
          },
        },
      };
    });

    return id;
  };

  const addState = (swimlaneId: string, start: number, duration: number) => {
    const id = generateId();
    const state: GanttState = {
      id,
      start,
      duration,
      color: "#ab47bc",
      label: "",
      labelColor: "#000000",
      description: "",
    };

    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || swimlane.type !== "state") return prev;
      
      // Prevent adding states to parent swimlanes
      if (swimlane.children.length > 0) {
        console.warn("Cannot add states to parent swimlanes");
        return prev;
      }

      return {
        ...prev,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            states: [...(swimlane.states || []), state],
          },
        },
      };
    });

    return id;
  };

  const updateActivity = (swimlaneId: string, activityId: string, updates: Partial<GanttActivity>) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.activities) return prev;

      // Get the old activity to calculate duration delta
      const oldActivity = swimlane.activities.find((act) => act.id === activityId);
      if (!oldActivity) return prev;

      const durationDelta = updates.duration !== undefined ? updates.duration - oldActivity.duration : 0;

      // Update the activity
      let newData = {
        ...prev,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            activities: swimlane.activities.map((act) =>
              act.id === activityId ? { ...act, ...updates } : act
            ),
          },
        },
      };

      // If duration changed, propagate to linked activities
      if (durationDelta !== 0) {
        newData = propagateDurationChange(newData, swimlaneId, activityId, durationDelta);
      }

      return newData;
    });
  };

  // Helper function to propagate duration changes through links
  const propagateDurationChange = (data: GanttData, fromSwimlaneId: string, fromItemId: string, durationDelta: number): GanttData => {
    // Find all links where this item is the source
    const affectedLinks = data.links.filter(link => 
      link.fromSwimlaneId === fromSwimlaneId && link.fromId === fromItemId
    );

    let newData = { ...data };

    affectedLinks.forEach(link => {
      // Only FS (Finish-to-Start) and FF (Finish-to-Finish) are affected by duration changes
      if (link.type === "FS" || link.type === "FF") {
        const toSwimlane = newData.swimlanes[link.toSwimlaneId];
        if (!toSwimlane) return;

        // Update the target activity/state
        if (toSwimlane.activities) {
          newData.swimlanes[link.toSwimlaneId] = {
            ...toSwimlane,
            activities: toSwimlane.activities.map(act => 
              act.id === link.toId 
                ? { ...act, start: act.start + durationDelta }
                : act
            ),
          };

          // Recursively propagate to activities linked from this one
          newData = propagateDurationChange(newData, link.toSwimlaneId, link.toId, durationDelta);
        } else if (toSwimlane.states) {
          newData.swimlanes[link.toSwimlaneId] = {
            ...toSwimlane,
            states: toSwimlane.states.map(state => 
              state.id === link.toId 
                ? { ...state, start: state.start + durationDelta }
                : state
            ),
          };

          // Recursively propagate to states linked from this one
          newData = propagateDurationChange(newData, link.toSwimlaneId, link.toId, durationDelta);
        }
      }
    });

    return newData;
  };

  const updateState = (swimlaneId: string, stateId: string, updates: Partial<GanttState>) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.states) return prev;

      // Get the old state to calculate duration delta
      const oldState = swimlane.states.find((st) => st.id === stateId);
      if (!oldState) return prev;

      const durationDelta = updates.duration !== undefined ? updates.duration - oldState.duration : 0;

      // Update the state
      let newData = {
        ...prev,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            states: swimlane.states.map((st) =>
              st.id === stateId ? { ...st, ...updates } : st
            ),
          },
        },
      };

      // If duration changed, propagate to linked items
      if (durationDelta !== 0) {
        newData = propagateDurationChange(newData, swimlaneId, stateId, durationDelta);
      }

      return newData;
    });
  };

  const deleteActivity = (swimlaneId: string, activityId: string) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.activities) return prev;

      // Remove links
      const newLinks = prev.links.filter(
        (link) => link.fromId !== activityId && link.toId !== activityId
      );

      return {
        ...prev,
        links: newLinks,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            activities: swimlane.activities.filter((act) => act.id !== activityId),
          },
        },
      };
    });
  };

  const deleteState = (swimlaneId: string, stateId: string) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.states) return prev;

      // Remove links
      const newLinks = prev.links.filter(
        (link) => link.fromId !== stateId && link.toId !== stateId
      );

      return {
        ...prev,
        links: newLinks,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            states: swimlane.states.filter((st) => st.id !== stateId),
          },
        },
      };
    });
  };

  const addLink = (fromSwimlaneId: string, fromId: string, toSwimlaneId: string, toId: string, type: "FS" | "SS" | "FF" | "SF" = "FS") => {
    const id = generateId();
    
    // Get source activity/state color
    let color = "#00bcd4"; // default
    const fromSwimlane = data.swimlanes[fromSwimlaneId];
    if (fromSwimlane) {
      const item = fromSwimlane.activities?.find((a) => a.id === fromId) || 
                   fromSwimlane.states?.find((s) => s.id === fromId);
      if (item) {
        color = item.color;
      }
    }
    
    const link: GanttLink = {
      id,
      fromId,
      toId,
      fromSwimlaneId,
      toSwimlaneId,
      type,
      color,
      label: "",
      lag: 0,
    };

    setData((prev) => ({
      ...prev,
      links: [...prev.links, link],
    }));

    return id;
  };

  const updateLink = (linkId: string, updates: Partial<GanttLink>) => {
    updateData((prev) => ({
      ...prev,
      links: prev.links.map((link) =>
        link.id === linkId ? { ...link, ...updates } : link
      ),
    }));
  };

  const deleteLink = (linkId: string) => {
    updateData((prev) => ({
      ...prev,
      links: prev.links.filter((link) => link.id !== linkId),
    }));
  };

  const moveActivity = (fromSwimlaneId: string, toSwimlaneId: string, activityId: string, newStart: number) => {
    updateData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];
      
      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "activity") return prev;
      
      const activity = fromSwimlane.activities?.find((a) => a.id === activityId);
      if (!activity) return prev;
      
      const positionDelta = newStart - activity.start;
      const movedActivity = { ...activity, start: newStart };
      
      let newData: GanttData;
      
      if (fromSwimlaneId === toSwimlaneId) {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [toSwimlaneId]: {
              ...toSwimlane,
              activities: toSwimlane.activities?.map((a) =>
                a.id === activityId ? movedActivity : a
              ),
            },
          },
        };
        
        // Propagate position change to linked activities (same swimlane)
        if (positionDelta !== 0) {
          newData = propagatePositionChange(newData, fromSwimlaneId, activityId, positionDelta);
        }
      } else {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [fromSwimlaneId]: {
              ...fromSwimlane,
              activities: fromSwimlane.activities?.filter((a) => a.id !== activityId),
            },
            [toSwimlaneId]: {
              ...toSwimlane,
              activities: [...(toSwimlane.activities || []), movedActivity],
            },
          },
        };
        
        // Update all links that reference this activity to use the new swimlane ID
        newData.links = newData.links.map(link => {
          const needsUpdate = 
            (link.fromSwimlaneId === fromSwimlaneId && link.fromId === activityId) ||
            (link.toSwimlaneId === fromSwimlaneId && link.toId === activityId);
          
          if (!needsUpdate) return link;
          
          return {
            ...link,
            fromSwimlaneId: link.fromId === activityId ? toSwimlaneId : link.fromSwimlaneId,
            toSwimlaneId: link.toId === activityId ? toSwimlaneId : link.toSwimlaneId,
          };
        });
        
        // Propagate position changes if any
        if (positionDelta !== 0) {
          newData = propagatePositionChange(newData, toSwimlaneId, activityId, positionDelta);
        }
      }
      
      return newData;
    });
  };

  // Helper function to propagate position changes through links
  const propagatePositionChange = (data: GanttData, fromSwimlaneId: string, fromItemId: string, positionDelta: number): GanttData => {
    // Find all links where this item is the source
    const affectedLinks = data.links.filter(link => 
      link.fromSwimlaneId === fromSwimlaneId && link.fromId === fromItemId
    );

    let newData = { ...data };

    affectedLinks.forEach(link => {
      const toSwimlane = newData.swimlanes[link.toSwimlaneId];
      if (!toSwimlane) return;

      // Update the target activity/state position
      if (toSwimlane.activities) {
        newData.swimlanes[link.toSwimlaneId] = {
          ...toSwimlane,
          activities: toSwimlane.activities.map(act => 
            act.id === link.toId 
              ? { ...act, start: act.start + positionDelta }
              : act
          ),
        };

        // Recursively propagate to activities linked from this one
        newData = propagatePositionChange(newData, link.toSwimlaneId, link.toId, positionDelta);
      } else if (toSwimlane.states) {
        newData.swimlanes[link.toSwimlaneId] = {
          ...toSwimlane,
          states: toSwimlane.states.map(state => 
            state.id === link.toId 
              ? { ...state, start: state.start + positionDelta }
              : state
          ),
        };

        // Recursively propagate to states linked from this one
        newData = propagatePositionChange(newData, link.toSwimlaneId, link.toId, positionDelta);
      }
    });

    return newData;
  };

  const moveState = (fromSwimlaneId: string, toSwimlaneId: string, stateId: string, newStart: number) => {
    updateData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];
      
      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "state") return prev;
      
      const state = fromSwimlane.states?.find((s) => s.id === stateId);
      if (!state) return prev;
      
      const positionDelta = newStart - state.start;
      const movedState = { ...state, start: newStart };
      
      let newData: GanttData;
      
      if (fromSwimlaneId === toSwimlaneId) {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [toSwimlaneId]: {
              ...toSwimlane,
              states: toSwimlane.states?.map((s) =>
                s.id === stateId ? movedState : s
              ),
            },
          },
        };
        
        // Propagate position change to linked states (same swimlane)
        if (positionDelta !== 0) {
          newData = propagatePositionChange(newData, fromSwimlaneId, stateId, positionDelta);
        }
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
        
        // Update all links that reference this state to use the new swimlane ID
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
        
        // Propagate position changes if any
        if (positionDelta !== 0) {
          newData = propagatePositionChange(newData, toSwimlaneId, stateId, positionDelta);
        }
      }
      
      return newData;
    });
  };

  const updateSwimlane = (id: string, updates: Partial<GanttSwimlane>) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [id]: {
          ...prev.swimlanes[id],
          ...updates,
        },
      },
    }));
  };

  const clearAll = () => {
    updateData(() => ({
      swimlanes: {},
      rootIds: [],
      links: [],
    }));
    nextId = 1;
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      updateData(() => parsed);
      // Update nextId to avoid conflicts
      const allIds = Object.keys(parsed.swimlanes);
      const maxId = allIds.reduce((max, id) => {
        const num = parseInt(id.split("-")[1]);
        return num > max ? num : max;
      }, 0);
      nextId = maxId + 1;
    } catch (error) {
      throw new Error("Invalid JSON data");
    }
  };

  return {
    data,
    zoom,
    setZoom,
    addSwimlane,
    deleteSwimlane,
    toggleExpanded,
    addActivity,
    addState,
    updateActivity,
    updateState,
    deleteActivity,
    deleteState,
    moveActivity,
    moveState,
    addLink,
    deleteLink,
    updateLink,
    updateSwimlane,
    clearAll,
    exportData,
    importData,
    calculateSummaryBar,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
