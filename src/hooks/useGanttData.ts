import { useState, useMemo } from "react";
import { GanttData, GanttSwimlane, GanttTask, GanttState, GanttLink, GanttFlag, ZoomConfig, DEFAULT_ZOOM_LEVEL, getZoomConfig } from "@/types/gantt";
import { ganttDataSchema } from "@/lib/ganttValidation";
import { useGanttHistory } from "./useGanttHistory";
import { useGanttSwimlanes } from "./useGanttSwimlanes";
import { useGanttItems } from "./useGanttItems";
import { useGanttLinks } from "./useGanttLinks";
import { useGanttFlags } from "./useGanttFlags";

let nextId = 1;
const generateId = () => `item-${nextId++}`;

const createDefaultData = (): GanttData => {
  // Product Launch Project Example
  
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

  const links: GanttLink[] = [
    {
      id: generateId(),
      fromSwimlaneId: marketResearch.id,
      fromId: marketResearch.tasks![1].id,
      toSwimlaneId: productStrategy.id,
      toId: productStrategy.tasks![0].id,
      color: marketResearch.tasks![1].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: productStrategy.id,
      fromId: productStrategy.tasks![1].id,
      toSwimlaneId: productDev.id,
      toId: productDev.tasks![0].id,
      color: productStrategy.tasks![1].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: productStrategy.id,
      fromId: productStrategy.tasks![1].id,
      toSwimlaneId: uxDesign.id,
      toId: uxDesign.tasks![0].id,
      color: productStrategy.tasks![1].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: uxDesign.id,
      fromId: uxDesign.tasks![0].id,
      toSwimlaneId: uxDesign.id,
      toId: uxDesign.tasks![1].id,
      color: uxDesign.tasks![0].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: productDev.id,
      fromId: productDev.tasks![1].id,
      toSwimlaneId: contentCreation.id,
      toId: contentCreation.tasks![0].id,
      color: productDev.tasks![1].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: contentCreation.id,
      fromId: contentCreation.tasks![1].id,
      toSwimlaneId: campaigns.id,
      toId: campaigns.tasks![0].id,
      color: contentCreation.tasks![1].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: productDev.id,
      fromId: productDev.tasks![1].id,
      toSwimlaneId: campaigns.id,
      toId: campaigns.tasks![1].id,
      color: productDev.tasks![1].color,
    },
    {
      id: generateId(),
      fromSwimlaneId: campaigns.id,
      fromId: campaigns.tasks![1].id,
      toSwimlaneId: campaigns.id,
      toId: campaigns.tasks![2].id,
      color: campaigns.tasks![1].color,
    },
  ];

  const flags: GanttFlag[] = [
    {
      id: generateId(),
      position: 40,
      label: "Strategy Complete",
      color: "#2196f3",
      icon: "Flag",
      swimlane: "top",
    },
    {
      id: generateId(),
      position: 144,
      label: "Beta Release",
      color: "#ff9800",
      icon: "CheckCircle",
      swimlane: "top",
    },
    {
      id: generateId(),
      position: 168,
      label: "Launch Day",
      color: "#4caf50",
      icon: "Rocket",
      swimlane: "bottom",
    },
    {
      id: generateId(),
      position: 240,
      label: "Post-Launch Review",
      color: "#9c27b0",
      icon: "Target",
      swimlane: "bottom",
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
    flags,
  };
};

export const useGanttData = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM_LEVEL);
  const zoom: ZoomConfig = getZoomConfig(zoomLevel);

  // Initialize history management
  const {
    data,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGanttHistory(createDefaultData());

  // Initialize focused hooks
  const swimlaneOps = useGanttSwimlanes({ updateData, generateId });
  const itemOps = useGanttItems({ data, updateData, generateId });
  const linkOps = useGanttLinks({ updateData, generateId });
  const flagOps = useGanttFlags({ updateData, generateId });

  const clearAll = () => {
    updateData(() => ({
      swimlanes: {},
      rootIds: [],
      links: [],
      flags: [],
    }));
    nextId = 1;
  };

  const resetToDefault = () => {
    nextId = 1;
    updateData(() => createDefaultData());
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      const validationResult = ganttDataSchema.safeParse(parsed);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new Error(`Invalid data format: ${errorMessages}`);
      }
      
      const validatedData = validationResult.data;
      updateData(() => validatedData);
      
      const allIds = Object.keys(validatedData.swimlanes);
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
    zoomLevel,
    setZoomLevel,
    ...swimlaneOps,
    ...itemOps,
    ...linkOps,
    ...flagOps,
    clearAll,
    resetToDefault,
    exportData,
    importData,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
