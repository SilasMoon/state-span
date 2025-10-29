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
      { id: generateId(), start: 8, duration: 16, color: "#00bcd4", description: "Initial planning" },
      { id: generateId(), start: 32, duration: 24, color: "#4caf50", description: "Design phase" },
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
      { id: generateId(), start: 0, duration: 24, color: "#ff9800", description: "In Review" },
      { id: generateId(), start: 24, duration: 40, color: "#4caf50", description: "Approved" },
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

    setData((prev) => {
      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes, [id]: newSwimlane };

      if (parentId) {
        const parent = newData.swimlanes[parentId];
        newData.swimlanes[parentId] = {
          ...parent,
          children: [...parent.children, id],
        };
      } else {
        newData.rootIds = [...prev.rootIds, id];
      }

      return newData;
    });

    return id;
  };

  const deleteSwimlane = (id: string) => {
    setData((prev) => {
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
    setData((prev) => ({
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
      description: "",
    };

    setData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || swimlane.type !== "activity") return prev;

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
      description: "",
    };

    setData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || swimlane.type !== "state") return prev;

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
    setData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.activities) return prev;

      return {
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
    });
  };

  const updateState = (swimlaneId: string, stateId: string, updates: Partial<GanttState>) => {
    setData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.states) return prev;

      return {
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
    });
  };

  const deleteActivity = (swimlaneId: string, activityId: string) => {
    setData((prev) => {
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
    setData((prev) => {
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
    setData((prev) => ({
      ...prev,
      links: prev.links.map((link) =>
        link.id === linkId ? { ...link, ...updates } : link
      ),
    }));
  };

  const deleteLink = (linkId: string) => {
    setData((prev) => ({
      ...prev,
      links: prev.links.filter((link) => link.id !== linkId),
    }));
  };

  const moveActivity = (fromSwimlaneId: string, toSwimlaneId: string, activityId: string, newStart: number) => {
    console.log('=== MOVE ACTIVITY CALLED ===');
    console.log('fromSwimlaneId:', fromSwimlaneId);
    console.log('toSwimlaneId:', toSwimlaneId);
    console.log('activityId:', activityId);
    console.log('newStart:', newStart);
    
    setData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];
      
      console.log('fromSwimlane:', fromSwimlane);
      console.log('toSwimlane:', toSwimlane);
      
      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "activity") {
        console.log('Validation failed - returning prev');
        return prev;
      }
      
      const activity = fromSwimlane.activities?.find((a) => a.id === activityId);
      console.log('Found activity:', activity);
      
      if (!activity) {
        console.log('Activity not found - returning prev');
        return prev;
      }
      
      const movedActivity = { ...activity, start: newStart };
      console.log('movedActivity:', movedActivity);
      
      if (fromSwimlaneId === toSwimlaneId) {
        return {
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
      } else {
        return {
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
      }
    });
  };

  const moveState = (fromSwimlaneId: string, toSwimlaneId: string, stateId: string, newStart: number) => {
    setData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];
      
      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "state") return prev;
      
      const state = fromSwimlane.states?.find((s) => s.id === stateId);
      if (!state) return prev;
      
      const movedState = { ...state, start: newStart };
      
      if (fromSwimlaneId === toSwimlaneId) {
        return {
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
      } else {
        return {
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
      }
    });
  };

  const updateSwimlane = (id: string, updates: Partial<GanttSwimlane>) => {
    setData((prev) => ({
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
    setData({
      swimlanes: {},
      rootIds: [],
      links: [],
    });
    nextId = 1;
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      setData(parsed);
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
  };
};
