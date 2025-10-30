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
}

export const GanttLinks = ({ data, zoom, columnWidth, swimlaneColumnWidth, selectedLink, onLinkSelect, onLinkDoubleClick }: GanttLinksProps) => {
  const getItemPosition = (swimlaneId: string, itemId: string, linkForLogging?: GanttLink) => {
    const swimlane = data.swimlanes[swimlaneId];
    if (!swimlane) return null;

    const item = swimlane.activities?.find((a) => a.id === itemId) || swimlane.states?.find((s) => s.id === itemId);
    if (!item) return null;

    // Calculate swimlane vertical position
    let yPos = 48; // Header height (h-12 = 48px)
    const findYPosition = (id: string): number | null => {
      let currentY = 48; // Start after header
      
      for (const rootId of data.rootIds) {
        const result = traverseSwimlane(rootId, id, currentY);
        if (result !== null) return result;
        
        // If not found in this root tree, add its height and continue to next root
        currentY += getVisibleHeight(rootId);
      }
      return null;
    };

    const traverseSwimlane = (currentId: string, targetId: string, currentY: number): number | null => {
      const current = data.swimlanes[currentId];
      
      if (currentId === targetId) {
        return currentY;
      }
      
      if (!current) return null;
      
      let nextY = currentY + 48; // First child row starts 48px below parent
      
      if (current.expanded && current.children.length > 0) {
        for (const childId of current.children) {
          const childResult = traverseSwimlane(childId, targetId, nextY);
          if (childResult !== null) return childResult;
          
          // Add height for this child and its visible descendants
          const childHeight = getVisibleHeight(childId);
          nextY += childHeight;
        }
      }
      
      return null;
    };

    const getVisibleHeight = (id: string): number => {
      const swimlane = data.swimlanes[id];
      if (!swimlane) return 0;
      
      let height = 48; // Row height
      if (swimlane.expanded) {
        for (const childId of swimlane.children) {
          height += getVisibleHeight(childId);
        }
      }
      return height;
    };

    const y = findYPosition(swimlaneId);
    if (y === null) {
      console.error(`[GanttLinks] Could not find Y position for swimlane ${swimlaneId}`);
      return null;
    }
    
    // Comprehensive debug logging
    if (linkForLogging) {
      const swimlaneName = data.swimlanes[swimlaneId]?.name || 'Unknown';
      const itemLabel = item.label || itemId;
      console.log(`[Link ${linkForLogging.id}] Connection point:`, {
        swimlane: `${swimlaneName} (${swimlaneId})`,
        item: `${itemLabel} (${itemId})`,
        yPosition: `${y}px`,
        itemStart: item.start,
        itemDuration: item.duration,
        isFromPoint: itemId === linkForLogging.fromId,
        isToPoint: itemId === linkForLogging.toId,
        linkType: linkForLogging.type
      });
    }

    const x = (item.start / zoom) * columnWidth + swimlaneColumnWidth;
    const width = (item.duration / zoom) * columnWidth;

    // Determine which end to use based on link type
    let x1 = x + width; // Default: finish (right side)
    let x2 = x; // Default: start (left side)
    
    if (linkForLogging) {
      // For 'from' position
      if (itemId === linkForLogging.fromId) {
        if (linkForLogging.type === 'SS' || linkForLogging.type === 'SF') {
          x1 = x; // Start position
        } else {
          x1 = x + width; // Finish position
        }
      }
      // For 'to' position
      if (itemId === linkForLogging.toId) {
        if (linkForLogging.type === 'FS' || linkForLogging.type === 'SS') {
          x2 = x; // Start position
        } else {
          x2 = x + width; // Finish position
        }
      }
    }

    return {
      x1,
      y1: y + 24, // Middle of row (row height is 48, so 24 is middle)
      x2,
      y2: y + 24,
    };
  };


  // New obstacle detection for routing
  interface Obstacle {
    swimlaneId: string;
    itemId: string;
    xStart: number;
    xEnd: number;
    y: number;
  }

  const getSwimlanesBetween = (fromId: string, toId: string): string[] => {
    // Get the vertical order of all visible swimlanes
    const visibleOrder: string[] = [];
    const traverse = (ids: string[]) => {
      ids.forEach(id => {
        visibleOrder.push(id);
        const swimlane = data.swimlanes[id];
        if (swimlane?.expanded && swimlane.children.length > 0) {
          traverse(swimlane.children);
        }
      });
    };
    traverse(data.rootIds);
    
    // Find indices
    const fromIndex = visibleOrder.indexOf(fromId);
    const toIndex = visibleOrder.indexOf(toId);
    
    if (fromIndex === -1 || toIndex === -1) return [];
    
    // Return swimlanes between (exclusive of source and target)
    const start = Math.min(fromIndex, toIndex) + 1;
    const end = Math.max(fromIndex, toIndex);
    
    return visibleOrder.slice(start, end);
  };

  const findObstacles = (
    fromSwimlaneId: string,
    toSwimlaneId: string,
    pathStartX: number,
    pathEndX: number
  ): Obstacle[] => {
    const obstacles: Obstacle[] = [];
    
    // Get all swimlanes between source and target
    const swimlanesBetween = getSwimlanesBetween(fromSwimlaneId, toSwimlaneId);
    
    // For each swimlane, check all activities/states
    swimlanesBetween.forEach(swimlaneId => {
      const swimlane = data.swimlanes[swimlaneId];
      if (!swimlane) return;
      
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      
      items.forEach(item => {
        const pos = getItemPosition(swimlaneId, item.id);
        if (!pos) return;
        
        const itemStart = pos.x2; // Left edge
        const itemEnd = pos.x1;   // Right edge
        
        // Check horizontal overlap
        const horizontalOverlap = !(itemEnd < pathStartX || itemStart > pathEndX);
        
        if (horizontalOverlap) {
          obstacles.push({
            swimlaneId,
            itemId: item.id,
            xStart: itemStart,
            xEnd: itemEnd,
            y: pos.y1
          });
        }
      });
    });
    
    return obstacles;
  };

  const createRoutedPath = (from: { x1: number; y1: number }, 
                            to: { x2: number; y2: number },
                            fromId?: string,
                            toId?: string,
                            fromSwimlaneId?: string,
                            toSwimlaneId?: string): { path: string; isVertical: boolean } => {
    const startX = from.x1;
    const startY = from.y1;
    const endX = to.x2;
    const endY = to.y2;
    
    // Constants
    const HORIZONTAL_OFFSET = 20; // Short horizontal segment length
    const CHANNEL_OFFSET = 30;    // Distance to clear channel above/below swimlane
    const FORWARD_THRESHOLD = 10; // Minimum X difference to be considered "forward"
    
    // SPECIAL CASE: Same swimlane, same row, forward flow
    const sameSwimlane = fromSwimlaneId && toSwimlaneId && fromSwimlaneId === toSwimlaneId;
    const sameRow = Math.abs(startY - endY) < 5;
    const horizontalFlow = endX > startX;
    
    if (sameSwimlane && sameRow && horizontalFlow) {
      return { path: `M ${startX} ${startY} L ${endX} ${endY}`, isVertical: false };
    }
    
    // SPECIAL CASE: Pure vertical link
    if (Math.abs(startX - endX) < 5) {
      return { path: `M ${startX} ${startY} L ${endX} ${endY}`, isVertical: true };
    }
    
    // MAIN DECISION: Forward or Backward link?
    const isForwardLink = endX > startX + FORWARD_THRESHOLD;
    
    if (isForwardLink) {
      // === FORWARD LINK LOGIC ===
      
      // Check for obstacles
      const obstacles = fromSwimlaneId && toSwimlaneId 
        ? findObstacles(fromSwimlaneId, toSwimlaneId, startX, endX)
        : [];
      
      if (obstacles.length === 0) {
        // NO OBSTACLES: Simple 3-segment path
        // 1. Horizontal out
        const point1X = startX + HORIZONTAL_OFFSET;
        const point1Y = startY;
        
        // 2. Vertical to target swimlane
        const point2X = point1X;
        const point2Y = endY;
        
        // 3. Horizontal into target
        const path = `M ${startX} ${startY} L ${point1X} ${point1Y} L ${point2X} ${point2Y} L ${endX} ${endY}`;
        return { path, isVertical: false };
        
      } else {
        // OBSTACLES FOUND: 5-segment detour path
        
        // Determine direction to clear channel (up or down from source)
        const sourceIsAboveTarget = startY < endY;
        const channelY = sourceIsAboveTarget 
          ? startY - CHANNEL_OFFSET  // Go up from source
          : startY + CHANNEL_OFFSET; // Go down from source
        
        // 1. Horizontal out from source
        const point1X = startX + HORIZONTAL_OFFSET;
        const point1Y = startY;
        
        // 2. Vertical to clear channel
        const point2X = point1X;
        const point2Y = channelY;
        
        // 3. Long horizontal across channel (past obstacles)
        const point3X = endX - HORIZONTAL_OFFSET;
        const point3Y = channelY;
        
        // 4. Vertical to target swimlane
        const point4X = point3X;
        const point4Y = endY;
        
        // 5. Horizontal into target
        const path = `M ${startX} ${startY} L ${point1X} ${point1Y} L ${point2X} ${point2Y} L ${point3X} ${point3Y} L ${point4X} ${point4Y} L ${endX} ${endY}`;
        return { path, isVertical: false };
      }
      
    } else {
      // === BACKWARD/CLOSE LINK LOGIC ===
      // Always use 5-segment loop-back
      
      const SWIMLANE_HEIGHT = 48;
      const HALF_SWIMLANE = SWIMLANE_HEIGHT / 2;
      
      // 1. Horizontal out from source
      const point1X = startX + HORIZONTAL_OFFSET;
      const point1Y = startY;
      
      // 2. Vertical down by half swimlane height (enter clear channel)
      const point2X = point1X;
      const point2Y = startY + HALF_SWIMLANE;
      
      // 3. Horizontal (backward) to align with target entry
      const point3X = endX - HORIZONTAL_OFFSET;
      const point3Y = point2Y;
      
      // 4. Vertical to target swimlane
      const point4X = point3X;
      const point4Y = endY;
      
      // 5. Horizontal into target
      const path = `M ${startX} ${startY} L ${point1X} ${point1Y} L ${point2X} ${point2Y} L ${point3X} ${point3Y} L ${point4X} ${point4Y} L ${endX} ${endY}`;
      return { path, isVertical: false };
    }
  };

  const renderLink = (link: GanttLink) => {
    const from = getItemPosition(link.fromSwimlaneId, link.fromId, link);
    const to = getItemPosition(link.toSwimlaneId, link.toId, link);

    if (!from || !to) {
      return null;
    }

    // Apply consistent vertical centering to all links
    // Bars are 24px tall, so center is at 12px from the bar's top edge
    const barCenterOffset = 12;
    const adjustedFrom = {
      x1: from.x1,
      y1: from.y1 + barCenterOffset
    };
    const adjustedTo = {
      x2: to.x2,
      y2: to.y2 + barCenterOffset
    };

    const { path, isVertical } = createRoutedPath(adjustedFrom, adjustedTo, link.fromId, link.toId, link.fromSwimlaneId, link.toSwimlaneId);

    const isSelected = selectedLink === link.id;
    const linkColor = link.color || "#00bcd4";
    const markerId = `arrowhead-${link.id}`;
    const selectedMarkerId = "arrowhead-selected";

    // Calculate label position (midpoint of path)
    const labelX = (from.x1 + to.x2) / 2;
    const labelY = (from.y1 + to.y2) / 2;

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
            if (isSelected) {
              onLinkSelect("");
            } else {
              onLinkSelect(link.id);
            }
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
          markerEnd={isSelected ? `url(#${selectedMarkerId})` : `url(#${markerId})`}
          opacity={isSelected ? "1" : "0.7"}
          className="pointer-events-none"
        />
        {/* Custom arrowhead with link color */}
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
              fill={linkColor}
            />
          </marker>
        </defs>
        {/* Link label */}
        {link.label && (
          <foreignObject
            x={labelX - 40}
            y={labelY - 12}
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
        {/* Link type badge (hide FS and SF) */}
        {link.type !== 'FS' && link.type !== 'SF' && (
          <foreignObject
            x={labelX - 15}
            y={labelY + (link.label ? 12 : -12)}
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

  const calculateTotalHeight = () => {
    let height = 48; // Header height
    const countVisibleRows = (ids: string[]): number => {
      let count = 0;
      ids.forEach(id => {
        const swimlane = data.swimlanes[id];
        if (swimlane) {
          count += 48; // Row height
          if (swimlane.expanded && swimlane.children.length > 0) {
            count += countVisibleRows(swimlane.children);
          }
        }
      });
      return count;
    };
    return height + countVisibleRows(data.rootIds);
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
      <defs>
        {/* Selected arrowhead */}
        <marker
          id="arrowhead-selected"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="2.5"
          orient="auto"
        >
          <polygon
            points="0 0, 8 2.5, 0 5"
            fill="hsl(var(--destructive))"
          />
        </marker>
      </defs>
      {data.links.map(renderLink)}
    </svg>
  );
};
