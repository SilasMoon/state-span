import React from "react";
import { GanttData, GanttLink, ZoomLevel } from "@/types/gantt";

interface GanttLinksProps {
  data: GanttData;
  zoom: ZoomLevel;
  columnWidth: number;
  selectedLink: string | null;
  onLinkSelect: (linkId: string) => void;
  onLinkDoubleClick: (linkId: string) => void;
}

export const GanttLinks = ({ data, zoom, columnWidth, selectedLink, onLinkSelect, onLinkDoubleClick }: GanttLinksProps) => {
  const getItemPosition = (swimlaneId: string, itemId: string, link?: { type: string; fromId: string; toId: string }) => {
    const swimlane = data.swimlanes[swimlaneId];
    if (!swimlane) return null;

    let item = swimlane.activities?.find((a) => a.id === itemId);
    if (!item) {
      item = swimlane.states?.find((s) => s.id === itemId);
    }
    if (!item) return null;

    // Calculate swimlane vertical position
    let yPos = 48; // Header height (h-12 = 48px)
    const findYPosition = (id: string, currentY: number): number | null => {
      for (const rootId of data.rootIds) {
        const result = traverseSwimlane(rootId, id, currentY);
        if (result !== null) return result;
      }
      return null;
    };

    const traverseSwimlane = (currentId: string, targetId: string, currentY: number): number | null => {
      if (currentId === targetId) return currentY;
      
      const current = data.swimlanes[currentId];
      if (!current) return null;
      
      let nextY = currentY + 48; // Row height
      
      if (current.expanded) {
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

    const y = findYPosition(swimlaneId, 48);
    if (y === null) return null;

    const swimlaneLabelWidth = 280;
    const x = (item.start / zoom) * columnWidth + swimlaneLabelWidth;
    const width = (item.duration / zoom) * columnWidth;

    // Determine which end to use based on link type
    let x1 = x + width; // Default: finish (right side)
    let x2 = x; // Default: start (left side)
    
    if (link) {
      // For 'from' position
      if (itemId === link.fromId) {
        if (link.type === 'SS' || link.type === 'SF') {
          x1 = x; // Start position
        } else {
          x1 = x + width; // Finish position
        }
      }
      // For 'to' position
      if (itemId === link.toId) {
        if (link.type === 'FS' || link.type === 'SS') {
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


  const getAllItemPositions = (excludeFromId?: string, excludeToId?: string) => {
    const positions: Array<{ x: number; y: number; width: number; height: number; itemId: string }> = [];
    const padding = 5; // Add padding around obstacles
    
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      items.forEach((item) => {
        // Exclude source and destination activities from obstacles
        if (item.id === excludeFromId || item.id === excludeToId) {
          return;
        }
        
        const pos = getItemPosition(swimlaneId, item.id);
        if (pos) {
          const minX = Math.min(pos.x1, pos.x2);
          const maxX = Math.max(pos.x1, pos.x2);
          positions.push({
            x: minX - padding,
            y: pos.y2 - 15 - padding,
            width: (maxX - minX) + (padding * 2),
            height: 30 + (padding * 2),
            itemId: item.id,
          });
        }
      });
    });
    return positions;
  };

  const doesSegmentOverlap = (x1: number, y1: number, x2: number, y2: number, obstacles: Array<{ x: number; y: number; width: number; height: number }>) => {
    const lineMinX = Math.min(x1, x2);
    const lineMaxX = Math.max(x1, x2);
    const lineMinY = Math.min(y1, y2);
    const lineMaxY = Math.max(y1, y2);
    
    for (const obs of obstacles) {
      if (lineMaxX >= obs.x && lineMinX <= obs.x + obs.width &&
          lineMaxY >= obs.y && lineMinY <= obs.y + obs.height) {
        return true;
      }
    }
    return false;
  };

  const findOptimalMidpoint = (startX: number, startY: number, endX: number, endY: number, obstacles: Array<{ x: number; y: number; width: number; height: number }>) => {
    const isForward = startX < endX;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    
    if (isForward) {
      // For forward links, find the first gap after the start
      for (let testX = startX + 20; testX < endX; testX += 10) {
        const hasObstacle = obstacles.some(obs => 
          testX >= obs.x && testX <= obs.x + obs.width &&
          ((startY >= obs.y && startY <= obs.y + obs.height) || 
           (endY >= obs.y && endY <= obs.y + obs.height))
        );
        if (!hasObstacle) {
          return testX;
        }
      }
    }
    
    // Default to midpoint
    return (startX + endX) / 2;
  };

  const createRoutedPath = (from: { x1: number; y1: number }, 
                            to: { x2: number; y2: number },
                            fromId?: string,
                            toId?: string): { path: string; isVertical: boolean } => {
    const startX = from.x1;
    const startY = from.y1;
    const endX = to.x2;
    const endY = to.y2;
    
    const obstacles = getAllItemPositions(fromId, toId);
    
    // PRIORITY 0: Pure vertical line - only case where arrow is vertical
    if (Math.abs(startX - endX) < 5) {
      return { path: `M ${startX} ${startY} L ${endX} ${endY}`, isVertical: true };
    }
    
    // PRIORITY 1: Direct horizontal line (0 bends)
    if (Math.abs(startY - endY) < 5) {
      const hasOverlap = doesSegmentOverlap(startX, startY, endX, endY, obstacles);
      if (!hasOverlap) {
        return { path: `M ${startX} ${startY} L ${endX} ${endY}`, isVertical: false };
      }
    }
    
    // PRIORITY 2: Simple 2-segment paths (1 bend) - direction agnostic
    // Try H-V (horizontal then vertical)
    const hvPath = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
    const hvSeg1 = doesSegmentOverlap(startX, startY, endX, startY, obstacles);
    const hvSeg2 = doesSegmentOverlap(endX, startY, endX, endY, obstacles);
    if (!hvSeg1 && !hvSeg2) {
      return { path: hvPath, isVertical: false };
    }
    
    // Try V-H (vertical then horizontal)
    const vhPath = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
    const vhSeg1 = doesSegmentOverlap(startX, startY, startX, endY, obstacles);
    const vhSeg2 = doesSegmentOverlap(startX, endY, endX, endY, obstacles);
    if (!vhSeg1 && !vhSeg2) {
      return { path: vhPath, isVertical: false };
    }
    
    // PRIORITY 3: 3-segment paths with optimal midpoint (2 bends)
    const sameRow = Math.abs(startY - endY) < 5;
    
    if (sameRow || Math.abs(startY - endY) < 100) {
      // Try H-V-H pattern with optimal midpoint
      const midX = findOptimalMidpoint(startX, startY, endX, endY, obstacles);
      const hvhPath = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      const hvhSeg1 = doesSegmentOverlap(startX, startY, midX, startY, obstacles);
      const hvhSeg2 = doesSegmentOverlap(midX, startY, midX, endY, obstacles);
      const hvhSeg3 = doesSegmentOverlap(midX, endY, endX, endY, obstacles);
      if (!hvhSeg1 && !hvhSeg2 && !hvhSeg3) {
        return { path: hvhPath, isVertical: false };
      }
    } else {
      // Try V-H-V pattern for different rows
      const midY = (startY + endY) / 2;
      const vhvPath = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      const vhvSeg1 = doesSegmentOverlap(startX, startY, startX, midY, obstacles);
      const vhvSeg2 = doesSegmentOverlap(startX, midY, endX, midY, obstacles);
      const vhvSeg3 = doesSegmentOverlap(endX, midY, endX, endY, obstacles);
      if (!vhvSeg1 && !vhvSeg2 && !vhvSeg3) {
        return { path: vhvPath, isVertical: false };
      }
    }
    
    // PRIORITY 4: Smart clearance routing (2 bends max)
    const midX = findOptimalMidpoint(startX, startY, endX, endY, obstacles);
    
    // First, try simple 3-segment H-V-H path
    const simpleHVHPath = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    const hvhSeg1 = doesSegmentOverlap(startX, startY, midX, startY, obstacles);
    const hvhSeg2 = doesSegmentOverlap(midX, startY, midX, endY, obstacles);
    const hvhSeg3 = doesSegmentOverlap(midX, endY, endX, endY, obstacles);
    
    if (!hvhSeg1 && !hvhSeg2 && !hvhSeg3) {
      return { path: simpleHVHPath, isVertical: false };
    }
    
    // If simple path is blocked, calculate clearance routing
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    let maxObstacleY = minY;
    let minObstacleY = maxY;
    
    obstacles.forEach(obs => {
      if (obs.x < maxX && obs.x + obs.width > minX) {
        maxObstacleY = Math.max(maxObstacleY, obs.y + obs.height);
        minObstacleY = Math.min(minObstacleY, obs.y);
      }
    });
    
    // Route above or below based on available space
    const clearance = 15;
    const routeAbove = startY < endY;
    const clearanceY = routeAbove ? maxObstacleY + clearance : minObstacleY - clearance;
    
    // Use proper 3-segment clearance path (2 bends)
    const clearedPath = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${clearanceY} L ${endX} ${clearanceY} L ${endX} ${endY}`;
    
    return { path: clearedPath, isVertical: false };
  };

  const renderLink = (link: GanttLink) => {
    const from = getItemPosition(link.fromSwimlaneId, link.fromId, link);
    const to = getItemPosition(link.toSwimlaneId, link.toId, link);

    if (!from || !to) {
      console.warn('Link positions not found:', { link, from, to });
      return null;
    }

    const { path, isVertical } = createRoutedPath(from, to, link.fromId, link.toId);

    const isSelected = selectedLink === link.id;
    const linkColor = link.color || "#00bcd4";
    const markerId = isVertical ? `arrowhead-v-${link.id}` : `arrowhead-h-${link.id}`;
    const selectedMarkerId = isVertical ? "arrowhead-selected-v" : "arrowhead-selected-h";

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
            markerWidth="10"
            markerHeight="10"
            refX={isVertical ? "3" : "9"}
            refY="3"
            orient={isVertical ? "90" : "auto"}
          >
            <polygon
              points="0 0, 10 3, 0 6"
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
        {/* Link type badge */}
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
        zIndex: 60,
        left: 0,
        top: 0,
        width: '100%',
        height: `${calculateTotalHeight()}px`,
        overflow: 'visible'
      }}
    >
      <defs>
        {/* Horizontal arrowheads */}
        <marker
          id="arrowhead-selected-h"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="hsl(var(--destructive))"
          />
        </marker>
        {/* Vertical arrowheads */}
        <marker
          id="arrowhead-selected-v"
          markerWidth="10"
          markerHeight="10"
          refX="3"
          refY="3"
          orient="90"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="hsl(var(--destructive))"
          />
        </marker>
      </defs>
      {data.links.map(renderLink)}
    </svg>
  );
};
