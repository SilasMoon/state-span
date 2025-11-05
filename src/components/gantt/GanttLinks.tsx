import React from "react";
import { GanttData, GanttLink, ZoomConfig } from "@/types/gantt";
import { Z_INDEX } from "@/lib/ganttConstants";

interface GanttLinksProps {
  data: GanttData;
  zoom: ZoomConfig;
  columnWidth: number;
  swimlaneColumnWidth: number;
  selectedLink: string | null;
  showTopFlags: boolean;
  onLinkSelect: (linkId: string) => void;
  onLinkDoubleClick: (linkId: string) => void;
  onLinkUpdate?: (linkId: string, updates: Partial<GanttLink>) => void;
  itemTempPositions?: Record<string, { start: number; duration: number; swimlaneId: string }>;
}

interface ItemPosition {
  x: number; // Left edge
  y: number; // Vertical center of ROW
  width: number;
  swimlaneId: string;
  barCenterY: number; // Vertical center of BAR itself (for proper attachment)
}

export const GanttLinks = React.memo(({
  data,
  zoom,
  columnWidth,
  swimlaneColumnWidth,
  selectedLink,
  showTopFlags,
  onLinkSelect,
  onLinkDoubleClick,
  onLinkUpdate,
  itemTempPositions = {},
}: GanttLinksProps) => {
  const SWIMLANE_ROW_HEIGHT = 32;
  const HEADER_HEIGHT = 32;
  const TIMELINE_ROW1_HEIGHT = 24;
  const TIMELINE_ROW2_HEIGHT = 24; // Always 3 rows now
  const TIMELINE_ROW3_HEIGHT = 24; // Always 3 rows now
  const FLAG_ROW_HEIGHT = showTopFlags ? 64 : 0;
  const BAR_HEIGHT = 24;
  const GRID_SIZE = 12; // Grid cell size for pathfinding

  // Ref to SVG element to get its position for coordinate transformation
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Force re-render when positions change (for scroll/resize)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // State for dragging labels
  const [draggingLabel, setDraggingLabel] = React.useState<{
    linkId: string;
    startX: number;
    startY: number;
    initialOffset: { x: number; y: number };
  } | null>(null);

  // State for dragging link segments
  const [draggingSegment, setDraggingSegment] = React.useState<{
    linkId: string;
    segmentIndex: number;
    startX: number;
    startY: number;
    initialPath: { x: number; y: number }[];
  } | null>(null);

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

  // Handle label drag
  const handleLabelMouseDown = (e: React.MouseEvent, linkId: string, currentOffset: { x: number; y: number }) => {
    e.stopPropagation();
    e.preventDefault();

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    setDraggingLabel({
      linkId,
      startX: e.clientX,
      startY: e.clientY,
      initialOffset: currentOffset,
    });
  };

  const handleLabelMouseMove = React.useCallback((e: MouseEvent) => {
    if (!draggingLabel || !onLinkUpdate) return;

    const deltaX = e.clientX - draggingLabel.startX;
    const deltaY = e.clientY - draggingLabel.startY;

    const newOffset = {
      x: draggingLabel.initialOffset.x + deltaX,
      y: draggingLabel.initialOffset.y + deltaY,
    };

    // Update the link with the new offset
    onLinkUpdate(draggingLabel.linkId, { labelOffset: newOffset });
  }, [draggingLabel, onLinkUpdate]);

  const handleLabelMouseUp = React.useCallback(() => {
    setDraggingLabel(null);
  }, []);

  // Attach label drag listeners
  React.useEffect(() => {
    if (draggingLabel) {
      document.addEventListener('mousemove', handleLabelMouseMove);
      document.addEventListener('mouseup', handleLabelMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleLabelMouseMove);
        document.removeEventListener('mouseup', handleLabelMouseUp);
      };
    }
  }, [draggingLabel, handleLabelMouseMove, handleLabelMouseUp]);

  // Handle segment drag
  const handleSegmentMouseDown = (
    e: React.MouseEvent,
    linkId: string,
    segmentIndex: number,
    currentPath: { x: number; y: number }[]
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setDraggingSegment({
      linkId,
      segmentIndex,
      startX: e.clientX,
      startY: e.clientY,
      initialPath: currentPath,
    });
  };

  const handleSegmentMouseMove = React.useCallback((e: MouseEvent) => {
    if (!draggingSegment || !onLinkUpdate) return;

    const deltaX = e.clientX - draggingSegment.startX;
    const deltaY = e.clientY - draggingSegment.startY;

    // Create new path with updated segment midpoint
    const newPath = [...draggingSegment.initialPath];
    const segmentIndex = draggingSegment.segmentIndex;

    // Insert a new control point if this is a straight segment
    // Or move the existing control point
    if (segmentIndex < newPath.length - 1) {
      const p1 = newPath[segmentIndex];
      const p2 = newPath[segmentIndex + 1];

      // Insert a new point at the dragged position
      const newPoint = {
        x: (p1.x + p2.x) / 2 + deltaX,
        y: (p1.y + p2.y) / 2 + deltaY,
      };

      newPath.splice(segmentIndex + 1, 0, newPoint);
    }

    // Update the link with the new custom path
    onLinkUpdate(draggingSegment.linkId, { customPath: newPath });
  }, [draggingSegment, onLinkUpdate]);

  const handleSegmentMouseUp = React.useCallback(() => {
    setDraggingSegment(null);
  }, []);

  // Attach segment drag listeners
  React.useEffect(() => {
    if (draggingSegment) {
      document.addEventListener('mousemove', handleSegmentMouseMove);
      document.addEventListener('mouseup', handleSegmentMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleSegmentMouseMove);
        document.removeEventListener('mouseup', handleSegmentMouseUp);
      };
    }
  }, [draggingSegment, handleSegmentMouseMove, handleSegmentMouseUp]);

  // Get item position with support for temp positions during drag
  const getItemPosition = (swimlaneId: string, itemId: string): ItemPosition | null => {
    const tempPos = itemTempPositions[itemId];
    const effectiveSwimlaneId = tempPos?.swimlaneId || swimlaneId;
    
    const swimlane = data.swimlanes[effectiveSwimlaneId];
    if (!swimlane) return null;

    const item = swimlane.tasks?.find((a) => a.id === itemId) || 
                 swimlane.states?.find((s) => s.id === itemId);
    if (!item) return null;
    
    const itemStart = tempPos?.start ?? item.start;
    const itemDuration = tempPos?.duration ?? item.duration;

    // Calculate vertical position
    const rowTop = findYPosition(effectiveSwimlaneId);
    if (rowTop === null) return null;
    
    // Calculate position from data using zoom and columnWidth
    // This ensures arrows update immediately when zoom changes
    const x = (itemStart / zoom.hoursPerColumn) * columnWidth;
    const width = (itemDuration / zoom.hoursPerColumn) * columnWidth;
    
    // Calculate barCenterY from row position
    const barCenterY = rowTop + (SWIMLANE_ROW_HEIGHT / 2);

    return {
      x,
      y: rowTop + 16,
      width,
      swimlaneId: effectiveSwimlaneId,
      barCenterY
    };
  };

  const findYPosition = (swimlaneId: string): number | null => {
    // Timeline rows are the header (not HEADER_HEIGHT + timeline rows)
    // The "Swimlanes" label is in a flex row with the timeline, so it doesn't add vertical height
    let currentY = TIMELINE_ROW1_HEIGHT + TIMELINE_ROW2_HEIGHT + TIMELINE_ROW3_HEIGHT + FLAG_ROW_HEIGHT; // Start after all headers

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
    
    let nextY = currentY + SWIMLANE_ROW_HEIGHT;
    
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
    
    let height = SWIMLANE_ROW_HEIGHT;
    if (swimlane.expanded) {
      for (const childId of swimlane.children) {
        height += getVisibleHeight(childId);
      }
    }
    return height;
  };

  const calculateTotalHeight = () => {
    // Timeline rows are the header (not HEADER_HEIGHT + timeline rows)
    let height = TIMELINE_ROW1_HEIGHT + TIMELINE_ROW2_HEIGHT + TIMELINE_ROW3_HEIGHT + FLAG_ROW_HEIGHT; // All header rows
    data.rootIds.forEach(id => {
      height += getVisibleHeight(id);
    });
    return height;
  };

  const calculateTotalWidth = () => {
    let maxHour = 240;
    Object.values(data.swimlanes).forEach((swimlane) => {
      swimlane.tasks?.forEach((task) => {
        const endHour = task.start + task.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
      swimlane.states?.forEach((state) => {
        const endHour = state.start + state.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
    });
    const totalHours = Math.ceil((maxHour * 1.2) / 24) * 24;
    return swimlaneColumnWidth + (totalHours / zoom.hoursPerColumn) * columnWidth;
  };

  // Collect all task bars with their positions
  const collectTaskBars = () => {
    const bars: Array<{ x: number; y: number; width: number; height: number; id: string }> = [];
    
    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.tasks || []), ...(swimlane.states || [])];
      
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
      gutters.unshift(rowYPositions[0] - SWIMLANE_ROW_HEIGHT / 2);
      gutters.push(rowYPositions[rowYPositions.length - 1] + SWIMLANE_ROW_HEIGHT / 2);
    }
    
    return gutters;
  };

  const collectRowYPositions = (swimlaneId: string, positions: number[]) => {
    const y = findYPosition(swimlaneId);
    if (y !== null) {
      positions.push(y + SWIMLANE_ROW_HEIGHT / 2);
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

    // Calculate anchor points based on the handle types stored in the link
    // Add swimlaneColumnWidth offset because SVG coordinate system starts at chart origin (0,0)
    // Subtract half the stroke width (1px for 2px stroke) to align with bar edge
    const STROKE_OFFSET = 1; // Half of the 2px stroke width

    // Determine startX based on fromHandle (default to 'finish' for backward compatibility)
    const fromHandle = link.fromHandle || 'finish';
    const startX = fromHandle === 'start'
      ? swimlaneColumnWidth + fromPos.x - STROKE_OFFSET  // Start handle (left edge)
      : swimlaneColumnWidth + fromPos.x + fromPos.width - STROKE_OFFSET; // Finish handle (right edge)

    // Determine endX based on toHandle (default to 'start' for backward compatibility)
    const toHandle = link.toHandle || 'start';
    const endX = toHandle === 'start'
      ? swimlaneColumnWidth + toPos.x - STROKE_OFFSET  // Start handle (left edge)
      : swimlaneColumnWidth + toPos.x + toPos.width - STROKE_OFFSET; // Finish handle (right edge)

    // Use barCenterY for exact vertical center attachment
    const start = { x: startX, y: fromPos.barCenterY };
    const end = { x: endX, y: toPos.barCenterY };

    // Special case: same position
    if (Math.abs(start.x - end.x) < 5 && Math.abs(start.y - end.y) < 5) {
      return null;
    }

    // Use custom path if available, otherwise generate elbowed path
    const pathPoints = link.customPath || generateElbowedPath(start, end, link.fromId, link.toId);
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
          strokeWidth="6"
          fill="none"
          className="cursor-pointer"
          style={{ pointerEvents: 'stroke' }}
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
          opacity="1"
          className="pointer-events-none transition-all duration-200"
          style={{
            filter: isSelected ? 'drop-shadow(0 0 4px hsl(var(--destructive)))' : undefined
          }}
        />
        
        {/* Arrowhead marker */}
        <defs>
          <marker
            id={markerId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="4"
            orient="auto"
          >
            <polygon
              points="0 0, 10 4, 0 8"
              fill={isSelected ? "hsl(var(--destructive))" : linkColor}
              stroke="hsl(var(--background))"
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity="1"
            />
          </marker>
        </defs>

        {/* Draggable segment handles - only show when selected */}
        {isSelected && pathPoints.length > 2 && pathPoints.slice(0, -1).map((point, i) => {
          const nextPoint = pathPoints[i + 1];
          const midX = (point.x + nextPoint.x) / 2;
          const midY = (point.y + nextPoint.y) / 2;

          return (
            <circle
              key={`segment-${i}`}
              cx={midX}
              cy={midY}
              r="6"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="2"
              className="cursor-move pointer-events-auto"
              style={{ opacity: 0.8 }}
              onMouseDown={(e) => handleSegmentMouseDown(e, link.id, i, pathPoints)}
            />
          );
        })}

        {/* Link label */}
        {link.label && (
          <foreignObject
            x={start.x + (end.x - start.x) / 2 - 40 + (link.labelOffset?.x || 0)}
            y={start.y + (end.y - start.y) / 2 - 12 + (link.labelOffset?.y || 0)}
            width="80"
            height="24"
            className="pointer-events-auto"
          >
            <div
              className="flex items-center justify-center cursor-move"
              onMouseDown={(e) => handleLabelMouseDown(e, link.id, link.labelOffset || { x: 0, y: 0 })}
            >
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
  const totalWidth = calculateTotalWidth();
  
  // SVG positioned at 0,0 covering the full chart area including swimlane column
  // Coordinates in renderLink are adjusted by swimlaneColumnWidth
  // Links are placed below all bars (task and state) so bars always appear on top
  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: `${swimlaneColumnWidth + totalWidth}px`,
        height: `${totalHeight}px`,
        zIndex: Z_INDEX.LINK, // Above bars for visibility and editing
      }}
    >
      {data.links.map(renderLink)}
    </svg>
  );
});
