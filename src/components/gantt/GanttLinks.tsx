import React from "react";
import { GanttData, GanttLink, ZoomLevel } from "@/types/gantt";
import { GridRouter } from "@/lib/gridRouter";

interface GanttLinksProps {
  data: GanttData;
  zoom: ZoomLevel;
  columnWidth: number;
  swimlaneColumnWidth: number;
  selectedLink: string | null;
  onLinkSelect: (linkId: string) => void;
  onLinkDoubleClick: (linkId: string) => void;
  itemTempPositions?: Record<string, { start: number; duration: number; swimlaneId: string }>;
  debugMode?: boolean;
}

interface ItemPosition {
  x: number; // Left edge
  y: number; // Vertical center of ROW
  width: number;
  swimlaneId: string;
  barCenterY: number; // Vertical center of BAR itself (for proper attachment)
}

export const GanttLinks = ({ 
  data, 
  zoom, 
  columnWidth, 
  swimlaneColumnWidth, 
  selectedLink, 
  onLinkSelect, 
  onLinkDoubleClick,
  itemTempPositions = {},
  debugMode = false
}: GanttLinksProps) => {
  const SWIMLANE_HEIGHT = 48;
  const BAR_HEIGHT = 24;
  const GRID_SIZE = 12; // Grid cell size for pathfinding

  // Get item position with support for temp positions during drag
  const getItemPosition = (swimlaneId: string, itemId: string): ItemPosition | null => {
    const tempPos = itemTempPositions[itemId];
    const effectiveSwimlaneId = tempPos?.swimlaneId || swimlaneId;
    
    const swimlane = data.swimlanes[effectiveSwimlaneId];
    if (!swimlane) return null;

    const item = swimlane.activities?.find((a) => a.id === itemId) || 
                 swimlane.states?.find((s) => s.id === itemId);
    if (!item) return null;
    
    const itemStart = tempPos?.start ?? item.start;
    const itemDuration = tempPos?.duration ?? item.duration;

    // Calculate vertical position - Y is the TOP of the swimlane row
    const rowTop = findYPosition(effectiveSwimlaneId);
    if (rowTop === null) return null;
    
    const x = (itemStart / zoom) * columnWidth + swimlaneColumnWidth;
    const width = (itemDuration / zoom) * columnWidth;
    
    // CRITICAL FIX: Calculate exact bar center matching CSS rendering
    // The row container is h-12 (48px tall)
    // Activity bars: h-6 (24px), style={{ top: '50%', transform: 'translateY(-50%)' }}
    //   - CSS centers it: actual position is rowTop + 24px (middle of 48px row)
    //   - Bar spans from rowTop + 12px to rowTop + 36px
    //   - Bar center: rowTop + 24px
    // State bars: h-full (48px), style={{ top: 0 }}
    //   - Top-aligned: starts at rowTop + 0px
    //   - Bar spans from rowTop + 0px to rowTop + 48px  
    //   - Bar center: rowTop + 24px
    
    const isStateBar = swimlane.type === 'state';
    
    // For activity bars: center of the 24px bar centered in 48px row = rowTop + 24
    // For state bars: center of the 48px bar in 48px row = rowTop + 24
    const barCenterY = rowTop + 24;

    return {
      x,
      y: rowTop + 24, // Keep for backward compatibility
      width,
      swimlaneId: effectiveSwimlaneId,
      barCenterY
    };
  };

  const findYPosition = (swimlaneId: string): number | null => {
    let currentY = SWIMLANE_HEIGHT; // Start after header
    
    for (const rootId of data.rootIds) {
      const result = traverseSwimlane(rootId, swimlaneId, currentY);
      if (result !== null) return result;
      currentY += getVisibleHeight(rootId);
    }
    return null;
  };

  const traverseSwimlane = (currentId: string, targetId: string, currentY: number): number | null => {
    if (currentId === targetId) return currentY;
    
    const current = data.swimlanes[currentId];
    if (!current) return null;
    
    let nextY = currentY + SWIMLANE_HEIGHT;
    
    if (current.expanded && current.children.length > 0) {
      for (const childId of current.children) {
        const childResult = traverseSwimlane(childId, targetId, nextY);
        if (childResult !== null) return childResult;
        nextY += getVisibleHeight(childId);
      }
    }
    
    return null;
  };

  const getVisibleHeight = (id: string): number => {
    const swimlane = data.swimlanes[id];
    if (!swimlane) return 0;
    
    let height = SWIMLANE_HEIGHT;
    if (swimlane.expanded) {
      for (const childId of swimlane.children) {
        height += getVisibleHeight(childId);
      }
    }
    return height;
  };

  const calculateTotalHeight = () => {
    let height = SWIMLANE_HEIGHT; // Header
    data.rootIds.forEach(id => {
      height += getVisibleHeight(id);
    });
    return height;
  };

  const calculateTotalWidth = () => {
    let maxHour = 240;
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
    const totalHours = Math.ceil((maxHour * 1.2) / 24) * 24;
    return swimlaneColumnWidth + (totalHours / zoom) * columnWidth;
  };

  // Collect all obstacles (bars) for pathfinding
  const collectObstacles = () => {
    const obstacles: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      
      items.forEach(item => {
        const pos = getItemPosition(swimlaneId, item.id);
        if (pos) {
          obstacles.push({
            x: pos.x,
            y: pos.y - BAR_HEIGHT / 2,
            width: pos.width,
            height: BAR_HEIGHT
          });
        }
      });
    });
    
    return obstacles;
  };

  const renderLink = (link: GanttLink) => {
    const fromPos = getItemPosition(link.fromSwimlaneId, link.fromId);
    const toPos = getItemPosition(link.toSwimlaneId, link.toId);

    if (!fromPos || !toPos) return null;

    // CRITICAL: Attachment points must be at the EXACT middle of the bar side
    // Determine horizontal attachment points (left or right edge of bar)
    let startX = fromPos.x + fromPos.width; // Default: finish (right edge)
    let endX = toPos.x; // Default: start (left edge)

    switch (link.type) {
      case 'SS': // Start-to-Start
        startX = fromPos.x; // Left edge of from bar
        endX = toPos.x; // Left edge of to bar
        break;
      case 'SF': // Start-to-Finish
        startX = fromPos.x; // Left edge of from bar
        endX = toPos.x + toPos.width; // Right edge of to bar
        break;
      case 'FF': // Finish-to-Finish
        startX = fromPos.x + fromPos.width; // Right edge of from bar
        endX = toPos.x + toPos.width; // Right edge of to bar
        break;
      case 'FS': // Finish-to-Start (default)
      default:
        startX = fromPos.x + fromPos.width; // Right edge of from bar
        endX = toPos.x; // Left edge of to bar
        break;
    }

    // Use barCenterY for exact vertical center attachment
    const start = { x: startX, y: fromPos.barCenterY };
    const end = { x: endX, y: toPos.barCenterY };

    // Special case: same position
    if (Math.abs(start.x - end.x) < 5 && Math.abs(start.y - end.y) < 5) {
      return null;
    }

    // Collect obstacles, excluding the connected items
    const obstacles = collectObstacles().filter(obs => {
      const isFromBar = Math.abs(obs.x - fromPos.x) < 1 && Math.abs(obs.y - (fromPos.y - BAR_HEIGHT / 2)) < 1;
      const isToBar = Math.abs(obs.x - toPos.x) < 1 && Math.abs(obs.y - (toPos.y - BAR_HEIGHT / 2)) < 1;
      return !isFromBar && !isToBar;
    });

    // Use grid-based A* routing
    const chartWidth = calculateTotalWidth();
    const chartHeight = calculateTotalHeight();
    
    const router = new GridRouter(chartWidth, chartHeight, GRID_SIZE, obstacles);
    const pathPoints = router.findPath(start, end);
    
    if (!pathPoints) return null;

    const path = GridRouter.createSVGPath(pathPoints, 8);
    
    const isSelected = selectedLink === link.id;
    const linkColor = link.color || "#00bcd4";
    const markerId = `arrowhead-${link.id}`;

    return (
      <g key={link.id}>
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth="12"
          fill="none"
          className="cursor-pointer"
          style={{ pointerEvents: 'all' }}
          onClick={(e) => {
            e.stopPropagation();
            onLinkSelect(isSelected ? "" : link.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onLinkDoubleClick(link.id);
          }}
        />
        
        {/* Visible path */}
        <path
          d={path}
          stroke={isSelected ? "hsl(var(--destructive))" : linkColor}
          strokeWidth={isSelected ? "3" : "2"}
          fill="none"
          markerEnd={`url(#${markerId})`}
          opacity={isSelected ? "1" : "0.7"}
          className="pointer-events-none transition-all duration-200"
          style={{
            filter: isSelected ? 'drop-shadow(0 0 4px hsl(var(--destructive)))' : undefined
          }}
        />
        
        {/* Arrowhead marker */}
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="2.5"
            orient="auto"
          >
            <polygon
              points="0 0, 8 2.5, 0 5"
              fill={isSelected ? "hsl(var(--destructive))" : linkColor}
            />
          </marker>
        </defs>
        
        {/* Link label */}
        {link.label && (
          <foreignObject
            x={start.x + (end.x - start.x) / 2 - 40}
            y={start.y + (end.y - start.y) / 2 - 12}
            width="80"
            height="24"
            className="pointer-events-none"
          >
            <div className="flex items-center justify-center">
              <span className="text-xs font-medium px-2 py-1 bg-background border border-border rounded shadow-sm">
                {link.label}
              </span>
            </div>
          </foreignObject>
        )}
        
        {/* Link type badge */}
        {link.type !== 'FS' && (
          <foreignObject
            x={start.x + (end.x - start.x) / 2 - 15}
            y={start.y + (end.y - start.y) / 2 + 12}
            width="30"
            height="20"
            className="pointer-events-none"
          >
            <div className="flex items-center justify-center">
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary text-primary-foreground rounded">
                {link.type}
              </span>
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ 
        zIndex: 40,
        left: 0,
        top: 0,
        width: '100%',
        height: `${calculateTotalHeight()}px`,
        overflow: 'visible'
      }}
    >
      {data.links.map(renderLink)}
      
      {/* Debug mode: Show attachment points and bar boundaries */}
      {debugMode && data.links.map(link => {
        const fromPos = getItemPosition(link.fromSwimlaneId, link.fromId);
        const toPos = getItemPosition(link.toSwimlaneId, link.toId);
        
        if (!fromPos || !toPos) return null;

        let startX = fromPos.x + fromPos.width;
        let endX = toPos.x;

        switch (link.type) {
          case 'SS':
            startX = fromPos.x;
            endX = toPos.x;
            break;
          case 'SF':
            startX = fromPos.x;
            endX = toPos.x + toPos.width;
            break;
          case 'FF':
            startX = fromPos.x + fromPos.width;
            endX = toPos.x + toPos.width;
            break;
        }
        
        return (
          <g key={`debug-${link.id}`}>
            {/* Show bar boundaries */}
            <rect
              x={fromPos.x}
              y={fromPos.barCenterY - BAR_HEIGHT / 2}
              width={fromPos.width}
              height={BAR_HEIGHT}
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity="0.5"
            />
            <rect
              x={toPos.x}
              y={toPos.barCenterY - BAR_HEIGHT / 2}
              width={toPos.width}
              height={BAR_HEIGHT}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity="0.5"
            />
            
            {/* From attachment point - at exact bar center */}
            <circle
              cx={startX}
              cy={fromPos.barCenterY}
              r="6"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <line
              x1={startX - 10}
              y1={fromPos.barCenterY}
              x2={startX + 10}
              y2={fromPos.barCenterY}
              stroke="#10b981"
              strokeWidth="2"
            />
            <line
              x1={startX}
              y1={fromPos.barCenterY - 10}
              x2={startX}
              y2={fromPos.barCenterY + 10}
              stroke="#10b981"
              strokeWidth="2"
            />
            
            {/* To attachment point - at exact bar center */}
            <circle
              cx={endX}
              cy={toPos.barCenterY}
              r="6"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <line
              x1={endX - 10}
              y1={toPos.barCenterY}
              x2={endX + 10}
              y2={toPos.barCenterY}
              stroke="#ef4444"
              strokeWidth="2"
            />
            <line
              x1={endX}
              y1={toPos.barCenterY - 10}
              x2={endX}
              y2={toPos.barCenterY + 10}
              stroke="#ef4444"
              strokeWidth="2"
            />
            
            {/* Labels */}
            <text
              x={startX + 12}
              y={fromPos.barCenterY - 12}
              fill="#10b981"
              fontSize="10"
              fontWeight="bold"
            >
              FROM ({Math.round(startX)}, {Math.round(fromPos.barCenterY)})
            </text>
            <text
              x={endX + 12}
              y={toPos.barCenterY + 20}
              fill="#ef4444"
              fontSize="10"
              fontWeight="bold"
            >
              TO ({Math.round(endX)}, {Math.round(toPos.barCenterY)})
            </text>
          </g>
        );
      })}
    </svg>
  );
};
