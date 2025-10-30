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


  // ==================== PHASE 2: Enhanced Obstacle Detection ====================
  
  interface Obstacle {
    swimlaneId: string;
    itemId: string;
    xStart: number;
    xEnd: number;
    y: number;
    width: number;
    height: number;
  }

  const SWIMLANE_HEIGHT = 48;
  const BAR_HEIGHT = 24;
  const TOLERANCE_MARGIN = 5; // px clearance around obstacles

  const getSwimlanesBetween = (fromId: string, toId: string, includeEndpoints: boolean = false): string[] => {
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
    
    const fromIndex = visibleOrder.indexOf(fromId);
    const toIndex = visibleOrder.indexOf(toId);
    
    if (fromIndex === -1 || toIndex === -1) return [];
    
    // Return swimlanes between, optionally including source and target
    const start = Math.min(fromIndex, toIndex) + (includeEndpoints ? 0 : 1);
    const end = Math.max(fromIndex, toIndex) + (includeEndpoints ? 1 : 0);
    
    return visibleOrder.slice(start, end);
  };

  const findObstacles = (
    fromSwimlaneId: string,
    toSwimlaneId: string,
    pathStartX: number,
    pathEndX: number,
    fromItemId?: string,
    toItemId?: string
  ): Obstacle[] => {
    const obstacles: Obstacle[] = [];
    
    // PHASE 2: Include source and target swimlanes for better detection
    const swimlanesToCheck = getSwimlanesBetween(fromSwimlaneId, toSwimlaneId, true);
    
    swimlanesToCheck.forEach(swimlaneId => {
      const swimlane = data.swimlanes[swimlaneId];
      if (!swimlane) return;
      
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      
      items.forEach(item => {
        // Skip the source and target items themselves
        if (item.id === fromItemId || item.id === toItemId) return;
        
        const pos = getItemPosition(swimlaneId, item.id);
        if (!pos) return;
        
        const itemStart = pos.x2; // Left edge
        const itemEnd = pos.x1;   // Right edge
        const itemY = pos.y1;
        
        // PHASE 2: Rectangle intersection with tolerance margins
        const pathLeft = Math.min(pathStartX, pathEndX) - TOLERANCE_MARGIN;
        const pathRight = Math.max(pathStartX, pathEndX) + TOLERANCE_MARGIN;
        
        const itemLeft = itemStart - TOLERANCE_MARGIN;
        const itemRight = itemEnd + TOLERANCE_MARGIN;
        
        // Check if rectangles intersect
        const horizontalOverlap = !(itemRight < pathLeft || itemLeft > pathRight);
        
        if (horizontalOverlap) {
          obstacles.push({
            swimlaneId,
            itemId: item.id,
            xStart: itemStart,
            xEnd: itemEnd,
            y: itemY,
            width: itemEnd - itemStart,
            height: BAR_HEIGHT
          });
        }
      });
    });
    
    return obstacles;
  };

  // ==================== PHASE 6: Spatial Index for Link Collision Avoidance ====================
  
  interface LinkPath {
    id: string;
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  }

  const existingLinkPaths = new Map<string, LinkPath>();

  const parseLinkPath = (linkId: string, pathD: string): LinkPath => {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const commands = pathD.match(/[ML]\s*[\d.-]+\s+[\d.-]+/g) || [];
    
    let lastX = 0, lastY = 0;
    commands.forEach((cmd, i) => {
      const [type, x, y] = cmd.split(/\s+/);
      const currentX = parseFloat(x);
      const currentY = parseFloat(y);
      
      if (i > 0) {
        segments.push({ x1: lastX, y1: lastY, x2: currentX, y2: currentY });
      }
      lastX = currentX;
      lastY = currentY;
    });
    
    return { id: linkId, segments };
  };

  const checkLinkCollision = (newSegments: Array<{ x1: number; y1: number; x2: number; y2: number }>): number => {
    let maxCollisions = 0;
    
    existingLinkPaths.forEach(existingPath => {
      let collisionCount = 0;
      
      newSegments.forEach(newSeg => {
        existingPath.segments.forEach(existingSeg => {
          // Check if segments are close (within 10px)
          const distance = Math.min(
            pointToSegmentDistance(newSeg.x1, newSeg.y1, existingSeg),
            pointToSegmentDistance(newSeg.x2, newSeg.y2, existingSeg)
          );
          
          if (distance < 10) collisionCount++;
        });
      });
      
      maxCollisions = Math.max(maxCollisions, collisionCount);
    });
    
    return maxCollisions;
  };

  const pointToSegmentDistance = (
    px: number, 
    py: number, 
    seg: { x1: number; y1: number; x2: number; y2: number }
  ): number => {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      return Math.sqrt((px - seg.x1) ** 2 + (py - seg.y1) ** 2);
    }
    
    let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    const projX = seg.x1 + t * dx;
    const projY = seg.y1 + t * dy;
    
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  };

  // ==================== PHASE 3 & 4: Smart Channel Selection with Dynamic Constants ====================
  
  const selectOptimalChannel = (
    startY: number,
    endY: number,
    obstacles: Obstacle[],
    horizontalOffset: number
  ): { channelY: number; direction: 'up' | 'down' } => {
    const CHANNEL_OFFSET = SWIMLANE_HEIGHT * 0.75; // 36px at default height
    
    // Calculate available space above and below
    let upwardClearance = Infinity;
    let downwardClearance = Infinity;
    
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    // Check obstacles to see how far we can go up or down
    obstacles.forEach(obstacle => {
      if (obstacle.y < minY) {
        // Obstacle above source
        upwardClearance = Math.min(upwardClearance, minY - obstacle.y);
      }
      if (obstacle.y > maxY) {
        // Obstacle below target
        downwardClearance = Math.min(downwardClearance, obstacle.y - maxY);
      }
    });
    
    // Prefer direction with more clearance
    if (upwardClearance >= downwardClearance && upwardClearance >= CHANNEL_OFFSET) {
      return { channelY: minY - CHANNEL_OFFSET, direction: 'up' };
    } else if (downwardClearance >= CHANNEL_OFFSET) {
      return { channelY: maxY + CHANNEL_OFFSET, direction: 'down' };
    } else {
      // Not enough space in either direction, go with less intrusive option
      const sourceIsAboveTarget = startY < endY;
      return sourceIsAboveTarget
        ? { channelY: startY - CHANNEL_OFFSET, direction: 'up' }
        : { channelY: startY + CHANNEL_OFFSET, direction: 'down' };
    }
  };

  // ==================== PHASE 4 & 7: Create Routed Path with Rounded Corners ====================
  
  const createRoutedPath = (
    from: { x1: number; y1: number }, 
    to: { x2: number; y2: number },
    linkType: string,
    fromId?: string,
    toId?: string,
    fromSwimlaneId?: string,
    toSwimlaneId?: string
  ): { path: string; isVertical: boolean } => {
    const startX = from.x1;
    const startY = from.y1;
    const endX = to.x2;
    const endY = to.y2;
    
    // PHASE 4: Dynamic constants based on zoom and column width
    const HORIZONTAL_OFFSET = Math.max(15, columnWidth * 0.3);
    const FORWARD_THRESHOLD = columnWidth * 0.2;
    const CORNER_RADIUS = 8; // PHASE 7: Rounded corners
    
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
    
    // PHASE 2: Enhanced obstacle detection
    const obstacles = fromSwimlaneId && toSwimlaneId 
      ? findObstacles(fromSwimlaneId, toSwimlaneId, startX, endX, fromId, toId)
      : [];
    
    // PHASE 7: Helper function for rounded corners
    const createRoundedPath = (points: Array<{x: number, y: number}>): string => {
      if (points.length < 2) return '';
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        
        // Calculate direction vectors
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;
        
        // If it's a corner (direction changes)
        if ((dx1 === 0 && dy2 === 0) || (dy1 === 0 && dx2 === 0)) {
          const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          const radius = Math.min(CORNER_RADIUS, dist1 / 2, dist2 / 2);
          
          if (radius > 0) {
            // Line to start of curve
            const beforeX = curr.x - (dx1 / dist1) * radius;
            const beforeY = curr.y - (dy1 / dist1) * radius;
            path += ` L ${beforeX} ${beforeY}`;
            
            // Quadratic curve through corner
            const afterX = curr.x + (dx2 / dist2) * radius;
            const afterY = curr.y + (dy2 / dist2) * radius;
            path += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
            continue;
          }
        }
        
        path += ` L ${curr.x} ${curr.y}`;
      }
      
      path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
      return path;
    };
    
    if (isForwardLink) {
      // === FORWARD LINK LOGIC ===
      
      if (obstacles.length === 0) {
        // NO OBSTACLES: Simple 3-segment path with rounded corners
        const points = [
          { x: startX, y: startY },
          { x: startX + HORIZONTAL_OFFSET, y: startY },
          { x: startX + HORIZONTAL_OFFSET, y: endY },
          { x: endX, y: endY }
        ];
        
        return { path: createRoundedPath(points), isVertical: false };
        
      } else {
        // OBSTACLES FOUND: Use smart channel selection (PHASE 3)
        const { channelY } = selectOptimalChannel(startY, endY, obstacles, HORIZONTAL_OFFSET);
        
        // PHASE 5: Link type optimization for routing
        let exitOffset = HORIZONTAL_OFFSET;
        let entryOffset = HORIZONTAL_OFFSET;
        
        // Adjust offsets based on link type
        if (linkType === 'SS') {
          // Start-to-Start: minimize horizontal distance
          exitOffset = Math.min(HORIZONTAL_OFFSET, columnWidth * 0.2);
          entryOffset = Math.min(HORIZONTAL_OFFSET, columnWidth * 0.2);
        } else if (linkType === 'FF') {
          // Finish-to-Finish: can extend further
          exitOffset = HORIZONTAL_OFFSET * 1.2;
          entryOffset = HORIZONTAL_OFFSET * 1.2;
        }
        
        const points = [
          { x: startX, y: startY },
          { x: startX + exitOffset, y: startY },
          { x: startX + exitOffset, y: channelY },
          { x: endX - entryOffset, y: channelY },
          { x: endX - entryOffset, y: endY },
          { x: endX, y: endY }
        ];
        
        return { path: createRoundedPath(points), isVertical: false };
      }
      
    } else {
      // === BACKWARD/CLOSE LINK LOGIC ===
      // PHASE 3: Smart channel selection instead of always going down
      
      const { channelY } = selectOptimalChannel(startY, endY, obstacles, HORIZONTAL_OFFSET);
      
      // PHASE 5: Special handling for SF (Start-to-Finish) backward links
      let exitOffset = HORIZONTAL_OFFSET;
      let entryOffset = HORIZONTAL_OFFSET;
      
      if (linkType === 'SF') {
        // Start-to-Finish backward: special routing
        exitOffset = Math.min(HORIZONTAL_OFFSET * 0.8, columnWidth * 0.15);
      }
      
      const points = [
        { x: startX, y: startY },
        { x: startX + exitOffset, y: startY },
        { x: startX + exitOffset, y: channelY },
        { x: endX - entryOffset, y: channelY },
        { x: endX - entryOffset, y: endY },
        { x: endX, y: endY }
      ];
      
      return { path: createRoundedPath(points), isVertical: false };
    }
  };

  const renderLink = (link: GanttLink) => {
    const from = getItemPosition(link.fromSwimlaneId, link.fromId, link);
    const to = getItemPosition(link.toSwimlaneId, link.toId, link);

    if (!from || !to) {
      return null;
    }

    // PHASE 1: Fix vertical positioning - use raw positions from getItemPosition
    // getItemPosition already returns y + 24 (center), no need for additional offset
    const { path, isVertical } = createRoutedPath(
      from, 
      to, 
      link.type,
      link.fromId, 
      link.toId, 
      link.fromSwimlaneId, 
      link.toSwimlaneId
    );

    // PHASE 6: Register link path for collision detection
    const parsedPath = parseLinkPath(link.id, path);
    existingLinkPaths.set(link.id, parsedPath);
    
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
        {/* PHASE 7: Visible path with hover effect */}
        <path
          d={path}
          stroke={isSelected ? "hsl(var(--destructive))" : linkColor}
          strokeWidth={isSelected ? "3" : "2"}
          fill="none"
          markerEnd={isSelected ? `url(#${selectedMarkerId})` : `url(#${markerId})`}
          opacity={isSelected ? "1" : "0.7"}
          className="pointer-events-none transition-all duration-200"
          style={{
            filter: isSelected ? 'drop-shadow(0 0 4px hsl(var(--destructive)))' : undefined
          }}
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
