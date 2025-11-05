import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GanttData, GanttLink, ZoomConfig } from "@/types/gantt";
import { Z_INDEX } from "@/lib/ganttConstants";

interface GanttLinksReactFlowProps {
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

// Custom smart edge component with smooth step routing and labels
const SmartEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 8,
  });

  const linkColor = data?.color || "#00bcd4";
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "hsl(var(--destructive))" : linkColor,
          strokeWidth: selected ? 3 : 2,
          filter: selected ? 'drop-shadow(0 0 4px hsl(var(--destructive)))' : undefined,
        }}
        markerEnd={`url(#arrowhead-${id})`}
      />

      {/* Arrowhead marker */}
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="4"
          orient="auto"
        >
          <polygon
            points="0 0, 10 4, 0 8"
            fill={selected ? "hsl(var(--destructive))" : linkColor}
            stroke="hsl(var(--background))"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </marker>
      </defs>

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + (data?.labelOffset?.x || 0)}px, ${labelY + (data?.labelOffset?.y || 0)}px)`,
              pointerEvents: 'all',
              fontSize: '12px',
              fontWeight: 500,
              padding: '4px 8px',
              cursor: 'move',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const edgeTypes = {
  smart: SmartEdge,
};

export const GanttLinksReactFlow = React.memo(({
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
}: GanttLinksReactFlowProps) => {
  const SWIMLANE_ROW_HEIGHT = 32;
  const TIMELINE_ROW1_HEIGHT = 24;
  const TIMELINE_ROW2_HEIGHT = 24;
  const TIMELINE_ROW3_HEIGHT = 24;
  const FLAG_ROW_HEIGHT = showTopFlags ? 64 : 0;
  const BAR_HEIGHT = 24;

  // Calculate Y position for a swimlane
  const findYPosition = useCallback((swimlaneId: string): number | null => {
    let currentY = TIMELINE_ROW1_HEIGHT + TIMELINE_ROW2_HEIGHT + TIMELINE_ROW3_HEIGHT + FLAG_ROW_HEIGHT;

    const traverseSwimlane = (currentId: string, targetId: string, y: number): number | null => {
      if (currentId === targetId) return y;

      const current = data.swimlanes[currentId];
      if (!current) return null;

      let nextY = y + SWIMLANE_ROW_HEIGHT;

      if (current.expanded && current.children.length > 0) {
        for (const childId of current.children) {
          const childResult = traverseSwimlane(childId, targetId, nextY);
          if (childResult !== null) return childResult;

          const childSwimlane = data.swimlanes[childId];
          if (childSwimlane) {
            nextY += getVisibleHeight(childId);
          }
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

    for (const rootId of data.rootIds) {
      const result = traverseSwimlane(rootId, swimlaneId, currentY);
      if (result !== null) return result;
      currentY += getVisibleHeight(rootId);
    }

    return null;
  }, [data.swimlanes, data.rootIds, TIMELINE_ROW1_HEIGHT, TIMELINE_ROW2_HEIGHT, TIMELINE_ROW3_HEIGHT, FLAG_ROW_HEIGHT, SWIMLANE_ROW_HEIGHT]);

  // Generate nodes from all bars
  const nodes = useMemo<Node[]>(() => {
    const nodeList: Node[] = [];

    Object.entries(data.swimlanes).forEach(([swimlaneId, swimlane]) => {
      const items = [...(swimlane.tasks || []), ...(swimlane.states || [])];

      items.forEach(item => {
        const tempPos = itemTempPositions[item.id];
        const effectiveSwimlaneId = tempPos?.swimlaneId || swimlaneId;
        const itemStart = tempPos?.start ?? item.start;
        const itemDuration = tempPos?.duration ?? item.duration;

        const rowTop = findYPosition(effectiveSwimlaneId);
        if (rowTop === null) return;

        const x = swimlaneColumnWidth + (itemStart / zoom.hoursPerColumn) * columnWidth;
        const width = (itemDuration / zoom.hoursPerColumn) * columnWidth;
        const y = rowTop + (SWIMLANE_ROW_HEIGHT / 2);

        // Create nodes for start and finish handles
        nodeList.push({
          id: `${item.id}-start`,
          type: 'default',
          position: { x, y },
          data: { label: '' },
          style: {
            width: 1,
            height: 1,
            opacity: 0,
            padding: 0,
            border: 'none',
            background: 'transparent',
          },
          draggable: false,
          selectable: false,
        });

        nodeList.push({
          id: `${item.id}-finish`,
          type: 'default',
          position: { x: x + width, y },
          data: { label: '' },
          style: {
            width: 1,
            height: 1,
            opacity: 0,
            padding: 0,
            border: 'none',
            background: 'transparent',
          },
          draggable: false,
          selectable: false,
        });
      });
    });

    return nodeList;
  }, [data.swimlanes, itemTempPositions, zoom.hoursPerColumn, columnWidth, swimlaneColumnWidth, findYPosition, SWIMLANE_ROW_HEIGHT]);

  // Generate edges from links
  const edges = useMemo<Edge[]>(() => {
    return data.links.map(link => {
      const fromHandle = link.fromHandle || 'finish';
      const toHandle = link.toHandle || 'start';

      const source = `${link.fromId}-${fromHandle}`;
      const target = `${link.toId}-${toHandle}`;

      return {
        id: link.id,
        source,
        target,
        type: 'smart',
        animated: false,
        selected: selectedLink === link.id,
        data: {
          color: link.color,
          label: link.label,
          labelOffset: link.labelOffset,
        },
      };
    });
  }, [data.links, selectedLink]);

  // Handle edge click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    onLinkSelect(selectedLink === edge.id ? "" : edge.id);
  }, [onLinkSelect, selectedLink]);

  // Handle edge double click
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    onLinkDoubleClick(edge.id);
  }, [onLinkDoubleClick]);

  const calculateTotalHeight = () => {
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

    let height = TIMELINE_ROW1_HEIGHT + TIMELINE_ROW2_HEIGHT + TIMELINE_ROW3_HEIGHT + FLAG_ROW_HEIGHT;
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

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${calculateTotalWidth()}px`,
        height: `${calculateTotalHeight()}px`,
        pointerEvents: 'none',
        zIndex: Z_INDEX.LINK,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={true}
        elementsSelectable={true}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        fitView={false}
      >
        <Background style={{ display: 'none' }} />
      </ReactFlow>
    </div>
  );
});

GanttLinksReactFlow.displayName = 'GanttLinksReactFlow';
