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
    addLink,
    deleteLink,
    updateLink,
    updateSwimlane,
    clearAll,
    exportData,
    importData,
  } = useGanttData();

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    swimlaneId: string;
    itemId: string;
    type: "activity" | "state";
    color: string;
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

  // Ref for the main container to handle keyboard events
  const containerRef = React.useRef<HTMLDivElement>(null);

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

    const viewportWidth = scrollContainer.clientWidth - 280; // Subtract swimlane name column width
    
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
        description: state.description || "",
        start: state.start,
        duration: state.duration,
      });
    }
  };

  const handleEditSave = (color: string, description: string) => {
    if (!editDialog) return;

    if (editDialog.type === "activity") {
      updateActivity(editDialog.swimlaneId, editDialog.itemId, { color, description });
    } else {
      updateState(editDialog.swimlaneId, editDialog.itemId, { color, description });
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

  // Delete key handler - attached to container
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('[GanttChart] Delete key pressed', { selected, selectedLink });
      if (e.key === 'Delete') {
        if (selectedLink) {
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
  }, [selected, selectedLink, deleteSwimlane, deleteActivity, deleteState, deleteLink]);

  // Auto-focus container when item is selected
  React.useEffect(() => {
    if (selected && containerRef.current) {
      containerRef.current.focus();
    }
  }, [selected]);

  const handleDragStateChange = (itemId: string, swimlaneId: string) => 
    (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => {
      if (isDragging && targetSwimlaneId) {
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
      } else {
        setDragPreview(null);
      }
    };

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
          checkOverlap={checkOverlap}
          onDragStateChange={handleDragStateChange}
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
      <GanttToolbar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomToFit={handleZoomToFit}
        onAddActivityLane={handleAddActivityLane}
        onAddStateLane={handleAddStateLane}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />

      <div 
        ref={containerRef}
        tabIndex={0}
        className="flex-1 overflow-auto relative outline-none focus:ring-2 focus:ring-primary/20"
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.inline-block')) {
            setSelected(null);
            setSelectedLink(null);
          }
        }}
      >
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="sticky left-0 z-20 bg-gantt-header border-r-2 border-border">
              <div
                className="h-12 flex items-center px-4 font-semibold text-foreground border-b-2 border-border"
                style={{ width: "280px", minWidth: "280px" }}
              >
                Swimlanes
              </div>
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

        {/* Render links */}
        <GanttLinks
          data={data}
          zoom={zoom}
          columnWidth={zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80}
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
        />

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
