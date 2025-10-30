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

  // Ref to SVG element to get its position for coordinate transformation
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  // Force re-render when positions change (for scroll/resize)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  // Update positions when chart scrolls or resizes
  // Use useLayoutEffect to read DOM after layout but before paint
  React.useLayoutEffect(() => {
    const container = document.querySelector('.overflow-auto');
    if (!container) return;
    
    const handleUpdate = () => forceUpdate();
    container.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);
    
    // Initial update to ensure positions are read after bars are rendered
    forceUpdate();
    
    return () => {
      container.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [data, itemTempPositions]); // Re-run when data or temp positions change

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

    // Calculate vertical position
    const rowTop = findYPosition(effectiveSwimlaneId);
    if (rowTop === null) return null;
    
    // CRITICAL FIX: Use actual DOM position to handle scroll offset
    // Find the actual bar element in the DOM
    const barElement = document.querySelector(`[data-item-id="${item.id}"][data-swimlane-id="${effectiveSwimlaneId}"]`);
    
    let x, width;
    
    if (barElement && svgRef.current) {
      // Get positions relative to viewport
      const barRect = barElement.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();
      
      // Convert to SVG coordinate system
      x = barRect.left - svgRect.left;
      width = barRect.width;
      
      // CRITICAL: Also get Y position from DOM for consistency
      // The bar's visual center in SVG coordinates
      const barCenterY = (barRect.top + barRect.height / 2) - svgRect.top;
      
      return {
        x,
        y: rowTop + 24, // Keep for legacy compatibility
        width,
        swimlaneId: effectiveSwimlaneId,
        barCenterY
      };
    } else {
      // Fallback: calculate from data (won't account for scroll)
      x = (itemStart / zoom) * columnWidth;
      width = (itemDuration / zoom) * columnWidth;
    }
    
    // Fallback: calculate barCenterY from row position
    const barCenterY = rowTop + (SWIMLANE_HEIGHT / 2);

    return {
      x,
      y: rowTop + 24,
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

    // CRITICAL: Match EXACT handle center positions from GanttBar.tsx
    // Handles are w-5 (20px) with left edge at:
    //   - Start: left - 12px  → center at: left - 12 + 10 = left - 2
    //   - Finish: left + width - 12px  → center at: left + width - 12 + 10 = left + width - 2
    const HANDLE_OFFSET = 2; // Handles are 2px inward from bar edges
    
    let startX = fromPos.x + fromPos.width - HANDLE_OFFSET; // Default: finish handle center
    let endX = toPos.x - HANDLE_OFFSET; // Default: start handle center

    switch (link.type) {
      case 'SS': // Start-to-Start
        startX = fromPos.x - HANDLE_OFFSET; // Start handle center of from bar
        endX = toPos.x - HANDLE_OFFSET; // Start handle center of to bar
        break;
      case 'SF': // Start-to-Finish
        startX = fromPos.x - HANDLE_OFFSET; // Start handle center of from bar
        endX = toPos.x + toPos.width - HANDLE_OFFSET; // Finish handle center of to bar
        break;
      case 'FF': // Finish-to-Finish
        startX = fromPos.x + fromPos.width - HANDLE_OFFSET; // Finish handle center of from bar
        endX = toPos.x + toPos.width - HANDLE_OFFSET; // Finish handle center of to bar
        break;
      case 'FS': // Finish-to-Start (default)
      default:
        startX = fromPos.x + fromPos.width - HANDLE_OFFSET; // Finish handle center of from bar
        endX = toPos.x - HANDLE_OFFSET; // Start handle center of to bar
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
      ref={svgRef}
      className="absolute pointer-events-none"
      style={{ 
        zIndex: 40,
        left: `${swimlaneColumnWidth}px`, // Offset SVG to start after swimlane column
        top: 0,
        width: `calc(100% - ${swimlaneColumnWidth}px)`,
        height: `${calculateTotalHeight()}px`,
        overflow: 'visible'
      }}
    >
      {/* Clip path to prevent links from showing behind swimlane column */}
      <defs>
        <clipPath id="gantt-links-clip">
          <rect x="0" y="0" width="100%" height="100%" />
        </clipPath>
      </defs>
      
      <g clipPath="url(#gantt-links-clip)">
        {data.links.map(renderLink)}
      </g>
      
      {/* Debug mode: Show attachment points and bar boundaries with detailed info */}
      {debugMode && data.links.map(link => {
        const fromPos = getItemPosition(link.fromSwimlaneId, link.fromId);
        const toPos = getItemPosition(link.toSwimlaneId, link.toId);
        
        if (!fromPos || !toPos) return null;

        // Calculate exact attachment X coordinates (matching handle centers)
        const HANDLE_OFFSET = 2; // Handles are 2px inward from bar edges
        
        let startX = fromPos.x + fromPos.width - HANDLE_OFFSET; // Finish handle center
        let endX = toPos.x - HANDLE_OFFSET; // Start handle center

        switch (link.type) {
          case 'SS':
            startX = fromPos.x - HANDLE_OFFSET;
            endX = toPos.x - HANDLE_OFFSET;
            break;
          case 'SF':
            startX = fromPos.x - HANDLE_OFFSET;
            endX = toPos.x + toPos.width - HANDLE_OFFSET;
            break;
          case 'FF':
            startX = fromPos.x + fromPos.width - HANDLE_OFFSET;
            endX = toPos.x + toPos.width - HANDLE_OFFSET;
            break;
        }
        
        return (
          <g key={`debug-${link.id}`}>
            {/* Show FROM bar outline */}
            <rect
              x={fromPos.x}
              y={fromPos.barCenterY - BAR_HEIGHT / 2}
              width={fromPos.width}
              height={BAR_HEIGHT}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.6"
            />
            
            {/* Show TO bar outline */}
            <rect
              x={toPos.x}
              y={toPos.barCenterY - BAR_HEIGHT / 2}
              width={toPos.width}
              height={BAR_HEIGHT}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.6"
            />
            
            {/* Crosshair at FROM attachment (should match handle center) */}
            <line
              x1={startX - 15}
              y1={fromPos.barCenterY}
              x2={startX + 15}
              y2={fromPos.barCenterY}
              stroke="#10b981"
              strokeWidth="3"
            />
            <line
              x1={startX}
              y1={fromPos.barCenterY - 15}
              x2={startX}
              y2={fromPos.barCenterY + 15}
              stroke="#10b981"
              strokeWidth="3"
            />
            <circle
              cx={startX}
              cy={fromPos.barCenterY}
              r="8"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
            />
            
            {/* Crosshair at TO attachment (should match handle center) */}
            <line
              x1={endX - 15}
              y1={toPos.barCenterY}
              x2={endX + 15}
              y2={toPos.barCenterY}
              stroke="#ef4444"
              strokeWidth="3"
            />
            <line
              x1={endX}
              y1={toPos.barCenterY - 15}
              x2={endX}
              y2={toPos.barCenterY + 15}
              stroke="#ef4444"
              strokeWidth="3"
            />
            <circle
              cx={endX}
              cy={toPos.barCenterY}
              r="8"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
            />
            
            {/* Coordinate labels */}
            <text
              x={startX + 20}
              y={fromPos.barCenterY - 20}
              fill="#10b981"
              fontSize="12"
              fontWeight="bold"
              className="pointer-events-none"
            >
              FROM: ({startX.toFixed(1)}, {fromPos.barCenterY.toFixed(1)})
            </text>
            <text
              x={endX + 20}
              y={toPos.barCenterY + 25}
              fill="#ef4444"
              fontSize="12"
              fontWeight="bold"
              className="pointer-events-none"
            >
              TO: ({endX.toFixed(1)}, {toPos.barCenterY.toFixed(1)})
            </text>
            
            {/* Row center reference line */}
            <line
              x1={fromPos.x - 50}
              y1={fromPos.barCenterY}
              x2={fromPos.x + fromPos.width + 50}
              y2={fromPos.barCenterY}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.3"
            />
            <line
              x1={toPos.x - 50}
              y1={toPos.barCenterY}
              x2={toPos.x + toPos.width + 50}
              y2={toPos.barCenterY}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.3"
            />
          </g>
        );
      })}
    </svg>
  );
};
