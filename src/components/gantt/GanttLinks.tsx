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

  // Collect all task bars with their horizontal spans
  const collectTaskBars = () => {
    const bars: Array<{ x: number; width: number; id: string }> = [];
    
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      
      items.forEach(item => {
        const pos = getItemPosition(swimlaneId, item.id);
        if (pos) {
          bars.push({
            x: pos.x,
            width: pos.width,
            id: item.id
          });
        }
      });
    });
    
    return bars;
  };

  // Check if a horizontal span overlaps any task bar (except excluded ones)
  const hasHorizontalOverlap = (x1: number, x2: number, excludeIds: string[]) => {
    const bars = collectTaskBars();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    
    return bars.some(bar => {
      if (excludeIds.includes(bar.id)) return false;
      const barRight = bar.x + bar.width;
      // Check if horizontal spans overlap
      return !(maxX < bar.x || minX > barRight);
    });
  };

  // Find a clear vertical channel between start and end X
  const findClearChannel = (startX: number, endX: number, excludeIds: string[]): number | null => {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    
    // Try points along the path
    const candidates = [
      startX + 20, // Just right of start
      endX - 20,   // Just left of end
      (startX + endX) / 2, // Midpoint
    ];
    
    for (const x of candidates) {
      if (x >= minX && x <= maxX) {
        // Check if this X coordinate is clear (no horizontal overlap from minX to maxX)
        if (!hasHorizontalOverlap(minX, maxX, excludeIds)) {
          return x;
        }
      }
    }
    
    return null;
  };

  // Generate elbowed path following the functional requirements
  const generateElbowedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    fromId: string,
    toId: string
  ): { x: number; y: number }[] => {
    const CLEARANCE = 20; // Horizontal clearance from tasks
    
    // FR-3.1: Special case - vertically aligned
    if (Math.abs(start.x - end.x) < 5) {
      return [start, end];
    }
    
    // FR-2.4: Default C-shaped or S-shaped path
    const excludeIds = [fromId, toId];
    
    // Determine horizontal direction
    const goingRight = end.x > start.x;
    
    // Try direct path first (simple C-shape)
    const directPath = hasHorizontalOverlap(start.x, end.x, excludeIds);
    
    if (!directPath) {
      // Simple 3-point path: horizontal -> vertical -> horizontal
      const midX = goingRight ? end.x : start.x;
      return [
        start,
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        end
      ];
    }
    
    // Complex path needed - find clear channel
    const channel = findClearChannel(start.x, end.x, excludeIds);
    
    if (channel !== null) {
      // Use the channel for vertical routing
      return [
        start,
        { x: channel, y: start.y },
        { x: channel, y: end.y },
        end
      ];
    }
    
    // Fallback: route around obstacles using gutter space
    const gutterOffset = goingRight ? CLEARANCE : -CLEARANCE;
    const routeX = start.x + gutterOffset;
    
    return [
      start,
      { x: routeX, y: start.y },
      { x: routeX, y: end.y },
      { x: end.x, y: end.y },
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
    
    // Determine direction: if target is to the right, use finish→start; if to the left, use start→finish
    const targetIsRight = toPos.x >= fromPos.x;
    
    let startX: number, endX: number;
    if (targetIsRight) {
      // Target is to the right: start from finish handle (right), end at start handle (left)
      startX = fromPos.x + fromPos.width - HANDLE_OFFSET;
      endX = toPos.x - HANDLE_OFFSET;
    } else {
      // Target is to the left: start from start handle (left), end at finish handle (right)
      startX = fromPos.x - HANDLE_OFFSET;
      endX = toPos.x + toPos.width - HANDLE_OFFSET;
    }

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
