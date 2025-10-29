import React from "react";
import { GanttData, GanttLink, ZoomLevel } from "@/types/gantt";

interface GanttLinksProps {
  data: GanttData;
  zoom: ZoomLevel;
  columnWidth: number;
  selectedLink: string | null;
  onLinkSelect: (linkId: string) => void;
}

export const GanttLinks = ({ data, zoom, columnWidth, selectedLink, onLinkSelect }: GanttLinksProps) => {
  console.log('GanttLinks render:', { linksCount: data.links.length, links: data.links });
  const getItemPosition = (swimlaneId: string, itemId: string) => {
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

    return {
      x1: x + width, // End of bar
      y1: y + 24, // Middle of row (row height is 48, so 24 is middle)
      x2: x, // Start of bar
      y2: y + 24,
    };
  };

  const getAllItemPositions = () => {
    const positions: Array<{ x: number; y: number; width: number; height: number }> = [];
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      items.forEach((item) => {
        const pos = getItemPosition(swimlaneId, item.id);
        if (pos) {
          positions.push({
            x: pos.x2,
            y: pos.y2 - 20,
            width: pos.x1 - pos.x2,
            height: 40,
          });
        }
      });
    });
    return positions;
  };

  const doesPathOverlap = (x1: number, y1: number, x2: number, y2: number, activities: Array<{ x: number; y: number; width: number; height: number }>) => {
    // Check if a straight line segment overlaps with any activity
    for (const act of activities) {
      // Simple bounding box intersection check
      const lineMinX = Math.min(x1, x2);
      const lineMaxX = Math.max(x1, x2);
      const lineMinY = Math.min(y1, y2);
      const lineMaxY = Math.max(y1, y2);
      
      if (lineMaxX >= act.x && lineMinX <= act.x + act.width &&
          lineMaxY >= act.y && lineMinY <= act.y + act.height) {
        return true;
      }
    }
    return false;
  };

  const createRoutedPath = (from: { x1: number; y1: number; x2: number; y2: number }, 
                            to: { x1: number; y1: number; x2: number; y2: number }) => {
    const allActivities = getAllItemPositions();
    const VERTICAL_OFFSET = 60; // Offset to route above/below activities
    
    // Check if vertically aligned (same or close X position)
    if (Math.abs(from.x1 - to.x2) < 20) {
      // Vertical path - go straight down/up
      return `M ${from.x1} ${from.y1} L ${from.x1} ${to.y2}`;
    }
    
    // Try direct elbowed path first
    const midX = (from.x1 + to.x2) / 2;
    const directPath = [
      { x: from.x1, y: from.y1 },
      { x: midX, y: from.y1 },
      { x: midX, y: to.y2 },
      { x: to.x2, y: to.y2 }
    ];
    
    // Check if direct path overlaps any activities
    let hasOverlap = false;
    for (let i = 0; i < directPath.length - 1; i++) {
      if (doesPathOverlap(directPath[i].x, directPath[i].y, directPath[i + 1].x, directPath[i + 1].y, allActivities)) {
        hasOverlap = true;
        break;
      }
    }
    
    if (!hasOverlap) {
      return `M ${from.x1} ${from.y1} L ${midX} ${from.y1} L ${midX} ${to.y2} L ${to.x2} ${to.y2}`;
    }
    
    // If overlap detected, route around by going up/down first
    const routeY = from.y1 > to.y2 ? Math.min(from.y1, to.y2) - VERTICAL_OFFSET : Math.max(from.y1, to.y2) + VERTICAL_OFFSET;
    
    return `M ${from.x1} ${from.y1} L ${from.x1 + 20} ${from.y1} L ${from.x1 + 20} ${routeY} L ${to.x2 - 20} ${routeY} L ${to.x2 - 20} ${to.y2} L ${to.x2} ${to.y2}`;
  };

  const renderLink = (link: GanttLink) => {
    const from = getItemPosition(link.fromSwimlaneId, link.fromId);
    const to = getItemPosition(link.toSwimlaneId, link.toId);

    if (!from || !to) {
      console.warn('Link positions not found:', { link, from, to });
      return null;
    }

    const path = createRoutedPath(from, to);

    console.log('Rendering link:', { link, from, to, path });

    const isSelected = selectedLink === link.id;

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
            // Toggle selection
            if (isSelected) {
              onLinkSelect("");
            } else {
              onLinkSelect(link.id);
            }
          }}
        />
        {/* Visible path */}
        <path
          d={path}
          stroke={isSelected ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth={isSelected ? "3" : "2"}
          fill="none"
          markerEnd="url(#arrowhead)"
          opacity={isSelected ? "1" : "0.7"}
          className="pointer-events-none"
        />
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
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="hsl(var(--primary))"
          />
        </marker>
      </defs>
      {data.links.map(renderLink)}
    </svg>
  );
};
