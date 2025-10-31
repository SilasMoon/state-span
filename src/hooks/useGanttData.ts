import { useState } from "react";
import { GanttData, GanttSwimlane, GanttTask, GanttState, GanttLink, ZoomConfig, ZOOM_LEVELS } from "@/types/gantt";

let nextId = 1;
const generateId = () => `item-${nextId++}`;

const createDefaultData = (): GanttData => {
  // Product Launch Project Example
  
  // Planning & Strategy Phase
  const planningPhase: GanttSwimlane = {
    id: generateId(),
    name: "Planning & Strategy",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const marketResearch: GanttSwimlane = {
    id: generateId(),
    name: "Market Research",
    type: "task",
    parentId: planningPhase.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 0, duration: 24, color: "#00bcd4", label: "Competitor Analysis", labelColor: "#ffffff", description: "Analyze market competitors" },
      { id: generateId(), start: 24, duration: 16, color: "#0097a7", label: "Customer Surveys", labelColor: "#ffffff", description: "Conduct target audience surveys" },
    ],
  };

  const productStrategy: GanttSwimlane = {
    id: generateId(),
    name: "Product Strategy",
    type: "task",
    parentId: planningPhase.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 40, duration: 20, color: "#4caf50", label: "Feature Definition", labelColor: "#ffffff", description: "Define core product features" },
      { id: generateId(), start: 60, duration: 12, color: "#388e3c", label: "Pricing Strategy", labelColor: "#ffffff", description: "Determine pricing model" },
    ],
  };

  planningPhase.children = [marketResearch.id, productStrategy.id];

  // Development Phase
  const developmentPhase: GanttSwimlane = {
    id: generateId(),
    name: "Development",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const productDev: GanttSwimlane = {
    id: generateId(),
    name: "Product Development",
    type: "task",
    parentId: developmentPhase.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 72, duration: 48, color: "#ff9800", label: "Core Features", labelColor: "#ffffff", description: "Build primary features" },
      { id: generateId(), start: 120, duration: 24, color: "#f57c00", label: "Beta Testing", labelColor: "#ffffff", description: "Internal beta testing" },
    ],
  };

  const uxDesign: GanttSwimlane = {
    id: generateId(),
    name: "UX Design",
    type: "task",
    parentId: developmentPhase.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 72, duration: 20, color: "#9c27b0", label: "Prototypes", labelColor: "#ffffff", description: "Create interactive prototypes" },
      { id: generateId(), start: 92, duration: 28, color: "#7b1fa2", label: "User Testing", labelColor: "#ffffff", description: "Conduct user experience tests" },
    ],
  };

  developmentPhase.children = [productDev.id, uxDesign.id];

  // Marketing & Launch Phase
  const marketingPhase: GanttSwimlane = {
    id: generateId(),
    name: "Marketing & Launch",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const contentCreation: GanttSwimlane = {
    id: generateId(),
    name: "Content Creation",
    type: "task",
    parentId: marketingPhase.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 120, duration: 16, color: "#e91e63", label: "Landing Page", labelColor: "#ffffff", description: "Design landing page" },
      { id: generateId(), start: 136, duration: 12, color: "#c2185b", label: "Marketing Videos", labelColor: "#ffffff", description: "Produce promotional videos" },
    ],
  };

  const campaigns: GanttSwimlane = {
    id: generateId(),
    name: "Marketing Campaigns",
    type: "task",
    parentId: marketingPhase.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 148, duration: 20, color: "#673ab7", label: "Pre-Launch", labelColor: "#ffffff", description: "Pre-launch email campaign" },
      { id: generateId(), start: 168, duration: 24, color: "#512da8", label: "Launch Event", labelColor: "#ffffff", description: "Product launch event" },
      { id: generateId(), start: 192, duration: 48, color: "#311b92", label: "Post-Launch", labelColor: "#ffffff", description: "Post-launch marketing push" },
    ],
  };

  marketingPhase.children = [contentCreation.id, campaigns.id];

  // Project States
  const projectStatusParent: GanttSwimlane = {
    id: generateId(),
    name: "Project Status",
    type: "state",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const budgetStatus: GanttSwimlane = {
    id: generateId(),
    name: "Budget Status",
    type: "state",
    parentId: projectStatusParent.id,
    children: [],
    expanded: true,
    states: [
      { id: generateId(), start: 0, duration: 72, color: "#4caf50", label: "On Budget", labelColor: "#ffffff", description: "Within budget limits" },
      { id: generateId(), start: 72, duration: 96, color: "#ff9800", label: "Budget Review", labelColor: "#ffffff", description: "Under review" },
      { id: generateId(), start: 168, duration: 72, color: "#4caf50", label: "Approved", labelColor: "#ffffff", description: "Additional budget approved" },
    ],
  };

  const milestones: GanttSwimlane = {
    id: generateId(),
    name: "Milestones",
    type: "state",
    parentId: projectStatusParent.id,
    children: [],
    expanded: true,
    states: [
      { id: generateId(), start: 40, duration: 32, color: "#2196f3", label: "Strategy Complete", labelColor: "#ffffff", description: "Planning phase done" },
      { id: generateId(), start: 144, duration: 24, color: "#03a9f4", label: "Product Ready", labelColor: "#ffffff", description: "Development complete" },
      { id: generateId(), start: 168, duration: 24, color: "#00bcd4", label: "Launch Day", labelColor: "#ffffff", description: "Official product launch" },
    ],
  };

  projectStatusParent.children = [budgetStatus.id, milestones.id];

  // Create links between tasks
  const links: GanttLink[] = [
    // Market research to product strategy
    {
      id: generateId(),
      fromSwimlaneId: marketResearch.id,
      fromId: marketResearch.tasks![1].id,
      toSwimlaneId: productStrategy.id,
      toId: productStrategy.tasks![0].id,
    },
    // Product strategy to development
    {
      id: generateId(),
      fromSwimlaneId: productStrategy.id,
      fromId: productStrategy.tasks![1].id,
      toSwimlaneId: productDev.id,
      toId: productDev.tasks![0].id,
    },
    // Product strategy to UX design
    {
      id: generateId(),
      fromSwimlaneId: productStrategy.id,
      fromId: productStrategy.tasks![1].id,
      toSwimlaneId: uxDesign.id,
      toId: uxDesign.tasks![0].id,
    },
    // UX prototypes to user testing
    {
      id: generateId(),
      fromSwimlaneId: uxDesign.id,
      fromId: uxDesign.tasks![0].id,
      toSwimlaneId: uxDesign.id,
      toId: uxDesign.tasks![1].id,
    },
    // Development to content creation
    {
      id: generateId(),
      fromSwimlaneId: productDev.id,
      fromId: productDev.tasks![1].id,
      toSwimlaneId: contentCreation.id,
      toId: contentCreation.tasks![0].id,
    },
    // Content to pre-launch campaign
    {
      id: generateId(),
      fromSwimlaneId: contentCreation.id,
      fromId: contentCreation.tasks![1].id,
      toSwimlaneId: campaigns.id,
      toId: campaigns.tasks![0].id,
    },
    // Beta testing to launch event
    {
      id: generateId(),
      fromSwimlaneId: productDev.id,
      fromId: productDev.tasks![1].id,
      toSwimlaneId: campaigns.id,
      toId: campaigns.tasks![1].id,
    },
    // Launch event to post-launch
    {
      id: generateId(),
      fromSwimlaneId: campaigns.id,
      fromId: campaigns.tasks![1].id,
      toSwimlaneId: campaigns.id,
      toId: campaigns.tasks![2].id,
    },
  ];

  return {
    swimlanes: {
      [planningPhase.id]: planningPhase,
      [marketResearch.id]: marketResearch,
      [productStrategy.id]: productStrategy,
      [developmentPhase.id]: developmentPhase,
      [productDev.id]: productDev,
      [uxDesign.id]: uxDesign,
      [marketingPhase.id]: marketingPhase,
      [contentCreation.id]: contentCreation,
      [campaigns.id]: campaigns,
      [projectStatusParent.id]: projectStatusParent,
      [budgetStatus.id]: budgetStatus,
      [milestones.id]: milestones,
    },
    rootIds: [planningPhase.id, developmentPhase.id, marketingPhase.id, projectStatusParent.id],
    links,
  };
};

