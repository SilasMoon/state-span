import React from "react";
import { GanttData, GanttLink, ZoomLevel } from "@/types/gantt";

interface GanttLinksProps {
  data: GanttData;
  zoom: ZoomLevel;
  columnWidth: number;
  swimlaneColumnWidth: number;
  selectedLink: string | null;
  onLinkSelect: (linkId: string) => void;
  onLinkDoubleClick: (linkId: string) => void;
  itemTempPositions?: Record<string, { start: number; duration: number; swimlaneId: string }>;
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
}: GanttLinksProps) => {
  const SWIMLANE_HEIGHT = 48;
  const BAR_HEIGHT = 24;
  const GRID_SIZE = 12; // Grid cell size for pathfinding

  // Ref to SVG element to get its position for coordinate transformation
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  // Force re-render when positions change (for scroll/resize)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  // Update positions when chart scrolls or resizes
  React.useEffect(() => {
    const container = document.querySelector('.overflow-auto');
    if (!container) return;
    
    const handleUpdate = () => forceUpdate();
    container.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      container.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, []);

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
    
    // Calculate position from data using zoom and columnWidth
    // This ensures arrows update immediately when zoom changes
    const x = (itemStart / zoom) * columnWidth;
    const width = (itemDuration / zoom) * columnWidth;
    
    // Calculate barCenterY from row position
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

  // Collect all task bars with their positions
  const collectTaskBars = () => {
    const bars: Array<{ x: number; y: number; width: number; height: number; id: string }> = [];
    
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      
      items.forEach(item => {
        const pos = getItemPosition(swimlaneId, item.id);
        if (pos) {
          bars.push({
            x: pos.x,
            y: pos.barCenterY,
            width: pos.width,
            height: BAR_HEIGHT,
            id: item.id
          });
        }
      });
    });
    
    return bars;
  };

  // Check if a horizontal line segment crosses any task bar
  const horizontalSegmentCrossesTasks = (
    x1: number, 
    x2: number, 
    y: number, 
    excludeIds: string[]
  ): boolean => {
    const bars = collectTaskBars();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    
    return bars.some(bar => {
      if (excludeIds.includes(bar.id)) return false;
      
      // Check if horizontal segment overlaps bar's horizontal span
      const barRight = bar.x + bar.width;
      const horizontalOverlap = !(maxX <= bar.x || minX >= barRight);
      
      // Check if the Y coordinate is within the bar's vertical span
      const barTop = bar.y - bar.height / 2;
      const barBottom = bar.y + bar.height / 2;
      const verticalOverlap = y >= barTop && y <= barBottom;
      
      return horizontalOverlap && verticalOverlap;
    });
  };

  // Find clear gutter Y positions (between rows where no tasks exist)
  const findGutterPositions = (): number[] => {
    const gutters: number[] = [];
    const rowYPositions: number[] = [];
    
    // Collect all row Y positions
    for (const rootId of data.rootIds) {
      collectRowYPositions(rootId, rowYPositions);
    }
    
    rowYPositions.sort((a, b) => a - b);
    
    // Gutters are midpoints between consecutive rows
    for (let i = 0; i < rowYPositions.length - 1; i++) {
      const gutterY = (rowYPositions[i] + rowYPositions[i + 1]) / 2;
      gutters.push(gutterY);
    }
    
    // Add gutters above first and below last row
    if (rowYPositions.length > 0) {
      gutters.unshift(rowYPositions[0] - SWIMLANE_HEIGHT / 2);
      gutters.push(rowYPositions[rowYPositions.length - 1] + SWIMLANE_HEIGHT / 2);
    }
    
    return gutters;
  };

  const collectRowYPositions = (swimlaneId: string, positions: number[]) => {
    const y = findYPosition(swimlaneId);
    if (y !== null) {
      positions.push(y + SWIMLANE_HEIGHT / 2);
    }
    
    const swimlane = data.swimlanes[swimlaneId];
    if (swimlane && swimlane.expanded && swimlane.children.length > 0) {
      swimlane.children.forEach(childId => {
        collectRowYPositions(childId, positions);
      });
    }
  };

  // Generate elbowed path following the functional requirements
  const generateElbowedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    fromId: string,
    toId: string
  ): { x: number; y: number }[] => {
    const excludeIds = [fromId, toId];
    const EXIT_CLEARANCE = 20; // Distance to exit task before going vertical
    
    // FR-3.1: Special case - vertically aligned
    if (Math.abs(start.x - end.x) < 5) {
      return [start, end];
    }
    
    const goingRight = end.x > start.x;
    
    // Try simple horizontal path at start Y level
    if (!horizontalSegmentCrossesTasks(start.x, end.x, start.y, excludeIds)) {
      return [
        start,
        { x: end.x, y: start.y },
        end
      ];
    }
    
    // Try simple horizontal path at end Y level  
    if (!horizontalSegmentCrossesTasks(start.x, end.x, end.y, excludeIds)) {
      return [
        start,
        { x: start.x, y: end.y },
        end
      ];
    }
    
    // Need to route through gutters to avoid horizontal crossing
    const gutters = findGutterPositions();
    
    // Exit point: move away from start task horizontally
    const exitX = start.x + (goingRight ? EXIT_CLEARANCE : -EXIT_CLEARANCE);
    
    // Entry point: approach end task horizontally
    const entryX = end.x - (goingRight ? EXIT_CLEARANCE : -EXIT_CLEARANCE);
    
    // Try each gutter to find one that's clear for the entire horizontal span
    for (const gutterY of gutters) {
      // Check if we can route the full horizontal span through this gutter
      const fullHorizontalClear = !horizontalSegmentCrossesTasks(exitX, entryX, gutterY, excludeIds);
      
      // Also check the exit and entry segments
      const exitSegmentClear = !horizontalSegmentCrossesTasks(start.x, exitX, start.y, excludeIds);
      const entrySegmentClear = !horizontalSegmentCrossesTasks(entryX, end.x, end.y, excludeIds);
      
      if (fullHorizontalClear && exitSegmentClear && entrySegmentClear) {
        // This gutter works - use it
        return [
          start,
          { x: exitX, y: start.y },
          { x: exitX, y: gutterY },
          { x: entryX, y: gutterY },
          { x: entryX, y: end.y },
          end
        ];
      }
    }
    
    // Fallback: Route way out to the side to avoid all tasks
    // Go further out horizontally to ensure we clear all obstacles
    const bars = collectTaskBars();
    const maxX = Math.max(...bars.map(b => b.x + b.width), end.x);
    const minX = Math.min(...bars.map(b => b.x), start.x);
    const farX = goingRight ? maxX + 100 : minX - 100;
    
    // Find a gutter that's relatively clear
    const midGutterY = gutters.length > 0 
      ? gutters.sort((a, b) => {
          // Sort gutters by distance from midpoint between start and end
          const mid = (start.y + end.y) / 2;
          return Math.abs(a - mid) - Math.abs(b - mid);
        })[0]
      : (start.y + end.y) / 2;
    
    return [
      start,
      { x: start.x + (goingRight ? EXIT_CLEARANCE : -EXIT_CLEARANCE), y: start.y },
      { x: farX, y: start.y },
      { x: farX, y: midGutterY },
      { x: farX, y: end.y },
      { x: end.x - (goingRight ? EXIT_CLEARANCE : -EXIT_CLEARANCE), y: end.y },
      end
    ];
  };

  // Convert points to SVG path with rounded corners
  const createSVGPath = (points: { x: number; y: number }[], cornerRadius: number = 8): string => {
    if (points.length < 2) return '';
    
    // FR-3.1: Single vertical line case
    if (points.length === 2 && Math.abs(points[0].x - points[1].x) < 5) {
      return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
    }
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate direction vectors
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      
      // Calculate distances
      const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      // Use smaller radius if segment is short
      const r = Math.min(cornerRadius, dist1 / 2, dist2 / 2);
      
      if (r > 0 && dist1 > 0 && dist2 > 0) {
        // Calculate corner points
        const cornerStart = {
          x: curr.x - (dx1 / dist1) * r,
          y: curr.y - (dy1 / dist1) * r
        };
        const cornerEnd = {
          x: curr.x + (dx2 / dist2) * r,
          y: curr.y + (dy2 / dist2) * r
        };
        
        path += ` L ${cornerStart.x},${cornerStart.y}`;
        path += ` Q ${curr.x},${curr.y} ${cornerEnd.x},${cornerEnd.y}`;
      } else {
        path += ` L ${curr.x},${curr.y}`;
      }
    }
    
    path += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
    return path;
  };

  const renderLink = (link: GanttLink) => {
    const fromPos = getItemPosition(link.fromSwimlaneId, link.fromId);
    const toPos = getItemPosition(link.toSwimlaneId, link.toId);

    if (!fromPos || !toPos) return null;

    // CRITICAL: Match EXACT handle center positions from GanttBar.tsx
    // Handles are w-5 (20px) with left edge at:
    //   - Finish: left + width - 12px  → center at: left + width - 12 + 10 = left + width - 2
    //   - Start: left - 12px  → center at: left - 12 + 10 = left - 2
    const HANDLE_OFFSET = 2; // Handles are 2px inward from bar edges
    
    // FIXED ANCHOR POINTS: Always use Finish-to-Start (right side of predecessor to left side of successor)
    // Anchor points never change regardless of task positions
    const startX = fromPos.x + fromPos.width - HANDLE_OFFSET; // Finish handle (right side)
    const endX = toPos.x - HANDLE_OFFSET; // Start handle (left side)

    // Use barCenterY for exact vertical center attachment
    const start = { x: startX, y: fromPos.barCenterY };
    const end = { x: endX, y: toPos.barCenterY };

    // Special case: same position
    if (Math.abs(start.x - end.x) < 5 && Math.abs(start.y - end.y) < 5) {
      return null;
    }

    // Generate elbowed path following functional requirements
    const pathPoints = generateElbowedPath(start, end, link.fromId, link.toId);
    const path = createSVGPath(pathPoints, 8);
    
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
              stroke="hsl(var(--background))"
              strokeWidth="1.5"
              strokeLinejoin="round"
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
      </g>
    );
  };

  const totalHeight = calculateTotalHeight();
  
  // Generate a mask that covers all swimlane rows but excludes gaps
  const generateSwimlanesMask = () => {
    const visibleSwimlanes: string[] = [];
    
    const collectVisible = (ids: string[]) => {
      ids.forEach(id => {
        const swimlane = data.swimlanes[id];
        if (swimlane) {
          visibleSwimlanes.push(id);
          if (swimlane.expanded && swimlane.children.length > 0) {
            collectVisible(swimlane.children);
          }
        }
      });
    };
    
    collectVisible(data.rootIds);
    
    return (
      <mask id="swimlanes-mask">
        {/* White areas are visible, black areas are hidden */}
        <rect x="0" y="0" width="100%" height="100%" fill="black" />
        {visibleSwimlanes.map(id => {
          const yPos = findYPosition(id);
          if (yPos === null) return null;
          return (
            <rect 
              key={id} 
              x="0" 
              y={yPos} 
              width="100%" 
              height={SWIMLANE_HEIGHT} 
              fill="white" 
            />
          );
        })}
      </mask>
    );
  };
  
  // SVG positioned at 0,0 WITHIN the clipping container
  // Container starts at swimlaneColumnWidth with overflow:hidden to prevent bleeding
  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none"
      style={{ 
        left: 0,
        top: 0,
        width: '100%',
        height: `${totalHeight}px`,
      }}
    >
      <defs>
        {generateSwimlanesMask()}
      </defs>
      <g mask="url(#swimlanes-mask)">
        {data.links.map(renderLink)}
      </g>
    </svg>
  );
};
