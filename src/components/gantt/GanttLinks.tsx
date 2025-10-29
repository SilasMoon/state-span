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

  const renderLink = (link: GanttLink) => {
    const from = getItemPosition(link.fromSwimlaneId, link.fromId);
    const to = getItemPosition(link.toSwimlaneId, link.toId);

    if (!from || !to) {
      console.warn('Link positions not found:', { link, from, to });
      return null;
    }

    // Create an elbowed path from end of first bar to start of second bar
    const midX = (from.x1 + to.x2) / 2;
    const path = `M ${from.x1} ${from.y1} L ${midX} ${from.y1} L ${midX} ${to.y2} L ${to.x2} ${to.y2}`;

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
            onLinkSelect(link.id);
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