export const useGanttData = () => {
  const [data, setData] = useState<GanttData>(createDefaultData());
  const [zoomIndex, setZoomIndex] = useState<number>(16); // Default to 8 hours per column
  const zoom: ZoomConfig = ZOOM_LEVELS[zoomIndex];
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

  const addSwimlane = (type: "task" | "state", parentId?: string) => {
    const id = generateId();
    const newSwimlane: GanttSwimlane = {
      id,
      name: type === "task" ? "New Task Lane" : "New State Lane",
      type,
      parentId,
      children: [],
      expanded: true,
      tasks: type === "task" ? [] : undefined,
      states: type === "state" ? [] : undefined,
    };

    updateData((prev) => {
      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes, [id]: newSwimlane };

      if (parentId) {
        const parent = newData.swimlanes[parentId];
        // Clear parent's tasks/states when adding a child
        newData.swimlanes[parentId] = {
          ...parent,
          children: [...parent.children, id],
          tasks: parent.type === "task" ? [] : parent.tasks,
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

  const addTask = (swimlaneId: string, start: number, duration: number) => {
    const id = generateId();
    const task: GanttTask = {
      id,
      start,
      duration,
      color: "#00bcd4",
      label: "",
      labelColor: "#000000",
      description: "",
    };

    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || swimlane.type !== "task") return prev;
      
      // Prevent adding tasks to parent swimlanes
      if (swimlane.children.length > 0) {
        console.warn("Cannot add tasks to parent swimlanes");
        return prev;
      }

      return {
        ...prev,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            tasks: [...(swimlane.tasks || []), task],
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

  const updateTask = (swimlaneId: string, taskId: string, updates: Partial<GanttTask>) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.tasks) return prev;

      // Get the old task to calculate duration delta
      const oldTask = swimlane.tasks.find((act) => act.id === taskId);
      if (!oldTask) return prev;

      const durationDelta = updates.duration !== undefined ? updates.duration - oldTask.duration : 0;

      // Update the task
      let newData = {
        ...prev,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            tasks: swimlane.tasks.map((act) =>
              act.id === taskId ? { ...act, ...updates } : act
            ),
          },
        },
      };

      // If duration changed, propagate to linked tasks
      if (durationDelta !== 0) {
        newData = propagateDurationChange(newData, swimlaneId, taskId, durationDelta);
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
      const toSwimlane = newData.swimlanes[link.toSwimlaneId];
      if (!toSwimlane) return;

      // Update the target task/state
      if (toSwimlane.tasks) {
        newData.swimlanes[link.toSwimlaneId] = {
          ...toSwimlane,
          tasks: toSwimlane.tasks.map(act => 
            act.id === link.toId 
              ? { ...act, start: act.start + durationDelta }
              : act
          ),
        };

        // Recursively propagate to tasks linked from this one
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

  const deleteTask = (swimlaneId: string, taskId: string) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane || !swimlane.tasks) return prev;

      // Remove links
      const newLinks = prev.links.filter(
        (link) => link.fromId !== taskId && link.toId !== taskId
      );

      return {
        ...prev,
        links: newLinks,
        swimlanes: {
          ...prev.swimlanes,
          [swimlaneId]: {
            ...swimlane,
            tasks: swimlane.tasks.filter((act) => act.id !== taskId),
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

  const addLink = (fromSwimlaneId: string, fromId: string, toSwimlaneId: string, toId: string) => {
    const id = generateId();
    
    updateData((prev) => {
      // Get source task/state color from current data
      let color = "#00bcd4"; // default
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      if (fromSwimlane) {
        const item = fromSwimlane.tasks?.find((a) => a.id === fromId) || 
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
        color,
        label: "",
      };

      return {
        ...prev,
        links: [...prev.links, link],
      };
    });

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

  const moveTask = (fromSwimlaneId: string, toSwimlaneId: string, taskId: string, newStart: number) => {
    updateData((prev) => {
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      const toSwimlane = prev.swimlanes[toSwimlaneId];
      
      if (!fromSwimlane || !toSwimlane || toSwimlane.type !== "task") return prev;
      
      const task = fromSwimlane.tasks?.find((a) => a.id === taskId);
      if (!task) return prev;
      
      const positionDelta = newStart - task.start;
      const movedTask = { ...task, start: newStart };
      
      let newData: GanttData;
      
      if (fromSwimlaneId === toSwimlaneId) {
        newData = {
          ...prev,
          swimlanes: {
            ...prev.swimlanes,
            [toSwimlaneId]: {
              ...toSwimlane,
              tasks: toSwimlane.tasks?.map((a) =>
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
        
        // Update all links that reference this task to use the new swimlane ID
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
      }
      
      return newData;
    });
  };

  const moveSwimlane = (swimlaneId: string, targetParentId: string | null, insertBeforeId: string | null) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane) return prev;

      // Don't allow moving into itself or its own descendants
      const isDescendant = (potentialParentId: string): boolean => {
        if (potentialParentId === swimlaneId) return true;
        const potentialParent = prev.swimlanes[potentialParentId];
        if (!potentialParent || !potentialParent.parentId) return false;
        return isDescendant(potentialParent.parentId);
      };

      if (targetParentId && isDescendant(targetParentId)) {
        console.warn("Cannot move swimlane into its own descendant");
        return prev;
      }

      // Check type compatibility if moving to a parent
      if (targetParentId) {
        const targetParent = prev.swimlanes[targetParentId];
        if (targetParent && targetParent.type !== swimlane.type) {
          console.warn("Cannot move swimlane to parent of different type");
          return prev;
        }
      }

      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes };

      // Handle "after:id" syntax for insertBeforeId
      let actualInsertBeforeId = insertBeforeId;
      if (insertBeforeId?.startsWith('after:')) {
        const afterId = insertBeforeId.substring(6);
        // Find the next sibling after this ID
        const siblings = targetParentId 
          ? newData.swimlanes[targetParentId].children 
          : newData.rootIds;
        const afterIndex = siblings.indexOf(afterId);
        if (afterIndex >= 0 && afterIndex < siblings.length - 1) {
          actualInsertBeforeId = siblings[afterIndex + 1];
        } else {
          actualInsertBeforeId = null; // Append to end
        }
      }

      // Remove from old location
      if (swimlane.parentId) {
        const oldParent = newData.swimlanes[swimlane.parentId];
        newData.swimlanes[swimlane.parentId] = {
          ...oldParent,
          children: oldParent.children.filter(id => id !== swimlaneId),
        };
      } else {
        newData.rootIds = newData.rootIds.filter(id => id !== swimlaneId);
      }

      // Update swimlane's parentId
      newData.swimlanes[swimlaneId] = {
        ...swimlane,
        parentId: targetParentId || undefined,
      };

      // Insert at new location
      if (targetParentId) {
        const newParent = newData.swimlanes[targetParentId];
        const newChildren = [...newParent.children];
        
        if (actualInsertBeforeId) {
          const insertIndex = newChildren.indexOf(actualInsertBeforeId);
          if (insertIndex >= 0) {
            newChildren.splice(insertIndex, 0, swimlaneId);
          } else {
            newChildren.push(swimlaneId);
          }
        } else {
          newChildren.push(swimlaneId);
        }

        newData.swimlanes[targetParentId] = {
          ...newParent,
          children: newChildren,
          // Clear parent's items when adding first child
          tasks: newParent.type === "task" && newChildren.length === 1 ? [] : newParent.tasks,
          states: newParent.type === "state" && newChildren.length === 1 ? [] : newParent.states,
        };
      } else {
        const newRootIds = [...newData.rootIds];
        
        if (actualInsertBeforeId) {
          const insertIndex = newRootIds.indexOf(actualInsertBeforeId);
          if (insertIndex >= 0) {
            newRootIds.splice(insertIndex, 0, swimlaneId);
          } else {
            newRootIds.push(swimlaneId);
          }
        } else {
          newRootIds.push(swimlaneId);
        }

        newData.rootIds = newRootIds;
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
    zoomIndex,
    setZoomIndex,
    addSwimlane,
    deleteSwimlane,
    toggleExpanded,
    addTask,
    addState,
    updateTask,
    updateState,
    deleteTask,
    deleteState,
    moveTask,
    moveState,
    moveSwimlane,
    addLink,
    deleteLink,
    updateLink,
    updateSwimlane,
    clearAll,
    exportData,
    importData,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
