import React, { useState } from "react";
import { createPortal } from "react-dom";
import { GanttToolbar } from "./GanttToolbar";
import { GanttTimeline } from "./GanttTimeline";
import { GanttRow } from "./GanttRow";
import { EditDialog } from "./EditDialog";
import { LinkEditDialog } from "./LinkEditDialog";
import { GanttLinks } from "./GanttLinks";
import { useGanttData } from "@/hooks/useGanttData";
import { LinkType, ZoomLevel } from "@/types/gantt";
import { toast } from "sonner";

export const GanttChart = () => {
  const {
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
    moveSwimlane,
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
  } = useGanttData();

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    swimlaneId: string;
    itemId: string;
    type: "activity" | "state";
    color: string;
    label: string;
    labelColor: string;
    description: string;
    start: number;
    duration: number;
  } | null>(null);

  const [selected, setSelected] = useState<{
    type: "swimlane" | "activity" | "state";
    swimlaneId: string;
    itemId?: string;
  } | null>(null);

  // Log selected state changes
  React.useEffect(() => {
    console.log('[GanttChart] selected state changed:', selected);
  }, [selected]);

  const [linkDragStart, setLinkDragStart] = useState<{
    swimlaneId: string;
    itemId: string;
    handleType: 'start' | 'finish';
  } | null>(null);

  const [linkDragCurrent, setLinkDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [selectedLink, setSelectedLink] = useState<string | null>(null);

  const [dragPreview, setDragPreview] = useState<{
    itemId: string;
    swimlaneId: string;
    targetSwimlaneId: string;
    tempStart: number;
    tempDuration: number;
    color: string;
    mouseX: number;
    mouseY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // PHASE 4: Track temp positions for all items being dragged/resized
  const [itemTempPositions, setItemTempPositions] = useState<Record<string, {
    start: number;
    duration: number;
    swimlaneId: string;
  }>>({});

  const [copiedItem, setCopiedItem] = useState<{
    type: "activity" | "state";
    swimlaneId: string;
    itemId: string;
    color: string;
    label: string;
    labelColor: string;
    description: string;
    duration: number;
  } | null>(null);

  const [copyGhost, setCopyGhost] = useState<{
    mouseX: number;
    mouseY: number;
    duration: number;
    color: string;
    label: string;
    labelColor: string;
  } | null>(null);

  const [chartTitle, setChartTitle] = useState<string>("Software Development Project");

  // Swimlane column width state with localStorage persistence
  const [swimlaneColumnWidth, setSwimlaneColumnWidth] = useState<number>(() => {
    const stored = localStorage.getItem('gantt-swimlane-width');
    return stored ? parseInt(stored) : 280;
  });

  // Ref for the main container to handle keyboard events
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Ref for resize handle
  const resizeRef = React.useRef<HTMLDivElement>(null);
  
  // Ref to track resize state
  const isResizingRef = React.useRef(false);
  const resizeStartXRef = React.useRef(0);
  const resizeStartWidthRef = React.useRef(0);

  // Calculate total hours dynamically based on content
  const calculateTotalHours = () => {
    let maxHour = 240; // Default 10 days
    Object.values(data.swimlanes).forEach((swimlane) => {
      swimlane.activities?.forEach((activity) => {
        const endHour = activity.start + activity.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
      swimlane.states?.forEach((state) => {
        const endHour = state.start + state.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
    });
    // Add 20% buffer and round up to next day
    return Math.ceil((maxHour * 1.2) / 24) * 24;
  };
  
  const totalHours = calculateTotalHours();

  const handleZoomIn = () => {
    const levels: ZoomLevel[] = [24, 12, 8, 4, 2, 1];
    const currentIndex = levels.indexOf(zoom);
    if (currentIndex < levels.length - 1) {
      setZoom(levels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const levels: ZoomLevel[] = [1, 2, 4, 8, 12, 24];
    const currentIndex = levels.indexOf(zoom);
    if (currentIndex < levels.length - 1) {
      setZoom(levels[currentIndex + 1]);
    }
  };

  const handleZoomToFit = () => {
    const scrollContainer = document.querySelector('.overflow-auto');
    if (!scrollContainer) return;

    const viewportWidth = scrollContainer.clientWidth - swimlaneColumnWidth; // Use dynamic width
    
    // Calculate actual timeline extent from all content
    let minStart = Infinity;
    let maxEnd = 0;
    
    Object.values(data.swimlanes).forEach((swimlane) => {
      swimlane.activities?.forEach((activity) => {
        if (activity.start < minStart) minStart = activity.start;
        const end = activity.start + activity.duration;
        if (end > maxEnd) maxEnd = end;
      });
      swimlane.states?.forEach((state) => {
        if (state.start < minStart) minStart = state.start;
        const end = state.start + state.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    
    // If no content, use default
    if (minStart === Infinity) {
      setZoom(24);
      toast.info("Timeline zoomed to fit");
      return;
    }
    
    const actualContentDuration = maxEnd - minStart;
    
    // Calculate best zoom level to fit the actual content
    const levels: ZoomLevel[] = [1, 2, 4, 8, 12, 24];
    const columnWidths: Record<ZoomLevel, number> = { 1: 30, 2: 40, 4: 50, 8: 60, 12: 70, 24: 80 };
    
    let bestZoom: ZoomLevel = 24;
    
    for (const level of levels) {
      const columnWidth = columnWidths[level];
      const columns = Math.ceil(actualContentDuration / level);
      const requiredWidth = columns * columnWidth;
      
      if (requiredWidth <= viewportWidth) {
        bestZoom = level;
        break;
      }
    }
    
    setZoom(bestZoom);
    
    // Scroll to the start of content
    setTimeout(() => {
      if (scrollContainer && minStart > 0) {
        const columnWidth = columnWidths[bestZoom];
        const scrollTo = (minStart / bestZoom) * columnWidth;
        scrollContainer.scrollLeft = scrollTo;
      }
    }, 0);
    
    toast.info("Timeline zoomed to fit content");
  };

  const handleAddActivityLane = () => {
    addSwimlane("activity");
    toast.success("Activity swimlane added");
  };

  const handleAddStateLane = () => {
    addSwimlane("state");
    toast.success("State swimlane added");
  };

  const handleAddChild = (parentId: string, type: "activity" | "state") => {
    addSwimlane(type, parentId);
    toast.success(`${type} child swimlane added`);
  };

  const handleActivityDoubleClick = (swimlaneId: string, activityId: string) => {
    const swimlane = data.swimlanes[swimlaneId];
    const activity = swimlane.activities?.find((a) => a.id === activityId);
    if (activity) {
      setEditDialog({
        open: true,
        swimlaneId,
        itemId: activityId,
        type: "activity",
        color: activity.color,
        label: activity.label || "",
        labelColor: activity.labelColor || "#000000",
        description: activity.description || "",
        start: activity.start,
        duration: activity.duration,
      });
    }
  };

  const handleStateDoubleClick = (swimlaneId: string, stateId: string) => {
    const swimlane = data.swimlanes[swimlaneId];
    const state = swimlane.states?.find((s) => s.id === stateId);
    if (state) {
      setEditDialog({
        open: true,
        swimlaneId,
        itemId: stateId,
        type: "state",
        color: state.color,
        label: state.label || "",
        labelColor: state.labelColor || "#000000",
        description: state.description || "",
        start: state.start,
        duration: state.duration,
      });
    }
  };

  const handleEditSave = (color: string, label: string, labelColor: string, description: string) => {
    if (!editDialog) return;

    if (editDialog.type === "activity") {
      updateActivity(editDialog.swimlaneId, editDialog.itemId, { color, label, labelColor, description });
    } else {
      updateState(editDialog.swimlaneId, editDialog.itemId, { color, label, labelColor, description });
    }

    toast.success("Item updated");
  };

  const handleAddActivity = (swimlaneId: string, start: number) => {
    addActivity(swimlaneId, start, zoom * 2);
    toast.success("Activity added");
  };

  const handleAddState = (swimlaneId: string, start: number) => {
    addState(swimlaneId, start, zoom * 2);
    toast.success("State added");
  };

  const handleCreateByDrag = (swimlaneId: string, start: number, duration: number) => {
    const swimlane = data.swimlanes[swimlaneId];
    if (!swimlane) return;

    if (swimlane.type === 'activity') {
      addActivity(swimlaneId, start, duration);
      toast.success("Activity created");
    } else {
      addState(swimlaneId, start, duration);
      toast.success("State created");
    }
  };

  const handleExport = () => {
    const jsonData = exportData();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gantt-chart-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chart exported");
  };

  const handleExportPNG = async () => {
    try {
      const html2canvas = await import('html2canvas').then(m => m.default);
      
      const chartContainer = document.querySelector('.gantt-chart-container');
      if (!chartContainer) {
        toast.error("Chart not found");
        return;
      }

      toast.info("Generating image...");
      
      // Create wrapper with padding to prevent text cutoff
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-99999px';
      wrapper.style.top = '0';
      wrapper.style.background = '#ffffff';
      wrapper.style.padding = '40px'; // CRITICAL: Padding to ensure text isn't cut off
      wrapper.style.boxSizing = 'content-box';
      
      // Clone the chart
      const clone = chartContainer.cloneNode(true) as HTMLElement;
      
      // Remove positioning that causes rendering issues
      const fixElement = (el: Element) => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          // Convert sticky/fixed to relative
          if (style.position === 'sticky' || style.position === 'fixed') {
            el.style.position = 'relative';
          }
          // Remove transforms
          el.style.transform = 'none';
        }
        Array.from(el.children).forEach(fixElement);
      };
      fixElement(clone);
      
      // Remove SVG and overlays (export static content only)
      clone.querySelectorAll('svg, [style*="zIndex: 25"]').forEach(el => el.remove());
      
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      // Wait for fonts and layout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Capture with text-optimized settings
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      });

      document.body.removeChild(wrapper);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `gantt-chart-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Image exported");
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export image");
    }
  };

  const handleImport = (jsonData: string) => {
    try {
      importData(jsonData);
      toast.success("Chart imported");
    } catch (error) {
      toast.error("Failed to import chart");
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear everything?")) {
      clearAll();
      toast.success("Chart cleared");
    }
  };

  const checkOverlap = (swimlaneId: string, itemId: string, start: number, duration: number): boolean => {
    const swimlane = data.swimlanes[swimlaneId];
    if (!swimlane) return false;

    const end = start + duration;
    const items = swimlane.type === "activity" ? swimlane.activities : swimlane.states;
    
    return items?.some((item) => {
      if (item.id === itemId) return false;
      const itemEnd = item.start + item.duration;
      return (start < itemEnd && end > item.start);
    }) || false;
  };

  const [linkEditDialog, setLinkEditDialog] = useState<{
    linkId: string;
  } | null>(null);

  // Link creation event listeners
  React.useEffect(() => {
    const handleStartLink = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { swimlaneId, itemId, handleType, x, y } = customEvent.detail;
      setLinkDragStart({ swimlaneId, itemId, handleType });
      setLinkDragCurrent({ x, y });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (linkDragStart) {
        e.preventDefault();
        e.stopPropagation();
        setLinkDragCurrent({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (linkDragStart) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const barElement = target?.closest('[data-item-id]');
        
        console.log('[GanttChart] Link drag ended:', {
          linkDragStart,
          target: target?.tagName,
          barElement: barElement?.tagName,
          toSwimlaneId: barElement?.getAttribute('data-swimlane-id'),
          toItemId: barElement?.getAttribute('data-item-id')
        });
        
        if (barElement) {
          const toSwimlaneId = barElement.getAttribute('data-swimlane-id');
          const toItemId = barElement.getAttribute('data-item-id');
          
          if (toSwimlaneId && toItemId && 
              (linkDragStart.swimlaneId !== toSwimlaneId || linkDragStart.itemId !== toItemId)) {
            // Determine link type based on which handle was dragged from and to
            const toHandleElement = target?.closest('[data-handle-type]');
            const toHandleType = toHandleElement?.getAttribute('data-handle-type') as 'start' | 'finish' | null;
            
            // Default to 'finish' if we didn't drop on a specific handle
            const finalToHandleType = toHandleType || 'start';
            
            // Determine link type
            let linkType: "FS" | "SS" | "FF" | "SF" = "FS";
            if (linkDragStart.handleType === 'finish' && finalToHandleType === 'start') {
              linkType = "FS";
            } else if (linkDragStart.handleType === 'start' && finalToHandleType === 'start') {
              linkType = "SS";
            } else if (linkDragStart.handleType === 'finish' && finalToHandleType === 'finish') {
              linkType = "FF";
            } else if (linkDragStart.handleType === 'start' && finalToHandleType === 'finish') {
              linkType = "SF";
            }
            
            console.log('[GanttChart] Creating link:', {
              from: { swimlaneId: linkDragStart.swimlaneId, itemId: linkDragStart.itemId },
              to: { swimlaneId: toSwimlaneId, itemId: toItemId },
              linkType,
              fromHandle: linkDragStart.handleType,
              toHandle: finalToHandleType
            });
            
            addLink(linkDragStart.swimlaneId, linkDragStart.itemId, toSwimlaneId, toItemId, linkType);
            toast.success(`${linkType} link created`);
          }
        }
        
        setLinkDragStart(null);
        setLinkDragCurrent(null);
      }
    };

    window.addEventListener('startLinkDrag', handleStartLink);
    
    if (linkDragStart) {
      document.addEventListener('mousemove', handleMouseMove, { capture: true });
      document.addEventListener('mouseup', handleMouseUp, { capture: true });
      return () => {
        window.removeEventListener('startLinkDrag', handleStartLink);
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
      };
    }
    
    return () => window.removeEventListener('startLinkDrag', handleStartLink);
  }, [linkDragStart, addLink]);

  const handleActivityResize = (swimlaneId: string, activityId: string, newStart: number, newDuration: number) => {
    updateActivity(swimlaneId, activityId, { start: newStart, duration: newDuration });
  };

  const handleStateResize = (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => {
    updateState(swimlaneId, stateId, { start: newStart, duration: newDuration });
  };

  const handleActivityMove = (fromSwimlaneId: string, activityId: string, toSwimlaneId: string, newStart: number) => {
    const toSwimlane = data.swimlanes[toSwimlaneId];
    if (toSwimlane?.type !== 'activity') {
      toast.error("Activities can only be moved to activity swimlanes");
      return;
    }
    moveActivity(fromSwimlaneId, toSwimlaneId, activityId, newStart);
  };

  const handleStateMove = (fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => {
    const toSwimlane = data.swimlanes[toSwimlaneId];
    if (toSwimlane?.type !== 'state') {
      toast.error("States can only be moved to state swimlanes");
      return;
    }
    moveState(fromSwimlaneId, toSwimlaneId, stateId, newStart);
  };

  // Handle swimlane column resize
  React.useEffect(() => {
    const handle = resizeRef.current;
    if (!handle) return;

    const handleMouseDown = (e: MouseEvent) => {
      isResizingRef.current = true;
      resizeStartXRef.current = e.clientX;
      resizeStartWidthRef.current = swimlaneColumnWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      e.preventDefault();
      const delta = e.clientX - resizeStartXRef.current;
      const newWidth = Math.max(200, Math.min(600, resizeStartWidthRef.current + delta)); // Min 200px, max 600px
      setSwimlaneColumnWidth(newWidth);
      localStorage.setItem('gantt-swimlane-width', newWidth.toString());
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    handle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [swimlaneColumnWidth]);

  // Keyboard handlers - attached to container
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Copy: Ctrl+C / Cmd+C
      if (modifier && e.key === 'c') {
        e.preventDefault();
        if (selected && selected.type !== 'swimlane' && selected.itemId) {
          const swimlane = data.swimlanes[selected.swimlaneId];
          if (!swimlane) return;
          
          const item = selected.type === 'activity' 
            ? swimlane.activities?.find(a => a.id === selected.itemId)
            : swimlane.states?.find(s => s.id === selected.itemId);
          
          if (item) {
            setCopiedItem({
              type: selected.type as "activity" | "state",
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
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (modifier && e.key === 'v') {
        e.preventDefault();
        if (copiedItem && copyGhost) {
          handlePaste();
        }
        return;
      }

      // Escape: Cancel copy mode
      if (e.key === 'Escape') {
        if (copiedItem) {
          setCopiedItem(null);
          setCopyGhost(null);
          toast.info("Copy cancelled");
        }
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          toast.success("Undo");
        }
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          redo();
          toast.success("Redo");
        }
        return;
      }

      // Delete
      console.log('[GanttChart] Delete key pressed', { selected, selectedLink });
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedLink) {
          console.log('[GanttChart] Deleting link:', selectedLink);
          deleteLink(selectedLink);
          setSelectedLink(null);
          toast.success("Link deleted");
        } else if (selected) {
          console.log('[GanttChart] Deleting selected item', selected);
          if (selected.type === 'swimlane') {
            deleteSwimlane(selected.swimlaneId);
            setSelected(null);
            toast.success("Swimlane deleted");
          } else if (selected.type === 'activity' && selected.itemId) {
            deleteActivity(selected.swimlaneId, selected.itemId);
            setSelected(null);
            toast.success("Activity deleted");
          } else if (selected.type === 'state' && selected.itemId) {
            deleteState(selected.swimlaneId, selected.itemId);
            setSelected(null);
            toast.success("State deleted");
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [selected, selectedLink, copiedItem, copyGhost, data.swimlanes, deleteSwimlane, deleteActivity, deleteState, deleteLink, undo, redo, canUndo, canRedo]);

  // Auto-focus container when item is selected
  React.useEffect(() => {
    if (selected && containerRef.current) {
      containerRef.current.focus();
    }
  }, [selected]);

  // Track mouse movement for copy ghost
  React.useEffect(() => {
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

  // Handle paste operation
  const handlePaste = () => {
    if (!copiedItem || !copyGhost) return;

    // Find which swimlane the cursor is over
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

    // Check if types match
    if (copiedItem.type === 'activity' && targetSwimlane.type !== 'activity') {
      toast.error("Can only paste activities to activity swimlanes");
      return;
    }
    if (copiedItem.type === 'state' && targetSwimlane.type !== 'state') {
      toast.error("Can only paste states to state swimlanes");
      return;
    }

    // Calculate start time based on cursor position
    const scrollContainer = document.querySelector('.overflow-auto');
    const scrollLeft = scrollContainer?.scrollLeft || 0;
    const columnWidth = zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80;
    
    const gridX = copyGhost.mouseX + scrollLeft - swimlaneColumnWidth;
    const start = Math.max(0, Math.round((gridX / columnWidth) * zoom / zoom) * zoom);

    // Check for overlap
    if (checkOverlap(targetSwimlaneId, '', start, copiedItem.duration)) {
      toast.error("Cannot paste here - overlaps with existing item");
      return;
    }

    // Create the new item with the copied properties
    if (copiedItem.type === 'activity') {
      const newActivityId = addActivity(targetSwimlaneId, start, copiedItem.duration);
      updateActivity(targetSwimlaneId, newActivityId, {
        color: copiedItem.color,
        label: copiedItem.label,
        labelColor: copiedItem.labelColor,
        description: copiedItem.description,
      });
      toast.success("Activity pasted");
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

    // Clear copy mode
    setCopiedItem(null);
    setCopyGhost(null);
  };

  const handleDragStateChange = (itemId: string, swimlaneId: string) => 
    (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => {
      // PHASE 4: Update temp positions for real-time link updates
      if (isDragging) {
        setItemTempPositions(prev => ({
          ...prev,
          [itemId]: {
            start: tempStart,
            duration: tempDuration,
            swimlaneId: targetSwimlaneId || swimlaneId
          }
        }));
        
        if (targetSwimlaneId) {
          const swimlane = data.swimlanes[swimlaneId];
          const item = swimlane?.activities?.find(a => a.id === itemId) || swimlane?.states?.find(s => s.id === itemId);
          if (item) {
            setDragPreview(prev => ({
              itemId,
              swimlaneId,
              targetSwimlaneId,
              tempStart,
              tempDuration,
              color: item.color,
              mouseX,
              mouseY,
              // Use existing offset if not provided (during drag move), or new offset (drag start)
              offsetX: offsetX !== undefined ? offsetX : (prev?.offsetX || 0),
              offsetY: offsetY !== undefined ? offsetY : (prev?.offsetY || 0),
            }));
          }
        }
      } else {
        // Clear temp position when drag ends
        setItemTempPositions(prev => {
          const newPositions = { ...prev };
          delete newPositions[itemId];
          return newPositions;
        });
        setDragPreview(null);
      }
    };

  const renderSwimlanes = (ids: string[], level: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    ids.forEach((id) => {
      const swimlane = data.swimlanes[id];
      if (!swimlane) return;

      // Calculate summary bar for parent swimlanes
      const summaryBar = swimlane.children.length > 0 
        ? calculateSummaryBar(id, data.swimlanes)
        : null;

      elements.push(
          <GanttRow
            key={id}
            swimlane={swimlane}
            level={level}
            zoom={zoom}
            totalHours={totalHours}
            swimlaneColumnWidth={swimlaneColumnWidth}
            selected={selected}
            onSelect={(type, swimlaneId, itemId) => {
              console.log('[GanttChart] onSelect called', { type, swimlaneId, itemId });
              setSelected({ type, swimlaneId, itemId });
              console.log('[GanttChart] setSelected called with', { type, swimlaneId, itemId });
            }}
            onToggleExpand={toggleExpanded}
            onDelete={deleteSwimlane}
            onAddChild={handleAddChild}
            onCreateByDrag={handleCreateByDrag}
            onActivityDoubleClick={handleActivityDoubleClick}
            onStateDoubleClick={handleStateDoubleClick}
            onActivityMove={handleActivityMove}
            onStateMove={handleStateMove}
            onActivityResize={handleActivityResize}
            onStateResize={handleStateResize}
            onSwimlaneNameChange={(id, name) => updateSwimlane(id, { name })}
            onSwimlaneDrop={moveSwimlane}
            checkOverlap={checkOverlap}
            onDragStateChange={handleDragStateChange}
            summaryBar={summaryBar}
          />
      );

      if (swimlane.expanded && swimlane.children.length > 0) {
        elements.push(...renderSwimlanes(swimlane.children, level + 1));
      }
    });

    return elements;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <input
          type="text"
          value={chartTitle}
          onChange={(e) => setChartTitle(e.target.value)}
          className="text-2xl font-bold bg-transparent border-none outline-none text-foreground w-full focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 transition-all"
          placeholder="Enter chart title..."
        />
      </div>
      <GanttToolbar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomToFit={handleZoomToFit}
        onAddActivityLane={handleAddActivityLane}
        onAddStateLane={handleAddStateLane}
        onExport={handleExport}
        onExportPNG={handleExportPNG}
        onImport={handleImport}
        onClear={handleClear}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div 
        ref={containerRef}
        tabIndex={0}
        className="flex-1 overflow-auto relative outline-none focus:ring-2 focus:ring-primary/20"
        onClick={(e) => {
          // If in copy mode, paste on click
          if (copiedItem && copyGhost) {
            e.preventDefault();
            e.stopPropagation();
            handlePaste();
            return;
          }
          
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.inline-block')) {
            setSelected(null);
            setSelectedLink(null);
          }
        }}
      >
        <div className="inline-block min-w-full gantt-chart-container">
          <div className="flex">
            <div className="sticky left-0 z-30 bg-gantt-header border-r-2 border-border relative">
              <div
                className="h-12 flex items-center px-4 font-semibold text-foreground border-b-2 border-border"
                style={{ width: `${swimlaneColumnWidth}px`, minWidth: `${swimlaneColumnWidth}px` }}
              >
                Swimlanes
              </div>
              {/* Resize handle */}
              <div
                ref={resizeRef}
                className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 cursor-col-resize bg-transparent hover:bg-primary/50 transition-all z-40"
                title="Drag to resize"
              />
            </div>
            <div className="flex-1">
              <GanttTimeline zoom={zoom} totalHours={totalHours} />
            </div>
          </div>

          {data.rootIds.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Click "Add Swimlane" to get started
            </div>
          ) : (
            <div>{renderSwimlanes(data.rootIds)}</div>
          )}
        </div>


        {/* Render links with proper masking container */}
        <div 
          className="absolute pointer-events-none"
          style={{
            left: `${swimlaneColumnWidth}px`,
            top: 0,
            width: `calc(100% - ${swimlaneColumnWidth}px)`,
            height: '100%',
            overflow: 'hidden', // CRITICAL: clips any content trying to render outside
            zIndex: 20,
          }}
        >
          <GanttLinks
            data={data}
            zoom={zoom}
            columnWidth={zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80}
            swimlaneColumnWidth={swimlaneColumnWidth}
            selectedLink={selectedLink}
            onLinkSelect={(linkId) => {
              setSelectedLink(linkId === "" ? null : linkId);
              if (linkId) setSelected(null);
            }}
            onLinkDoubleClick={(linkId) => {
              const link = data.links.find(l => l.id === linkId);
              if (link) {
                setLinkEditDialog({ linkId });
              }
            }}
            itemTempPositions={itemTempPositions}
          />
        </div>


        {/* Drag preview ghost bar */}
        {dragPreview && (() => {
          const columnWidth = zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80;
          
          // Calculate position - ghost is portaled to body, so use viewport coordinates
          const left = dragPreview.mouseX - dragPreview.offsetX;
          const top = dragPreview.mouseY - dragPreview.offsetY;
          const width = (dragPreview.tempDuration / zoom) * columnWidth;
          
          return createPortal(
            <div
              className="absolute h-6 rounded flex items-center justify-center text-xs font-medium pointer-events-none border-2 border-dashed"
              style={{
                left: `${left}px`,
                width: `${width}px`,
                top: `${top}px`,
                backgroundColor: dragPreview.color,
                opacity: 0.7,
                color: "#fff",
                zIndex: 50,
                borderColor: "#fff",
              }}
            />,
            document.body
          );
        })()}

        {/* Copy ghost preview */}
        {copyGhost && (() => {
          const columnWidth = zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80;
          const width = (copyGhost.duration / zoom) * columnWidth;
          
          return createPortal(
            <div
              className="absolute h-6 rounded flex items-center justify-center text-xs font-medium pointer-events-none border-2 border-dashed animate-pulse"
              style={{
                left: `${copyGhost.mouseX}px`,
                width: `${width}px`,
                top: `${copyGhost.mouseY}px`,
                backgroundColor: copyGhost.color,
                opacity: 0.6,
                color: "#fff",
                zIndex: 100,
                borderColor: "#3b82f6",
                transform: 'translate(-50%, -50%)',
              }}
            >
              {copyGhost.label && (
                <span 
                  className="px-2 truncate font-medium text-shadow-sm" 
                  style={{ 
                    color: copyGhost.labelColor,
                    textShadow: '0 1px 2px rgba(255,255,255,0.5)'
                  }}
                >
                  {copyGhost.label}
                </span>
              )}
            </div>,
            document.body
          );
        })()}

        {/* Link creation visual feedback */}
        {linkDragStart && linkDragCurrent && (() => {
          const startElement = document.querySelector(`[data-item-id="${linkDragStart.itemId}"][data-swimlane-id="${linkDragStart.swimlaneId}"]`);
          if (!startElement) return null;
          
          const rect = startElement.getBoundingClientRect();
          const scrollContainer = document.querySelector('.overflow-auto');
          const scrollLeft = scrollContainer?.scrollLeft || 0;
          const scrollTop = scrollContainer?.scrollTop || 0;
          
          const startX = rect.right + scrollLeft;
          const startY = rect.top + rect.height / 2 + scrollTop;
          const endX = linkDragCurrent.x + scrollLeft;
          const endY = linkDragCurrent.y + scrollTop;
          
          // Get source item color
          const swimlane = data.swimlanes[linkDragStart.swimlaneId];
          let sourceColor = "#00bcd4";
          if (swimlane) {
            const item = swimlane.activities?.find((a) => a.id === linkDragStart.itemId) || 
                         swimlane.states?.find((s) => s.id === linkDragStart.itemId);
            if (item) sourceColor = item.color;
          }
          
          let path: string;
          
          // Vertical alignment - straight line
          if (Math.abs(startX - endX) < 20) {
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          }
          // Horizontal alignment - straight line
          else if (Math.abs(startY - endY) < 20) {
            path = `M ${startX} ${startY} L ${endX} ${endY}`;
          }
          // Simple 2-segment path based on direction
          else if (startX < endX) {
            // Going right: horizontal then vertical
            path = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
          }
          else {
            // Going left: vertical then horizontal
            path = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
          }
          
          return (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 100 }}
            >
              <defs>
                <marker
                  id="arrowhead-temp"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3, 0 6"
                    fill={sourceColor}
                  />
                </marker>
              </defs>
              <path
                d={path}
                stroke={sourceColor}
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead-temp)"
                opacity="0.7"
              />
            </svg>
          );
        })()}
      </div>

      {editDialog && (
        <EditDialog
          open={editDialog.open}
          onClose={() => setEditDialog(null)}
          initialColor={editDialog.color}
          initialLabel={editDialog.label}
          initialLabelColor={editDialog.labelColor}
          initialDescription={editDialog.description}
          start={editDialog.start}
          duration={editDialog.duration}
          onSave={handleEditSave}
        />
      )}

      {linkEditDialog && (() => {
        const link = data.links.find(l => l.id === linkEditDialog.linkId);
        if (!link) return null;
        
        return (
          <LinkEditDialog
            open={true}
            onClose={() => setLinkEditDialog(null)}
            initialType={link.type}
            initialLabel={link.label || ""}
            initialLag={link.lag || 0}
            initialColor={link.color || "#00bcd4"}
            onSave={(type: LinkType, label: string, lag: number, color: string) => {
              updateLink(linkEditDialog.linkId, { type, label, lag, color });
              toast.success("Link updated");
              setLinkEditDialog(null);
            }}
            onDelete={() => {
              deleteLink(linkEditDialog.linkId);
              toast.success("Link deleted");
              setLinkEditDialog(null);
              setSelectedLink(null);
            }}
          />
        );
      })()}
    </div>
  );
};
