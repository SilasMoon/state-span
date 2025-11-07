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
  // Full-Stack Web Application - Comprehensive Feature Demo

  // ============================================
  // FRONTEND DEVELOPMENT (3-level hierarchy)
  // ============================================
  const frontendParent: GanttSwimlane = {
    id: generateId(),
    name: "Frontend Development",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  // UI Components (Level 2)
  const uiComponents: GanttSwimlane = {
    id: generateId(),
    name: "UI Components",
    type: "task",
    parentId: frontendParent.id,
    children: [],
    expanded: true,
  };

  // Design System (Level 3 - grandchild)
  const designSystem: GanttSwimlane = {
    id: generateId(),
    name: "Design System",
    type: "task",
    parentId: uiComponents.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 0, duration: 16, color: "#e91e63", label: "Color Palette", labelColor: "#ffffff", description: "Define brand colors and theme system" },
      { id: generateId(), start: 16, duration: 20, color: "#c2185b", label: "Typography", labelColor: "#ffffff", description: "Font selection and text styles" },
      { id: generateId(), start: 36, duration: 24, color: "#880e4f", label: "Spacing & Layout", labelColor: "#ffffff", description: "Grid system and spacing tokens" },
    ],
  };

  // Component Library (Level 3 - grandchild)
  const componentLib: GanttSwimlane = {
    id: generateId(),
    name: "Component Library",
    type: "task",
    parentId: uiComponents.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 60, duration: 32, color: "#9c27b0", label: "Base Components", labelColor: "#ffffff", description: "Buttons, inputs, cards, badges" },
      { id: generateId(), start: 92, duration: 28, color: "#7b1fa2", label: "Complex Widgets", labelColor: "#ffffff", description: "Tables, modals, dropdowns, tabs" },
      { id: generateId(), start: 120, duration: 16, color: "#4a148c", label: "Component Docs", labelColor: "#ffffff", description: "Storybook documentation" },
    ],
  };

  uiComponents.children = [designSystem.id, componentLib.id];

  // Application Pages (Level 2)
  const appPages: GanttSwimlane = {
    id: generateId(),
    name: "Application Pages",
    type: "task",
    parentId: frontendParent.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 136, duration: 24, color: "#673ab7", label: "Dashboard", labelColor: "#ffffff", description: "Main dashboard with analytics" },
      { id: generateId(), start: 160, duration: 28, color: "#512da8", label: "User Management", labelColor: "#ffffff", description: "User CRUD and profile pages" },
      { id: generateId(), start: 188, duration: 20, color: "#311b92", label: "Settings & Prefs", labelColor: "#ffffff", description: "Configuration pages" },
    ],
  };

  frontendParent.children = [uiComponents.id, appPages.id];

  // ============================================
  // BACKEND DEVELOPMENT
  // ============================================
  const backendParent: GanttSwimlane = {
    id: generateId(),
    name: "Backend Development",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const apiDev: GanttSwimlane = {
    id: generateId(),
    name: "API Development",
    type: "task",
    parentId: backendParent.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 24, duration: 28, color: "#00bcd4", label: "REST Endpoints", labelColor: "#ffffff", description: "RESTful API design and implementation" },
      { id: generateId(), start: 52, duration: 24, color: "#0097a7", label: "Authentication", labelColor: "#ffffff", description: "JWT auth and OAuth integration" },
      { id: generateId(), start: 76, duration: 32, color: "#006064", label: "Business Logic", labelColor: "#ffffff", description: "Core application logic and services" },
      { id: generateId(), start: 108, duration: 20, color: "#004d40", label: "API Testing", labelColor: "#ffffff", description: "Integration and unit tests" },
    ],
  };

  const databaseDesign: GanttSwimlane = {
    id: generateId(),
    name: "Database Design",
    type: "task",
    parentId: backendParent.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 8, duration: 20, color: "#4caf50", label: "Schema Design", labelColor: "#ffffff", description: "Database schema and relationships" },
      { id: generateId(), start: 28, duration: 24, color: "#388e3c", label: "Migrations", labelColor: "#ffffff", description: "Migration scripts and versioning" },
      { id: generateId(), start: 52, duration: 28, color: "#2e7d32", label: "Indexes & Optimization", labelColor: "#ffffff", description: "Performance tuning and indexes" },
    ],
  };

  backendParent.children = [apiDev.id, databaseDesign.id];

  // ============================================
  // DEVOPS & INFRASTRUCTURE
  // ============================================
  const devopsParent: GanttSwimlane = {
    id: generateId(),
    name: "DevOps & Infrastructure",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const cicdPipeline: GanttSwimlane = {
    id: generateId(),
    name: "CI/CD Pipeline",
    type: "task",
    parentId: devopsParent.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 80, duration: 16, color: "#ff9800", label: "Build Pipeline", labelColor: "#ffffff", description: "Automated build and test pipeline" },
      { id: generateId(), start: 96, duration: 20, color: "#f57c00", label: "Deploy Automation", labelColor: "#ffffff", description: "Automated deployment scripts" },
      { id: generateId(), start: 116, duration: 12, color: "#e65100", label: "Monitoring Setup", labelColor: "#ffffff", description: "Logging and monitoring tools" },
    ],
  };

  const cloudDeploy: GanttSwimlane = {
    id: generateId(),
    name: "Cloud Deployment",
    type: "task",
    parentId: devopsParent.id,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 128, duration: 24, color: "#ff5722", label: "Staging Environment", labelColor: "#ffffff", description: "Set up staging infrastructure" },
      { id: generateId(), start: 152, duration: 20, color: "#e64a19", label: "Production Deploy", labelColor: "#ffffff", description: "Production environment setup" },
      { id: generateId(), start: 172, duration: 36, color: "#bf360c", label: "Scaling & CDN", labelColor: "#ffffff", description: "Load balancing and CDN configuration" },
    ],
  };

  devopsParent.children = [cicdPipeline.id, cloudDeploy.id];

  // ============================================
  // QUALITY ASSURANCE
  // ============================================
  const qaParent: GanttSwimlane = {
    id: generateId(),
    name: "Quality Assurance",
    type: "task",
    parentId: undefined,
    children: [],
    expanded: true,
    tasks: [
      { id: generateId(), start: 140, duration: 32, color: "#795548", label: "E2E Testing", labelColor: "#ffffff", description: "End-to-end test automation" },
      { id: generateId(), start: 172, duration: 24, color: "#5d4037", label: "Performance Testing", labelColor: "#ffffff", description: "Load and stress testing" },
      { id: generateId(), start: 196, duration: 16, color: "#3e2723", label: "Security Audit", labelColor: "#ffffff", description: "Security vulnerability assessment" },
    ],
  };

  // ============================================
  // PROJECT STATUS (State Swimlanes)
  // ============================================
  const projectStatusParent: GanttSwimlane = {
    id: generateId(),
    name: "Project Status",
    type: "state",
    parentId: undefined,
    children: [],
    expanded: true,
  };

  const devPhase: GanttSwimlane = {
    id: generateId(),
    name: "Development Phase",
    type: "state",
    parentId: projectStatusParent.id,
    children: [],
    expanded: true,
    states: [
      { id: generateId(), start: 0, duration: 60, color: "#2196f3", label: "Planning & Design", labelColor: "#ffffff", description: "Initial planning and design phase" },
      { id: generateId(), start: 60, duration: 76, color: "#1976d2", label: "Active Development", labelColor: "#ffffff", description: "Main development sprint" },
      { id: generateId(), start: 136, duration: 76, color: "#0d47a1", label: "Integration & Polish", labelColor: "#ffffff", description: "Feature integration and refinement" },
    ],
  };

  const testingStatus: GanttSwimlane = {
    id: generateId(),
    name: "Testing Status",
    type: "state",
    parentId: projectStatusParent.id,
    children: [],
    expanded: true,
    states: [
      { id: generateId(), start: 108, duration: 32, color: "#03a9f4", label: "Unit Tests", labelColor: "#ffffff", description: "Writing and running unit tests" },
      { id: generateId(), start: 140, duration: 32, color: "#0288d1", label: "Integration Tests", labelColor: "#ffffff", description: "API and integration testing" },
      { id: generateId(), start: 172, duration: 40, color: "#01579b", label: "Full QA Cycle", labelColor: "#ffffff", description: "Comprehensive QA testing" },
    ],
  };

  const deploymentStatus: GanttSwimlane = {
    id: generateId(),
    name: "Deployment Status",
    type: "state",
    parentId: projectStatusParent.id,
    children: [],
    expanded: true,
    states: [
      { id: generateId(), start: 128, duration: 24, color: "#4caf50", label: "Staging Ready", labelColor: "#ffffff", description: "Deployed to staging" },
      { id: generateId(), start: 152, duration: 20, color: "#388e3c", label: "Pre-Production", labelColor: "#ffffff", description: "Final checks before production" },
      { id: generateId(), start: 172, duration: 40, color: "#1b5e20", label: "Production Live", labelColor: "#ffffff", description: "Live in production" },
    ],
  };

  projectStatusParent.children = [devPhase.id, testingStatus.id, deploymentStatus.id];

  // ============================================
  // DEPENDENCY LINKS (with advanced features)
  // ============================================
  const links: GanttLink[] = [
    // Design system flows to component library
    {
      id: generateId(),
      fromSwimlaneId: designSystem.id,
      fromId: designSystem.tasks![2].id, // Spacing & Layout
      toSwimlaneId: componentLib.id,
      toId: componentLib.tasks![0].id, // Base Components
      fromHandle: "finish",
      toHandle: "start",
      color: "#9c27b0",
      label: "Design Tokens",
    },
    // Component library to pages
    {
      id: generateId(),
      fromSwimlaneId: componentLib.id,
      fromId: componentLib.tasks![1].id, // Complex Widgets
      toSwimlaneId: appPages.id,
      toId: appPages.tasks![0].id, // Dashboard
      fromHandle: "finish",
      toHandle: "start",
      color: "#673ab7",
      label: "UI Ready",
    },
    // Database to API
    {
      id: generateId(),
      fromSwimlaneId: databaseDesign.id,
      fromId: databaseDesign.tasks![0].id, // Schema Design
      toSwimlaneId: apiDev.id,
      toId: apiDev.tasks![0].id, // REST Endpoints
      fromHandle: "finish",
      toHandle: "start",
      color: "#00bcd4",
      label: "Schema",
    },
    // API chain
    {
      id: generateId(),
      fromSwimlaneId: apiDev.id,
      fromId: apiDev.tasks![0].id, // REST Endpoints
      toSwimlaneId: apiDev.id,
      toId: apiDev.tasks![1].id, // Authentication
      color: "#0097a7",
    },
    {
      id: generateId(),
      fromSwimlaneId: apiDev.id,
      fromId: apiDev.tasks![1].id, // Authentication
      toSwimlaneId: apiDev.id,
      toId: apiDev.tasks![2].id, // Business Logic
      color: "#006064",
    },
    // API to CI/CD
    {
      id: generateId(),
      fromSwimlaneId: apiDev.id,
      fromId: apiDev.tasks![2].id, // Business Logic
      toSwimlaneId: cicdPipeline.id,
      toId: cicdPipeline.tasks![0].id, // Build Pipeline
      fromHandle: "finish",
      toHandle: "start",
      color: "#ff9800",
      label: "Backend Ready",
    },
    // CI/CD to Deployment
    {
      id: generateId(),
      fromSwimlaneId: cicdPipeline.id,
      fromId: cicdPipeline.tasks![1].id, // Deploy Automation
      toSwimlaneId: cloudDeploy.id,
      toId: cloudDeploy.tasks![0].id, // Staging Environment
      color: "#ff5722",
      label: "Deploy",
    },
    // Pages to E2E Testing
    {
      id: generateId(),
      fromSwimlaneId: appPages.id,
      fromId: appPages.tasks![0].id, // Dashboard
      toSwimlaneId: qaParent.id,
      toId: qaParent.tasks![0].id, // E2E Testing
      fromHandle: "finish",
      toHandle: "start",
      color: "#795548",
      label: "UI Complete",
    },
    // Staging to Production
    {
      id: generateId(),
      fromSwimlaneId: cloudDeploy.id,
      fromId: cloudDeploy.tasks![0].id, // Staging Environment
      toSwimlaneId: cloudDeploy.id,
      toId: cloudDeploy.tasks![1].id, // Production Deploy
      color: "#e64a19",
    },
    // QA to Production
    {
      id: generateId(),
      fromSwimlaneId: qaParent.id,
      fromId: qaParent.tasks![1].id, // Performance Testing
      toSwimlaneId: cloudDeploy.id,
      toId: cloudDeploy.tasks![1].id, // Production Deploy
      fromHandle: "finish",
      toHandle: "start",
      color: "#5d4037",
      label: "QA Approved",
    },
    // Database optimization ongoing
    {
      id: generateId(),
      fromSwimlaneId: databaseDesign.id,
      fromId: databaseDesign.tasks![1].id, // Migrations
      toSwimlaneId: databaseDesign.id,
      toId: databaseDesign.tasks![2].id, // Indexes & Optimization
      color: "#388e3c",
    },
  ];

  // ============================================
  // FLAGS (Milestones with varied icons)
  // ============================================
  const flags: GanttFlag[] = [
    {
      id: generateId(),
      position: 0,
      label: "Project Kickoff",
      color: "#2196f3",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "PlayCircle",
      swimlane: "top",
      description: "Project officially starts",
    },
    {
      id: generateId(),
      position: 60,
      label: "Design Complete",
      color: "#e91e63",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "Palette",
      swimlane: "top",
      description: "Design system finalized",
    },
    {
      id: generateId(),
      position: 108,
      label: "Backend Alpha",
      color: "#00bcd4",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "Server",
      swimlane: "top",
      description: "Backend core functionality complete",
    },
    {
      id: generateId(),
      position: 136,
      label: "Frontend Beta",
      color: "#9c27b0",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "Layout",
      swimlane: "top",
      description: "All main pages complete",
    },
    {
      id: generateId(),
      position: 152,
      label: "Staging Launch",
      color: "#ff9800",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "Upload",
      swimlane: "bottom",
      description: "Deployed to staging environment",
    },
    {
      id: generateId(),
      position: 172,
      label: "Production Release",
      color: "#4caf50",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "Rocket",
      swimlane: "bottom",
      description: "Live in production!",
    },
    {
      id: generateId(),
      position: 212,
      label: "Post-Launch Review",
      color: "#795548",
      textColor: "#ffffff",
      iconColor: "#ffffff",
      icon: "Target",
      swimlane: "bottom",
      description: "Analyze metrics and feedback",
    },
  ];

  return {
    swimlanes: {
      [frontendParent.id]: frontendParent,
      [uiComponents.id]: uiComponents,
      [designSystem.id]: designSystem,
      [componentLib.id]: componentLib,
      [appPages.id]: appPages,
      [backendParent.id]: backendParent,
      [apiDev.id]: apiDev,
      [databaseDesign.id]: databaseDesign,
      [devopsParent.id]: devopsParent,
      [cicdPipeline.id]: cicdPipeline,
      [cloudDeploy.id]: cloudDeploy,
      [qaParent.id]: qaParent,
      [projectStatusParent.id]: projectStatusParent,
      [devPhase.id]: devPhase,
      [testingStatus.id]: testingStatus,
      [deploymentStatus.id]: deploymentStatus,
    },
    rootIds: [frontendParent.id, backendParent.id, devopsParent.id, qaParent.id, projectStatusParent.id],
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
