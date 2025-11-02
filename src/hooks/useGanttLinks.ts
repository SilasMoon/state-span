import { useCallback } from "react";
import { GanttData, GanttLink } from "@/types/gantt";

interface UseGanttLinksProps {
  updateData: (updater: (prev: GanttData) => GanttData) => void;
  generateId: () => string;
}

export const useGanttLinks = ({ updateData, generateId }: UseGanttLinksProps) => {
  const addLink = useCallback((fromSwimlaneId: string, fromId: string, toSwimlaneId: string, toId: string) => {
    const existingLink = (prev: GanttData) => 
      prev.links.find(
        (l) =>
          l.fromSwimlaneId === fromSwimlaneId &&
          l.fromId === fromId &&
          l.toSwimlaneId === toSwimlaneId &&
          l.toId === toId
      );

    updateData((prev) => {
      if (existingLink(prev)) {
        return prev;
      }

      // Get color from source item
      const fromSwimlane = prev.swimlanes[fromSwimlaneId];
      let sourceColor: string | undefined;
      
      if (fromSwimlane) {
        const sourceItem = fromSwimlane.tasks?.find(t => t.id === fromId) || 
                          fromSwimlane.states?.find(s => s.id === fromId);
        sourceColor = sourceItem?.color;
      }

      const link: GanttLink = {
        id: generateId(),
        fromSwimlaneId,
        fromId,
        toSwimlaneId,
        toId,
        color: sourceColor,
      };

      return {
        ...prev,
        links: [...prev.links, link],
      };
    });
  }, [updateData, generateId]);

  const deleteLink = useCallback((linkId: string) => {
    updateData((prev) => ({
      ...prev,
      links: prev.links.filter((link) => link.id !== linkId),
    }));
  }, [updateData]);

  const updateLink = useCallback((linkId: string, updates: Partial<GanttLink>) => {
    updateData((prev) => ({
      ...prev,
      links: prev.links.map((link) =>
        link.id === linkId ? { ...link, ...updates } : link
      ),
    }));
  }, [updateData]);

  return {
    addLink,
    deleteLink,
    updateLink,
  };
};
