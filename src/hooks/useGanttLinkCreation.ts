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

export const useGanttLinkCreation = (addLink: (fromSwimlaneId: string, fromId: string, toSwimlaneId: string, toId: string) => void) => {
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
        const barElement = target?.closest('[data-item-id]');
        
        if (barElement) {
          const toSwimlaneId = barElement.getAttribute('data-swimlane-id');
          const toItemId = barElement.getAttribute('data-item-id');
          
          if (toSwimlaneId && toItemId && 
              (linkDragStart.swimlaneId !== toSwimlaneId || linkDragStart.itemId !== toItemId)) {
            addLink(linkDragStart.swimlaneId, linkDragStart.itemId, toSwimlaneId, toItemId);
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
