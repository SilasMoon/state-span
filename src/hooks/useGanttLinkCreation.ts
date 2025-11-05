import { useState, useEffect } from "react";
import { toast } from "sonner";

interface LinkDragStart {
  swimlaneId: string;
  itemId: string;
  handleType: 'start' | 'finish';
}

interface LinkDragCurrent {
  x: number;
  y: number;
}

export const useGanttLinkCreation = (addLink: (fromSwimlaneId: string, fromId: string, toSwimlaneId: string, toId: string, fromHandle?: 'start' | 'finish', toHandle?: 'start' | 'finish') => void) => {
  const [linkDragStart, setLinkDragStart] = useState<LinkDragStart | null>(null);
  const [linkDragCurrent, setLinkDragCurrent] = useState<LinkDragCurrent | null>(null);

  useEffect(() => {
    const handleStartLink = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { swimlaneId, itemId, handleType, x, y } = customEvent.detail;
      setLinkDragStart({ swimlaneId, itemId, handleType });
      setLinkDragCurrent({ x, y });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (linkDragStart) {
        e.preventDefault();
        e.stopPropagation();
        setLinkDragCurrent({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (linkDragStart) {
        const target = document.elementFromPoint(e.clientX, e.clientY);

        // First, check if dropped on a handle
        let toHandle: 'start' | 'finish' | undefined;
        const handleElement = target?.closest('[data-handle-type]');
        if (handleElement) {
          const handleType = handleElement.getAttribute('data-handle-type');
          toHandle = handleType === 'start' || handleType === 'finish' ? handleType : undefined;
        }

        const barElement = target?.closest('[data-item-id]');

        if (barElement) {
          const toSwimlaneId = barElement.getAttribute('data-swimlane-id');
          const toItemId = barElement.getAttribute('data-item-id');

          if (toSwimlaneId && toItemId &&
              (linkDragStart.swimlaneId !== toSwimlaneId || linkDragStart.itemId !== toItemId)) {

            // If toHandle wasn't determined by clicking a handle, determine by position
            if (!toHandle) {
              const rect = barElement.getBoundingClientRect();
              const relativeX = e.clientX - rect.left;
              const barWidth = rect.width;
              // If closer to left side, use start handle; otherwise use finish handle
              toHandle = relativeX < barWidth / 2 ? 'start' : 'finish';
            }

            addLink(linkDragStart.swimlaneId, linkDragStart.itemId, toSwimlaneId, toItemId, linkDragStart.handleType, toHandle);
            toast.success("Link created");
          }
        }

        setLinkDragStart(null);
        setLinkDragCurrent(null);
      }
    };

    window.addEventListener('startLinkDrag', handleStartLink);
    
    if (linkDragStart) {
      document.addEventListener('mousemove', handleMouseMove, { capture: true });
      document.addEventListener('mouseup', handleMouseUp, { capture: true });
      return () => {
        window.removeEventListener('startLinkDrag', handleStartLink);
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
      };
    }
    
    return () => window.removeEventListener('startLinkDrag', handleStartLink);
  }, [linkDragStart, addLink]);

  return {
    linkDragStart,
    linkDragCurrent,
  };
};
