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


  // Get Y-ranges of all activities (excluding source/target)
  const getActivityYRanges = (excludeFromId?: string, excludeToId?: string) => {
    const ranges: Array<{ minY: number; maxY: number; activityId: string }> = [];
    const margin = 15; // Vertical margin around activities
    
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.activities || []), ...(swimlane.states || [])];
      items.forEach((item) => {
        if (item.id === excludeFromId || item.id === excludeToId) {
          return;
        }
        
        const pos = getItemPosition(swimlaneId, item.id);
        if (pos) {
          ranges.push({
            minY: pos.y1 - margin,
            maxY: pos.y1 + margin,
            activityId: item.id,
          });
        }
      });
    });
    return ranges;
  };

  // Check if a horizontal line at given Y crosses any activity's Y-range
  const doesHorizontalLineCrossActivity = (y: number, ranges: Array<{ minY: number; maxY: number }>) => {
    return ranges.some(range => y >= range.minY && y <= range.maxY);
  };

  const createRoutedPath = (from: { x1: number; y1: number }, 
                            to: { x2: number; y2: number },
                            fromId?: string,
                            toId?: string): { path: string; isVertical: boolean } => {
    const startX = from.x1;
    const startY = from.y1;
    const endX = to.x2;
    const endY = to.y2;
    
    const activityRanges = getActivityYRanges(fromId, toId);
    
    // RULE 1: Pure vertical link (only case for vertical arrow)
    if (Math.abs(startX - endX) < 5) {
      return { path: `M ${startX} ${startY} L ${endX} ${endY}`, isVertical: true };
    }
    
    // RULE 2: Direct horizontal link
    if (Math.abs(startY - endY) < 5) {
      if (!doesHorizontalLineCrossActivity(startY, activityRanges)) {
        return { path: `M ${startX} ${startY} L ${endX} ${endY}`, isVertical: false };
      }
    }
    
    // RULE 3: Two-segment H-V pattern
    const hvPath = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
    if (!doesHorizontalLineCrossActivity(startY, activityRanges)) {
      return { path: hvPath, isVertical: false };
    }
    
    // RULE 4: Two-segment V-H pattern
    const vhPath = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
    if (!doesHorizontalLineCrossActivity(endY, activityRanges)) {
      return { path: vhPath, isVertical: false };
    }
    
    // RULE 5: Three-segment routing with safe Y coordinate
    // Find a Y coordinate that doesn't cross any activities
    let safeY: number;
    
    // Collect all activity Y positions
    const activityYs = activityRanges.map(r => (r.minY + r.maxY) / 2);
    const minActivityY = activityRanges.length > 0 ? Math.min(...activityRanges.map(r => r.minY)) : startY;
    const maxActivityY = activityRanges.length > 0 ? Math.max(...activityRanges.map(r => r.maxY)) : startY;
    
    // Try different safe Y options
    const safeYOptions = [
      maxActivityY + 30, // Above all activities
      minActivityY - 30, // Below all activities
      (startY + endY) / 2, // Midpoint
    ];
    
    // Pick the first safe Y that doesn't cross activities
    safeY = safeYOptions.find(y => !doesHorizontalLineCrossActivity(y, activityRanges)) || safeYOptions[0];
    
    const threePath = `M ${startX} ${startY} L ${startX} ${safeY} L ${endX} ${safeY} L ${endX} ${endY}`;
    return { path: threePath, isVertical: false };
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
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
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
        zIndex: 60,
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
      </defs>
      {data.links.map(renderLink)}
    </svg>
  );
};
