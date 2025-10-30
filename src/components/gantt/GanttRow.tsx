import React, { useState } from "react";
import { GanttSwimlane, ZoomLevel } from "@/types/gantt";
import { ChevronRight, ChevronDown, Trash2, Plus } from "lucide-react";
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
  zoom: ZoomLevel;
  totalHours: number;
  selected: { type: "swimlane" | "activity" | "state"; swimlaneId: string; itemId?: string } | null;
  onSelect: (type: "swimlane" | "activity" | "state", swimlaneId: string, itemId?: string) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type: "activity" | "state") => void;
  onCreateByDrag: (swimlaneId: string, start: number, duration: number) => void;
  onActivityDoubleClick: (swimlaneId: string, activityId: string) => void;
  onStateDoubleClick: (swimlaneId: string, stateId: string) => void;
  onActivityMove: (fromSwimlaneId: string, activityId: string, toSwimlaneId: string, newStart: number) => void;
  onStateMove: (fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => void;
  onActivityResize: (swimlaneId: string, activityId: string, newStart: number, newDuration: number) => void;
  onStateResize: (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => void;
  onSwimlaneNameChange: (id: string, name: string) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
  onDragStateChange: (itemId: string, swimlaneId: string) => (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => void;
  summaryBar: { start: number; duration: number; hasContent: boolean } | null;
}

export const GanttRow = ({
  swimlane,
  level,
  zoom,
  totalHours,
  selected,
  onSelect,
  onToggleExpand,
  onDelete,
  onAddChild,
  onCreateByDrag,
  onActivityDoubleClick,
  onStateDoubleClick,
  onActivityMove,
  onStateMove,
  onActivityResize,
  onStateResize,
  onSwimlaneNameChange,
  checkOverlap,
  onDragStateChange,
  summaryBar,
}: GanttRowProps) => {
  const columnWidth = zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80;
  const columns = Math.ceil(totalHours / zoom);

  const hasChildren = swimlane.children.length > 0;

  const [dragCreation, setDragCreation] = useState<{
    startHour: number;
    currentHour: number;
    hasMoved: boolean;
  } | null>(null);

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < columns; i++) {
      cells.push(
        <div
          key={i}
          data-cell-index={i}
          className="border-r border-gantt-grid h-full cursor-crosshair"
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
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
            
            console.log('[GanttRow] Grid cell mousedown:', {
              clickedOnBar,
              clickedOnHandle,
              elementsAtPoint: elementsAtPoint.map(el => ({
                tag: el.tagName,
                classes: el.className,
                dataItemId: el.getAttribute('data-item-id'),
                dataHandleType: el.getAttribute('data-handle-type')
              }))
            });
            
            if (clickedOnBar || clickedOnHandle) {
              // Let the bar handle its own events
              console.log('[GanttRow] Returning early - bar or handle detected');
              return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            console.log('[GanttRow] Starting drag creation');
            const hour = i * zoom;
            setDragCreation({ startHour: hour, currentHour: hour, hasMoved: false });
          }}
        />
      );
    }
    return cells;
  };

  // Handle drag creation
  React.useEffect(() => {
    if (!dragCreation) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cell = target?.closest('[data-cell-index]');
      if (cell) {
        const cellIndex = parseInt(cell.getAttribute('data-cell-index') || '0');
        const currentHour = cellIndex * zoom;
        setDragCreation(prev => {
          if (!prev) return null;
          const hasMoved = prev.startHour !== currentHour;
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
          const duration = Math.max(zoom, end - start + zoom); // Minimum 1 column

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

  const isRowSelected = selected?.type === 'swimlane' && selected.swimlaneId === swimlane.id;

  return (
    <div
      className={`flex transition-colors border-b border-gantt-grid`}
      data-swimlane-id={swimlane.id}
    >
      <div
        className={`sticky left-0 z-10 bg-card border-r border-border flex items-center gap-2 px-3 py-2 group ${
          isRowSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
        }`}
        style={{ width: "280px", minWidth: "280px", paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => onToggleExpand(swimlane.id)}
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
          className="bg-transparent border-none outline-none text-sm text-foreground cursor-text min-w-0 flex-1 mr-3 focus:ring-1 focus:ring-primary/30 rounded px-1"
          onClick={() => onSelect('swimlane', swimlane.id)}
        />
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
              swimlane.type === "activity"
                ? "bg-primary/20 text-primary"
                : "bg-secondary/20 text-secondary"
            }`}
          >
            {swimlane.type}
          </span>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "activity")}>
                  Add Activity Child
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "state")}>
                  Add State Child
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(swimlane.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex h-12" style={{ minWidth: `${columns * columnWidth}px` }}>
        <div className="absolute inset-0 flex">{renderGrid()}</div>
        
        {/* Drag creation preview */}
        {dragCreation && (() => {
          const start = Math.min(dragCreation.startHour, dragCreation.currentHour);
          const end = Math.max(dragCreation.startHour, dragCreation.currentHour);
          const duration = end - start + zoom;
          
          const left = (start / zoom) * columnWidth;
          const width = (duration / zoom) * columnWidth;
          const isActivityLane = swimlane.type === 'activity';
          const wouldOverlap = checkOverlap(swimlane.id, 'temp-creation', start, duration);
          
          return (
            <div
              className={`absolute ${isActivityLane ? 'h-6 rounded top-1/2 -translate-y-1/2' : 'h-full top-0'} border-2 border-dashed pointer-events-none z-30`}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundColor: wouldOverlap 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : (isActivityLane ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'),
                borderColor: wouldOverlap 
                  ? 'rgb(239, 68, 68)' 
                  : (isActivityLane ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 247)'),
              }}
            />
          );
        })()}
        
        <div className="absolute inset-0 pointer-events-none">
          {/* Render summary bar for parent swimlanes */}
          {hasChildren && summaryBar && summaryBar.hasContent && (
            <GanttBar
              key={`summary-${swimlane.id}`}
              item={{
                id: `summary-${swimlane.id}`,
                start: summaryBar.start,
                duration: summaryBar.duration,
                color: swimlane.type === "activity" ? "#94a3b8" : "#a78bfa",
                label: `${swimlane.children.length} child${swimlane.children.length > 1 ? 'ren' : ''}`,
                labelColor: "#ffffff",
                description: `Aggregated from ${swimlane.children.length} sub-swimlane${swimlane.children.length > 1 ? 's' : ''}`,
              }}
              swimlaneId={swimlane.id}
              swimlaneType={swimlane.type}
              zoom={zoom}
              columnWidth={columnWidth}
              isSelected={false}
              isSummary={true}
              onDoubleClick={() => {}}
              onSelect={() => {}}
              onMove={() => {}}
              onResize={() => {}}
              checkOverlap={checkOverlap}
            />
          )}
          
          {/* Render individual items for leaf swimlanes */}
          {!hasChildren && swimlane.type === "activity" &&
            swimlane.activities?.map((activity) => (
              <GanttBar
                key={activity.id}
                item={activity}
                swimlaneId={swimlane.id}
                swimlaneType={swimlane.type}
                zoom={zoom}
                columnWidth={columnWidth}
                isSelected={selected?.type === 'activity' && selected.swimlaneId === swimlane.id && selected.itemId === activity.id}
                onDoubleClick={() => onActivityDoubleClick(swimlane.id, activity.id)}
                onSelect={() => {
                  console.log('[GanttRow] Activity onSelect callback', { swimlaneId: swimlane.id, activityId: activity.id });
                  onSelect('activity', swimlane.id, activity.id);
                }}
                onMove={(toSwimlaneId, newStart) => onActivityMove(swimlane.id, activity.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onActivityResize(swimlane.id, activity.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(activity.id, swimlane.id)}
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
                  console.log('[GanttRow] State onSelect callback', { swimlaneId: swimlane.id, stateId: state.id });
                  onSelect('state', swimlane.id, state.id);
                }}
                onMove={(toSwimlaneId, newStart) => onStateMove(swimlane.id, state.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onStateResize(swimlane.id, state.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(state.id, swimlane.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
