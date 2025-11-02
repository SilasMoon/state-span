import React, { useState } from "react";
import { createPortal } from "react-dom";
import { GanttToolbar } from "./GanttToolbar";
import { GanttTimeline } from "./GanttTimeline";
import { GanttFlagRow } from "./GanttFlagRow";
import { GanttFlagLines } from "./GanttFlagLines";
import { GanttRow } from "./GanttRow";
import { EditDialog } from "./EditDialog";
import { LinkEditDialog } from "./LinkEditDialog";
import { FlagEditDialog } from "./FlagEditDialog";
import { GanttLinks } from "./GanttLinks";
import { useGanttData } from "@/hooks/useGanttData";
import { useGanttSelection } from "@/hooks/useGanttSelection";
import { useGanttDragAndDrop } from "@/hooks/useGanttDragAndDrop";
import { useGanttLinkCreation } from "@/hooks/useGanttLinkCreation";
import { useGanttCopyPaste } from "@/hooks/useGanttCopyPaste";
import { useGanttKeyboard } from "@/hooks/useGanttKeyboard";
import { LAYOUT, ARIA_LABELS } from "@/lib/ganttConstants";
import { ZoomConfig, ZOOM_LEVELS } from "@/types/gantt";
import { toast } from "sonner";

export const GanttChart = () => {
  const {
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
    addFlag,
    updateFlag,
    deleteFlag,
    clearAll,
    resetToDefault,
    exportData,
    importData,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGanttData();

  const [chartTitle, setChartTitle] = useState<string>("Software Development Project");

  // Flags visibility state
  const [showTopFlags, setShowTopFlags] = useState<boolean>(true);
  const [showBottomFlags, setShowBottomFlags] = useState<boolean>(true);

  // Swimlane column width state with localStorage persistence
  const [swimlaneColumnWidth, setSwimlaneColumnWidth] = useState<number>(() => {
    const stored = localStorage.getItem('gantt-swimlane-width');
    return stored ? parseInt(stored) : LAYOUT.DEFAULT_SWIMLANE_WIDTH;
  });

  // Calculate total hours dynamically based on content
  const calculateTotalHours = (): number => {
    let maxHour: number = LAYOUT.DEFAULT_TOTAL_HOURS;
    Object.values(data.swimlanes).forEach((swimlane) => {
      swimlane.tasks?.forEach((task) => {
        const endHour = task.start + task.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
      swimlane.states?.forEach((state) => {
        const endHour = state.start + state.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
    });
    return Math.ceil((maxHour * 1.2) / 24) * 24;
  };
  
  const totalHours = calculateTotalHours();

  const checkOverlap = (swimlaneId: string, itemId: string, start: number, duration: number): boolean => {
    const swimlane = data.swimlanes[swimlaneId];
    if (!swimlane) return false;

    const end = start + duration;
    const items = swimlane.type === "task" ? swimlane.tasks : swimlane.states;
    
    return items?.some((item) => {
      if (item.id === itemId) return false;
      const itemEnd = item.start + item.duration;
      return (start < itemEnd && end > item.start);
    }) || false;
  };

  // Selection state
  const {
    selected,
    selectedLink,
    selectedFlag,
    setSelected,
    setSelectedLink,
    setSelectedFlag,
    clearSelection,
    selectItem,
    selectLink,
    selectFlag,
  } = useGanttSelection();

  // Drag and drop state
  const {
    dragPreview,
    itemTempPositions,
    handleDragStateChange: createDragStateHandler,
  } = useGanttDragAndDrop();

  // Link creation state
  const { linkDragStart, linkDragCurrent } = useGanttLinkCreation(addLink);

  // Copy/paste state
  const {
    copiedItem,
    copyGhost,
    handleCopy,
    handlePaste,
    cancelCopy,
  } = useGanttCopyPaste({
    data,
    addTask,
    addState,
    updateTask,
    updateState,
    checkOverlap,
    zoomHoursPerColumn: zoom.hoursPerColumn,
    zoomColumnWidth: zoom.columnWidth,
    swimlaneColumnWidth,
  });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    swimlaneId: string;
    itemId: string;
    type: "task" | "state";
    color: string;
    label: string;
    labelColor: string;
    description: string;
    start: number;
    duration: number;
  } | null>(null);

  const [linkEditDialog, setLinkEditDialog] = useState<{
    linkId: string;
  } | null>(null);

  const [flagEditDialog, setFlagEditDialog] = useState<boolean>(false);

  // Ref for the main container to handle keyboard events
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Ref for resize handle
  const resizeRef = React.useRef<HTMLDivElement>(null);
  
  // Ref to track resize state
  const isResizingRef = React.useRef(false);
  const resizeStartXRef = React.useRef(0);
  const resizeStartWidthRef = React.useRef(0);

  const handleZoomIn = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const handleZoomToFit = () => {
    const scrollContainer = document.querySelector('.overflow-auto');
    if (!scrollContainer) return;

    const viewportWidth = scrollContainer.clientWidth - swimlaneColumnWidth;
    
    // Calculate actual timeline extent from all content
    let minStart = Infinity;
    let maxEnd = 0;
    
    Object.values(data.swimlanes).forEach((swimlane) => {
      swimlane.tasks?.forEach((task) => {
        if (task.start < minStart) minStart = task.start;
        const end = task.start + task.duration;
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
      setZoomIndex(24); // 24 hours zoom level
      toast.info("Timeline zoomed to fit");
      return;
    }
    
    const actualContentDuration = maxEnd - minStart;
    
    // Find best zoom level to fit the content
    let bestZoomIndex = ZOOM_LEVELS.length - 1;
    
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
      const level = ZOOM_LEVELS[i];
      const columns = Math.ceil(actualContentDuration / level.hoursPerColumn);
      const requiredWidth = columns * level.columnWidth;
      
      if (requiredWidth <= viewportWidth) {
        bestZoomIndex = i;
        break;
      }
    }
    
    setZoomIndex(bestZoomIndex);
    
    // Scroll to the start of content
    setTimeout(() => {
      if (scrollContainer && minStart > 0) {
        const bestZoomConfig = ZOOM_LEVELS[bestZoomIndex];
        const scrollTo = (minStart / bestZoomConfig.hoursPerColumn) * bestZoomConfig.columnWidth;
        scrollContainer.scrollLeft = scrollTo;
      }
    }, 0);
    
    toast.info("Timeline zoomed to fit content");
  };

  const handleAddTaskLane = () => {
    addSwimlane("task");
    toast.success("Task swimlane added");
  };

  const handleAddStateLane = () => {
    addSwimlane("state");
    toast.success("State swimlane added");
  };

  const handleAddChild = (parentId: string, type: "task" | "state") => {
    addSwimlane(type, parentId);
    toast.success(`${type} child swimlane added`);
  };

  const handleTaskDoubleClick = (swimlaneId: string, taskId: string) => {
    const swimlane = data.swimlanes[swimlaneId];
    const task = swimlane.tasks?.find((a) => a.id === taskId);
    if (task) {
      setEditDialog({
        open: true,
        swimlaneId,
        itemId: taskId,
        type: "task",
        color: task.color,
        label: task.label || "",
        labelColor: task.labelColor || "#000000",
        description: task.description || "",
        start: task.start,
        duration: task.duration,
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

    if (editDialog.type === "task") {
      updateTask(editDialog.swimlaneId, editDialog.itemId, { color, label, labelColor, description });
    } else {
      updateState(editDialog.swimlaneId, editDialog.itemId, { color, label, labelColor, description });
    }

    toast.success("Item updated");
  };

  const handleAddTask = (swimlaneId: string, start: number) => {
    addTask(swimlaneId, start, zoom.hoursPerColumn * 2);
    toast.success("Task added");
  };

  const handleAddState = (swimlaneId: string, start: number) => {
    addState(swimlaneId, start, zoom.hoursPerColumn * 2);
    toast.success("State added");
  };

  const handleCreateByDrag = (swimlaneId: string, start: number, duration: number) => {
    const swimlane = data.swimlanes[swimlaneId];
    if (!swimlane) return;

    if (swimlane.type === 'task') {
      addTask(swimlaneId, start, duration);
      toast.success("Task created");
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
      const { domToPng } = await import('modern-screenshot');
      
      // Capture the parent container that includes both chart and links
      const exportContainer = document.querySelector('.gantt-export-container') as HTMLElement;
      if (!exportContainer) {
        toast.error("Chart not found");
        return;
      }

      toast.info("Generating image...");
      
      // Temporarily hide scrollbars for clean export
      const originalOverflow = exportContainer.style.overflow;
      exportContainer.style.overflow = 'hidden';
      
      // Capture with modern-screenshot (including SVG links)
      const dataUrl = await domToPng(exportContainer, {
        quality: 1,
        backgroundColor: '#0a0a0a',
        scale: 2,
        features: {
          removeControlCharacter: true,
        }
      });
      
      // Restore scrollbars
      exportContainer.style.overflow = originalOverflow;

      // Download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `gantt-chart-${Date.now()}.png`;
      a.click();
      toast.success("Image exported");
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

  const handleResetToDefault = () => {
    if (confirm("Are you sure you want to reset to the default example? This will replace all current data.")) {
      resetToDefault();
      toast.success("Reset to default example");
    }
  };


  const handleTaskResize = (swimlaneId: string, taskId: string, newStart: number, newDuration: number) => {
    updateTask(swimlaneId, taskId, { start: newStart, duration: newDuration });
  };

  const handleStateResize = (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => {
    updateState(swimlaneId, stateId, { start: newStart, duration: newDuration });
  };

  const handleTaskMove = (fromSwimlaneId: string, taskId: string, toSwimlaneId: string, newStart: number) => {
    const toSwimlane = data.swimlanes[toSwimlaneId];
    if (toSwimlane?.type !== 'task') {
      toast.error("Tasks can only be moved to task swimlanes");
      return;
    }
    moveTask(fromSwimlaneId, taskId, toSwimlaneId, newStart);
  };

  const handleStateMove = (fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => {
    const toSwimlane = data.swimlanes[toSwimlaneId];
    if (toSwimlane?.type !== 'state') {
      toast.error("States can only be moved to state swimlanes");
      return;
    }
    moveState(fromSwimlaneId, stateId, toSwimlaneId, newStart);
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
      const newWidth = Math.max(LAYOUT.MIN_SWIMLANE_WIDTH, Math.min(LAYOUT.MAX_SWIMLANE_WIDTH, resizeStartWidthRef.current + delta));
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

  // Keyboard shortcuts
  useGanttKeyboard({
    containerRef,
    selected,
    selectedLink,
    selectedFlag,
    copiedItem,
    copyGhost,
    canUndo,
    canRedo,
    zoom,
    swimlaneColumnWidth,
    onCopy: () => handleCopy(selected),
    onPaste: handlePaste,
    onCancelCopy: cancelCopy,
    onUndo: undo,
    onRedo: redo,
    onDeleteSwimlane: deleteSwimlane,
    onDeleteTask: deleteTask,
    onDeleteState: deleteState,
    onDeleteLink: deleteLink,
    onDeleteFlag: deleteFlag,
    onAddFlag: addFlag,
    onSelectFlag: setSelectedFlag,
    onOpenFlagDialog: () => setFlagEditDialog(true),
    clearSelection,
  });

  // Mouse wheel zoom handler
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if Ctrl/Cmd is pressed for zoom
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        e.preventDefault();
        
        // Wheel down (deltaY > 0) = zoom out
        // Wheel up (deltaY < 0) = zoom in
        if (e.deltaY < 0) {
          // Zoom in
          if (zoomIndex > 0) {
            setZoomIndex(zoomIndex - 1);
          }
        } else if (e.deltaY > 0) {
          // Zoom out
          if (zoomIndex < ZOOM_LEVELS.length - 1) {
            setZoomIndex(zoomIndex + 1);
          }
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomIndex, setZoomIndex]);

  // Auto-focus container when item is selected
  React.useEffect(() => {
    if (selected && containerRef.current) {
      containerRef.current.focus();
    }
  }, [selected]);


  const renderSwimlanes = (ids: string[], level: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    ids.forEach((id) => {
      const swimlane = data.swimlanes[id];
      if (!swimlane) return;

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
              setSelected({ type, swimlaneId, itemId });
            }}
            onToggleExpand={toggleExpanded}
            onDelete={deleteSwimlane}
            onAddChild={handleAddChild}
            onCreateByDrag={handleCreateByDrag}
            onTaskDoubleClick={handleTaskDoubleClick}
            onStateDoubleClick={handleStateDoubleClick}
            onTaskMove={handleTaskMove}
            onStateMove={handleStateMove}
            onTaskResize={handleTaskResize}
            onStateResize={handleStateResize}
            onSwimlaneNameChange={(id, name) => updateSwimlane(id, { name })}
            onSwimlaneDrop={moveSwimlane}
            checkOverlap={checkOverlap}
            onDragStateChange={createDragStateHandler}
          />
      );

      if (swimlane.expanded && swimlane.children.length > 0) {
        elements.push(...renderSwimlanes(swimlane.children, level + 1));
      }
    });

    return elements;
  };

  const handleAddFlag = (swimlane: "top" | "bottom" = "top") => {
    const scrollContainer = document.querySelector('.overflow-auto');
    const scrollLeft = scrollContainer?.scrollLeft || 0;
    const viewportCenter = scrollLeft + (scrollContainer?.clientWidth || 0) / 2 - swimlaneColumnWidth;
    const position = Math.max(0, Math.round((viewportCenter / zoom.columnWidth) * zoom.hoursPerColumn));
    const flagId = addFlag(position, "New Flag", "#2196f3", undefined, swimlane);
    setSelectedFlag(flagId);
    setFlagEditDialog(true);
    toast.success(`Flag added to ${swimlane} row`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <GanttToolbar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        canZoomIn={zoomIndex > 0}
        canZoomOut={zoomIndex < ZOOM_LEVELS.length - 1}
        onZoomToFit={handleZoomToFit}
        onAddTaskLane={handleAddTaskLane}
        onAddStateLane={handleAddStateLane}
        onAddFlag={handleAddFlag}
        onExport={handleExport}
        onExportPNG={handleExportPNG}
        onImport={handleImport}
        onClear={handleClear}
        onResetToDefault={handleResetToDefault}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        chartTitle={chartTitle}
        onChartTitleChange={setChartTitle}
        showTopFlags={showTopFlags}
        showBottomFlags={showBottomFlags}
        onToggleTopFlags={() => setShowTopFlags(!showTopFlags)}
        onToggleBottomFlags={() => setShowBottomFlags(!showBottomFlags)}
      />

      <div 
        ref={containerRef}
        tabIndex={0}
        className="flex-1 overflow-auto relative outline-none focus:ring-2 focus:ring-primary/20 gantt-export-container"
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
            <div 
              className="sticky left-0 z-40 bg-gantt-header border-r border-border relative"
              style={{ width: `${swimlaneColumnWidth}px`, minWidth: `${swimlaneColumnWidth}px` }}
            >
              <div
                className="h-8 flex items-center px-4 font-semibold text-foreground border-b border-border"
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

          {/* Top Flag Row */}
          {showTopFlags && (
            <GanttFlagRow
              flags={data.flags.filter(f => (f.swimlane || "top") === "top")}
              zoom={zoom}
              totalHours={totalHours}
              swimlaneColumnWidth={swimlaneColumnWidth}
              selectedFlag={selectedFlag}
              onFlagClick={(flagId) => {
                setSelectedFlag(flagId);
                setSelected(null);
                setSelectedLink(null);
                setFlagEditDialog(true);
              }}
              onFlagMove={(flagId, newPosition) => {
                updateFlag(flagId, { position: newPosition });
                toast.success("Flag moved");
              }}
            />
          )}

          {data.rootIds.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Click "Add Swimlane" to get started
            </div>
          ) : (
            <div className="relative">
              {/* Flag vertical lines - behind all content */}
              {(showTopFlags || showBottomFlags) && (
                <GanttFlagLines
                  flags={data.flags.filter(f => {
                    const swimlane = f.swimlane || "top";
                    return (swimlane === "top" && showTopFlags) || (swimlane === "bottom" && showBottomFlags);
                  })}
                  zoom={zoom}
                  swimlaneColumnWidth={swimlaneColumnWidth}
                  selectedFlag={selectedFlag}
                />
              )}
              
              {/* Swimlanes */}
              <div>{renderSwimlanes(data.rootIds)}</div>
              
              {/* Bottom Flag Row */}
              {showBottomFlags && (
                <GanttFlagRow
                  flags={data.flags.filter(f => (f.swimlane || "top") === "bottom")}
                  zoom={zoom}
                  totalHours={totalHours}
                  swimlaneColumnWidth={swimlaneColumnWidth}
                  selectedFlag={selectedFlag}
                  onFlagClick={(flagId) => {
                    setSelectedFlag(flagId);
                    setSelected(null);
                    setSelectedLink(null);
                    setFlagEditDialog(true);
                  }}
                  onFlagMove={(flagId, newPosition) => {
                    updateFlag(flagId, { position: newPosition });
                    toast.success("Flag moved");
                  }}
                />
              )}
            </div>
          )}
        </div>


        <GanttLinks
          data={data}
          zoom={zoom}
          columnWidth={zoom.columnWidth}
          swimlaneColumnWidth={swimlaneColumnWidth}
          selectedLink={selectedLink}
          showTopFlags={showTopFlags}
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


        {/* Drag preview ghost bar */}
        {dragPreview && (() => {
          // Calculate position - ghost is portaled to body, so use viewport coordinates
          const left = dragPreview.mouseX - dragPreview.offsetX;
          const top = dragPreview.mouseY - dragPreview.offsetY;
          const width = (dragPreview.tempDuration / zoom.hoursPerColumn) * zoom.columnWidth;
          
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
          const width = (copyGhost.duration / zoom.hoursPerColumn) * zoom.columnWidth;
          
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
            const item = swimlane.tasks?.find((a) => a.id === linkDragStart.itemId) || 
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
            initialLabel={link.label || ""}
            initialColor={link.color || "#00bcd4"}
            onSave={(label: string, color: string) => {
              updateLink(linkEditDialog.linkId, { label, color });
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

      {flagEditDialog && (() => {
        const flag = selectedFlag ? data.flags.find((f) => f.id === selectedFlag) : null;
        return flag ? (
          <FlagEditDialog
            open={flagEditDialog}
            flag={flag}
            onSave={(flagId, updates) => {
              updateFlag(flagId, updates);
              setFlagEditDialog(false);
              toast.success("Flag updated");
            }}
            onDelete={(flagId) => {
              deleteFlag(flagId);
              setFlagEditDialog(false);
              setSelectedFlag(null);
              toast.success("Flag deleted");
            }}
            onClose={() => {
              setFlagEditDialog(false);
              setSelectedFlag(null);
            }}
          />
        ) : null;
      })()}
    </div>
  );
};
