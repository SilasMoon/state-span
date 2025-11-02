import { useState } from "react";

interface DragPreview {
  itemId: string;
  swimlaneId: string;
  targetSwimlaneId: string;
  tempStart: number;
  tempDuration: number;
  color: string;
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
}

interface ItemTempPosition {
  start: number;
  duration: number;
  swimlaneId: string;
}

export const useGanttDragAndDrop = () => {
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [itemTempPositions, setItemTempPositions] = useState<Record<string, ItemTempPosition>>({});

  const handleDragStateChange = (itemId: string, swimlaneId: string, itemColor: string) =>
    (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => {
      if (isDragging) {
        setItemTempPositions(prev => ({
          ...prev,
          [itemId]: {
            start: tempStart,
            duration: tempDuration,
            swimlaneId: targetSwimlaneId || swimlaneId
          }
        }));
        
        if (targetSwimlaneId) {
          setDragPreview(prev => ({
            itemId,
            swimlaneId,
            targetSwimlaneId,
            tempStart,
            tempDuration,
            color: itemColor,
            mouseX,
            mouseY,
            offsetX: offsetX !== undefined ? offsetX : (prev?.offsetX || 0),
            offsetY: offsetY !== undefined ? offsetY : (prev?.offsetY || 0),
          }));
        }
      } else {
        setItemTempPositions(prev => {
          const newPositions = { ...prev };
          delete newPositions[itemId];
          return newPositions;
        });
        setDragPreview(null);
      }
    };

  const clearDragState = () => {
    setDragPreview(null);
    setItemTempPositions({});
  };

  return {
    dragPreview,
    itemTempPositions,
    handleDragStateChange,
    clearDragState,
  };
};
