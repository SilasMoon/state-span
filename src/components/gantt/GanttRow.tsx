import React, { useState } from "react";
import { GanttSwimlane, ZoomConfig } from "@/types/gantt";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GanttBar } from "./GanttBar";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GanttRowProps {
  swimlane: GanttSwimlane;
  level: number;
  zoom: ZoomConfig;
  totalHours: number;
  swimlaneColumnWidth: number;
  selected: { type: "swimlane" | "task" | "state"; swimlaneId: string; itemId?: string } | null;
  onSelect: (type: "swimlane" | "task" | "state", swimlaneId: string, itemId?: string) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type: "task" | "state") => void;
  onCreateByDrag: (swimlaneId: string, start: number, duration: number) => void;
  onTaskDoubleClick: (swimlaneId: string, taskId: string) => void;
  onStateDoubleClick: (swimlaneId: string, stateId: string) => void;
  onTaskMove: (fromSwimlaneId: string, taskId: string, toSwimlaneId: string, newStart: number) => void;
  onStateMove: (fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => void;
  onTaskResize: (swimlaneId: string, taskId: string, newStart: number, newDuration: number) => void;
  onStateResize: (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => void;
  onSwimlaneNameChange: (id: string, name: string) => void;
  onSwimlaneDrop: (swimlaneId: string, targetParentId: string | null, insertBeforeId: string | null) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
  onDragStateChange: (itemId: string, swimlaneId: string, itemColor: string) => (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => void;
}

export const GanttRow = React.memo(({
  swimlane,
  level,
  zoom,
  totalHours,
  swimlaneColumnWidth,
  selected,
  onSelect,
  onToggleExpand,
  onDelete,
  onAddChild,
  onCreateByDrag,
  onTaskDoubleClick,
  onStateDoubleClick,
  onTaskMove,
  onStateMove,
  onTaskResize,
  onStateResize,
  onSwimlaneNameChange,
  onSwimlaneDrop,
  checkOverlap,
  onDragStateChange,
}: GanttRowProps) => {
  const columnWidth = zoom.columnWidth;
  const columns = Math.ceil(totalHours / zoom.hoursPerColumn);

  const hasChildren = swimlane.children.length > 0;

  const [dragCreation, setDragCreation] = useState<{
    startHour: number;
    currentHour: number;
    hasMoved: boolean;
  } | null>(null);

  const [dragOver, setDragOver] = useState<'top' | 'bottom' | 'inside' | null>(null);

  const renderGrid = () => {
    // Optimize: Use CSS grid background instead of individual div elements for performance
    // This is especially important for high zoom levels (L7-L11) where columns can number in thousands
    return (
      <div
        className="gantt-grid-background absolute inset-0 cursor-crosshair"
        style={{
          backgroundImage: `repeating-linear-gradient(to right,
            hsl(var(--gantt-grid)) 0px,
            hsl(var(--gantt-grid)) 1px,
            transparent 1px,
            transparent ${columnWidth}px)`,
          opacity: `var(--gantt-grid-opacity)`,
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return; // Only left click

          // Disable drag creation for parent swimlanes
          if (hasChildren) {
            return;
          }

          // Check if there's a bar or handle at the click position
          const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
          const clickedOnBar = elementsAtPoint.some(el => el.hasAttribute('data-item-id'));
          const clickedOnHandle = elementsAtPoint.some(el => el.hasAttribute('data-handle-type'));

          if (clickedOnBar || clickedOnHandle) {
            // Let the bar handle its own events
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          // Calculate hour based on mouse position
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const columnIndex = Math.floor(offsetX / columnWidth);
          const hour = columnIndex * zoom.hoursPerColumn;

          setDragCreation({ startHour: hour, currentHour: hour, hasMoved: false });
        }}
      />
    );
  };

  // Handle drag creation
  React.useEffect(() => {
    if (!dragCreation) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Find the grid element for this swimlane
      const swimlaneElement = document.querySelector(`[data-swimlane-id="${swimlane.id}"]`);
      if (!swimlaneElement) return;

      const gridElement = swimlaneElement.querySelector('.gantt-grid-background');
      if (!gridElement) return;

      const rect = gridElement.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;

      // Calculate current hour based on mouse position
      if (offsetX >= 0) {
        const columnIndex = Math.floor(offsetX / columnWidth);
        const currentHour = columnIndex * zoom.hoursPerColumn;

        setDragCreation(prev => {
          if (!prev) return null;
          const hasMoved = Math.abs(prev.startHour - currentHour) >= zoom.hoursPerColumn;
          return { ...prev, currentHour, hasMoved };
        });
      }
    };

    const handleMouseUp = () => {
      if (dragCreation) {
        // Only create if the user actually dragged to a different cell
        if (dragCreation.hasMoved) {
          const start = Math.min(dragCreation.startHour, dragCreation.currentHour);
          const end = Math.max(dragCreation.startHour, dragCreation.currentHour);
          const duration = Math.max(zoom.hoursPerColumn, end - start + zoom.hoursPerColumn); // Minimum 1 column

          // Check for overlap before creating
          if (!checkOverlap(swimlane.id, 'temp-creation', start, duration)) {
            onCreateByDrag(swimlane.id, start, duration);
          } else {
            toast.error("Cannot create: overlaps with existing item");
          }
        }

        setDragCreation(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragCreation, zoom, swimlane.id, onCreateByDrag, checkOverlap]);

  const isRowSelected = selected?.swimlaneId === swimlane.id;

  // Drag and drop handlers for swimlane reordering
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('swimlane-id', swimlane.id);
    e.dataTransfer.setData('swimlane-type', swimlane.type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.types.includes('swimlane-id') ? 'swimlane' : null;
    if (!draggedId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Determine drop zone: top third, middle third, or bottom third
    if (y < height * 0.25) {
      setDragOver('top');
    } else if (y > height * 0.75) {
      setDragOver('bottom');
    } else {
      setDragOver('inside');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the container itself, not entering a child
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOver(null);
    }
  };

  const handleDragEnd = () => {
    // Always clear drag state when drag ends
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('swimlane-id');
    const draggedType = e.dataTransfer.getData('swimlane-type');
    
    if (!draggedId || draggedId === swimlane.id) {
      setDragOver(null);
      return;
    }

    if (dragOver === 'top') {
      // Insert before this swimlane
      onSwimlaneDrop(draggedId, swimlane.parentId || null, swimlane.id);
      toast.success("Swimlane moved");
    } else if (dragOver === 'bottom') {
      // Insert after this swimlane by passing this ID as insertBeforeId with special handling
      // The moveSwimlane function will need to handle finding the next sibling
      onSwimlaneDrop(draggedId, swimlane.parentId || null, `after:${swimlane.id}`);
      toast.success("Swimlane moved");
    } else if (dragOver === 'inside') {
      // Make this swimlane the parent
      onSwimlaneDrop(draggedId, swimlane.id, null);
      toast.success("Swimlane moved");
    }

    setDragOver(null);
  };

  return (
    <div
      className={`flex transition-colors relative ${
        dragOver === 'top' ? 'border-t-4 border-t-primary' : ''
      } ${dragOver === 'bottom' ? 'border-b-4 border-b-primary' : ''} ${
        dragOver === 'inside' ? 'bg-primary/10' : ''
      }`}
      data-swimlane-id={swimlane.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`sticky left-0 z-40 bg-card border-r border-border flex items-center gap-2 px-3 py-1 group transition-colors relative ${
          isRowSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted/50'
        }`}
        style={{ width: `${swimlaneColumnWidth}px`, minWidth: `${swimlaneColumnWidth}px`, paddingLeft: `${level * 20 + 12}px` }}
        draggable
        onDragStart={handleDragStart}
      >
        {/* Background clickable area for selection */}
        <div
          className="absolute inset-0 cursor-pointer z-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelect('swimlane', swimlane.id);
          }}
        />
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0 relative z-10"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(swimlane.id);
            }}
          >
            {swimlane.expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-6 flex-shrink-0" />}
        
        <input
          type="text"
          value={swimlane.name}
          onChange={(e) => onSwimlaneNameChange(swimlane.id, e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground cursor-text min-w-0 flex-1 focus:ring-1 focus:ring-primary/30 rounded px-1 relative z-10"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        />
        
        <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
          {/* Only show type label for non-parent swimlanes or nested swimlanes */}
          {(!hasChildren || swimlane.parentId) && (
            <span
              className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                swimlane.type === "task"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/20 text-secondary"
              }`}
            >
              {swimlane.type}
            </span>
          )}

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "task")}>
                  Add Task Child
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "state")}>
                  Add State Child
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="relative flex h-8" style={{ minWidth: `${columns * columnWidth}px` }}>
        {renderGrid()}
        
        {/* Drag creation preview */}
        {dragCreation && (() => {
          const start = Math.min(dragCreation.startHour, dragCreation.currentHour);
          const end = Math.max(dragCreation.startHour, dragCreation.currentHour);
          const duration = end - start + zoom.hoursPerColumn;
          
          const left = (start / zoom.hoursPerColumn) * columnWidth;
          const width = (duration / zoom.hoursPerColumn) * columnWidth;
          const isTaskLane = swimlane.type === 'task';
          const wouldOverlap = checkOverlap(swimlane.id, 'temp-creation', start, duration);
          
          return (
            <div
              className={`absolute ${isTaskLane ? 'h-6 rounded top-1/2 -translate-y-1/2' : 'h-full top-0'} border-2 border-dashed pointer-events-none z-30`}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundColor: wouldOverlap 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : (isTaskLane ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'),
                borderColor: wouldOverlap 
                  ? 'rgb(239, 68, 68)' 
                  : (isTaskLane ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 247)'),
              }}
            />
          );
        })()}
        
        <div className="absolute inset-0 pointer-events-none">
          {/* Render horizontal delimiter for root-level swimlanes with children */}
          {!swimlane.parentId && hasChildren && (
            <div 
              className="absolute top-1/2 left-0 right-0 h-0.5 bg-gantt-grid pointer-events-none z-10"
              style={{ 
                transform: 'translateY(-50%)'
              }}
            />
          )}
          
          {/* Render individual items for leaf swimlanes */}
          {!hasChildren && swimlane.type === "task" &&
            swimlane.tasks?.map((task) => (
              <GanttBar
                key={task.id}
                item={task}
                swimlaneId={swimlane.id}
                swimlaneType={swimlane.type}
                zoom={zoom}
                columnWidth={columnWidth}
                isSelected={selected?.type === 'task' && selected.swimlaneId === swimlane.id && selected.itemId === task.id}
                onDoubleClick={() => onTaskDoubleClick(swimlane.id, task.id)}
                onSelect={() => {
                  onSelect('task', swimlane.id, task.id);
                }}
                onMove={(toSwimlaneId, newStart) => onTaskMove(swimlane.id, task.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onTaskResize(swimlane.id, task.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(task.id, swimlane.id, task.color)}
              />
            ))}
          {!hasChildren && swimlane.type === "state" &&
            swimlane.states?.map((state) => (
              <GanttBar
                key={state.id}
                item={state}
                swimlaneId={swimlane.id}
                swimlaneType={swimlane.type}
                zoom={zoom}
                columnWidth={columnWidth}
                isSelected={selected?.type === 'state' && selected.swimlaneId === swimlane.id && selected.itemId === state.id}
                onDoubleClick={() => onStateDoubleClick(swimlane.id, state.id)}
                onSelect={() => {
                  onSelect('state', swimlane.id, state.id);
                }}
                onMove={(toSwimlaneId, newStart) => onStateMove(swimlane.id, state.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onStateResize(swimlane.id, state.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(state.id, swimlane.id, state.color)}
              />
            ))}
        </div>
      </div>
    </div>
  );
});
