import React from "react";
import { GanttData, GanttLink, ZoomLevel } from "@/types/gantt";

interface GanttLinksProps {
  data: GanttData;
  zoom: ZoomLevel;
  columnWidth: number;
  selectedLink: string | null;
  onLinkSelect: (linkId: string) => void;
  onLinkColorChange: (linkId: string, color: string) => void;
}

export const GanttLinks = ({ data, zoom, columnWidth, selectedLink, onLinkSelect, onLinkColorChange }: GanttLinksProps) => {
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
    const lineMinX = Math.min(x1, x2);
    const lineMaxX = Math.max(x1, x2);
    const lineMinY = Math.min(y1, y2);
    const lineMaxY = Math.max(y1, y2);
    
    for (const act of activities) {
      if (lineMaxX >= act.x && lineMinX <= act.x + act.width &&
          lineMaxY >= act.y && lineMinY <= act.y + act.height) {
        return true;
      }
    }
    return false;
  };

  const createRoutedPath = (from: { x1: number; y1: number; x2: number; y2: number }, 
                            to: { x1: number; y1: number; x2: number; y2: number }): { path: string; isVertical: boolean } => {
    // Vertical alignment - straight line (0 bends) - arrow should be vertical
    if (Math.abs(from.x1 - to.x2) < 5) {
      return { path: `M ${from.x1} ${from.y1} L ${to.x2} ${to.y2}`, isVertical: true };
    }
    
    // Horizontal alignment - straight line (0 bends) - arrow should be horizontal
    if (Math.abs(from.y1 - to.y2) < 5) {
      return { path: `M ${from.x1} ${from.y1} L ${to.x2} ${to.y2}`, isVertical: false };
    }
    
    const allActivities = getAllItemPositions();
    
    // Try 2-segment paths (1 bend)
    const twoSegmentPaths = [
      // Horizontal then vertical - arrow ends vertical
      { 
        path: `M ${from.x1} ${from.y1} L ${to.x2} ${from.y1} L ${to.x2} ${to.y2}`, 
        segments: [[from.x1, from.y1, to.x2, from.y1], [to.x2, from.y1, to.x2, to.y2]],
        isVertical: true
      },
      // Vertical then horizontal - arrow ends horizontal
      { 
        path: `M ${from.x1} ${from.y1} L ${from.x1} ${to.y2} L ${to.x2} ${to.y2}`, 
        segments: [[from.x1, from.y1, from.x1, to.y2], [from.x1, to.y2, to.x2, to.y2]],
        isVertical: false
      },
    ];
    
    for (const { path, segments, isVertical } of twoSegmentPaths) {
      let hasOverlap = false;
      for (const [x1, y1, x2, y2] of segments) {
        if (doesPathOverlap(x1, y1, x2, y2, allActivities)) {
          hasOverlap = true;
          break;
        }
      }
      if (!hasOverlap) return { path, isVertical };
    }
    
    // Try 3-segment path with midpoint (2 bends) - arrow ends horizontal
    const midX = (from.x1 + to.x2) / 2;
    const threeSegmentPath = {
      path: `M ${from.x1} ${from.y1} L ${midX} ${from.y1} L ${midX} ${to.y2} L ${to.x2} ${to.y2}`,
      segments: [[from.x1, from.y1, midX, from.y1], [midX, from.y1, midX, to.y2], [midX, to.y2, to.x2, to.y2]],
      isVertical: false
    };
    
    let hasOverlap = false;
    for (const [x1, y1, x2, y2] of threeSegmentPath.segments) {
      if (doesPathOverlap(x1, y1, x2, y2, allActivities)) {
        hasOverlap = true;
        break;
      }
    }
    if (!hasOverlap) return { path: threeSegmentPath.path, isVertical: threeSegmentPath.isVertical };
    
    // Route around obstacles - arrow ends horizontal
    const VERTICAL_OFFSET = 60;
    const routeY = from.y1 > to.y2 ? Math.min(from.y1, to.y2) - VERTICAL_OFFSET : Math.max(from.y1, to.y2) + VERTICAL_OFFSET;
    return { 
      path: `M ${from.x1} ${from.y1} L ${from.x1 + 20} ${from.y1} L ${from.x1 + 20} ${routeY} L ${to.x2 - 20} ${routeY} L ${to.x2 - 20} ${to.y2} L ${to.x2} ${to.y2}`,
      isVertical: true
    };
  };

  const renderLink = (link: GanttLink) => {
    const from = getItemPosition(link.fromSwimlaneId, link.fromId);
    const to = getItemPosition(link.toSwimlaneId, link.toId);

    if (!from || !to) {
      console.warn('Link positions not found:', { link, from, to });
      return null;
    }

    const { path, isVertical } = createRoutedPath(from, to);

    console.log('Rendering link:', { link, from, to, path, isVertical });

    const isSelected = selectedLink === link.id;
    const linkColor = link.color || "#00bcd4";
    const markerId = isVertical ? `arrowhead-v-${link.id}` : `arrowhead-h-${link.id}`;
    const selectedMarkerId = isVertical ? "arrowhead-selected-v" : "arrowhead-selected-h";

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
        {/* Color picker when selected */}
        {isSelected && (
          <foreignObject
            x={from.x1 + (to.x2 - from.x1) / 2 - 20}
            y={Math.min(from.y1, to.y2) - 35}
            width="40"
            height="30"
          >
            <input
              type="color"
              value={linkColor}
              onChange={(e) => {
                e.stopPropagation();
                onLinkColorChange(link.id, e.target.value);
              }}
              className="w-full h-full cursor-pointer border-2 border-background rounded"
              style={{ pointerEvents: 'all' }}
            />
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
