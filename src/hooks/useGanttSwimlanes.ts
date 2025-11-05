import { useCallback } from "react";
import { GanttData, GanttSwimlane } from "@/types/gantt";

interface UseGanttSwimlanesProps {
  updateData: (updater: (prev: GanttData) => GanttData) => void;
  generateId: () => string;
}

export const useGanttSwimlanes = ({ updateData, generateId }: UseGanttSwimlanesProps) => {
  const addSwimlane = useCallback((type: "task" | "state", parentId?: string) => {
    const id = generateId();
    const swimlane: GanttSwimlane = {
      id,
      name: type === "task" ? "New Task Swimlane" : "New State Swimlane",
      type,
      parentId,
      children: [],
      expanded: true,
    };

    updateData((prev) => {
      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes, [id]: swimlane };

      if (parentId) {
        const parent = newData.swimlanes[parentId];
        newData.swimlanes[parentId] = {
          ...parent,
          children: [...parent.children, id],
          tasks: parent.type === "task" ? [] : parent.tasks,
          states: parent.type === "state" ? [] : parent.states,
        };
      } else {
        newData.rootIds = [...prev.rootIds, id];
      }

      return newData;
    });

    return id;
  }, [updateData, generateId]);

  const deleteSwimlane = useCallback((id: string) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[id];
      if (!swimlane) return prev;

      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes };

      const recursiveDelete = (swimlaneId: string) => {
        const toDelete = newData.swimlanes[swimlaneId];
        if (!toDelete) return;

        toDelete.children.forEach(recursiveDelete);
        delete newData.swimlanes[swimlaneId];

        newData.links = newData.links.filter(
          (link) =>
            link.fromSwimlaneId !== swimlaneId && link.toSwimlaneId !== swimlaneId
        );
      };

      recursiveDelete(id);

      if (swimlane.parentId) {
        const parent = newData.swimlanes[swimlane.parentId];
        if (parent) {
          newData.swimlanes[swimlane.parentId] = {
            ...parent,
            children: parent.children.filter((childId) => childId !== id),
          };
        }
      } else {
        newData.rootIds = newData.rootIds.filter((rootId) => rootId !== id);
      }

      return newData;
    });
  }, [updateData]);

  const toggleExpanded = useCallback((id: string) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [id]: {
          ...prev.swimlanes[id],
          expanded: !prev.swimlanes[id].expanded,
        },
      },
    }));
  }, [updateData]);

  const updateSwimlane = useCallback((id: string, updates: Partial<GanttSwimlane>) => {
    updateData((prev) => ({
      ...prev,
      swimlanes: {
        ...prev.swimlanes,
        [id]: {
          ...prev.swimlanes[id],
          ...updates,
        },
      },
    }));
  }, [updateData]);

  const moveSwimlane = useCallback((swimlaneId: string, targetParentId: string | null, insertBeforeId: string | null) => {
    updateData((prev) => {
      const swimlane = prev.swimlanes[swimlaneId];
      if (!swimlane) return prev;

      const isDescendant = (potentialParentId: string): boolean => {
        if (potentialParentId === swimlaneId) return true;
        const potentialParent = prev.swimlanes[potentialParentId];
        if (!potentialParent || !potentialParent.parentId) return false;
        return isDescendant(potentialParent.parentId);
      };

      if (targetParentId && isDescendant(targetParentId)) {
        return prev;
      }

      const newData = { ...prev };
      newData.swimlanes = { ...prev.swimlanes };

      let actualInsertBeforeId = insertBeforeId;
      if (insertBeforeId?.startsWith('after:')) {
        const afterId = insertBeforeId.substring(6);
        const siblings = targetParentId 
          ? newData.swimlanes[targetParentId].children 
          : newData.rootIds;
        const afterIndex = siblings.indexOf(afterId);
        if (afterIndex >= 0 && afterIndex < siblings.length - 1) {
          actualInsertBeforeId = siblings[afterIndex + 1];
        } else {
          actualInsertBeforeId = null;
        }
      }

      if (swimlane.parentId) {
        const oldParent = newData.swimlanes[swimlane.parentId];
        newData.swimlanes[swimlane.parentId] = {
          ...oldParent,
          children: oldParent.children.filter(id => id !== swimlaneId),
        };
      } else {
        newData.rootIds = newData.rootIds.filter(id => id !== swimlaneId);
      }

      newData.swimlanes[swimlaneId] = {
        ...swimlane,
        parentId: targetParentId || undefined,
      };

      if (targetParentId) {
        const newParent = newData.swimlanes[targetParentId];
        const newChildren = [...newParent.children];
        
        if (actualInsertBeforeId) {
          const insertIndex = newChildren.indexOf(actualInsertBeforeId);
          if (insertIndex >= 0) {
            newChildren.splice(insertIndex, 0, swimlaneId);
          } else {
            newChildren.push(swimlaneId);
          }
        } else {
          newChildren.push(swimlaneId);
        }

        newData.swimlanes[targetParentId] = {
          ...newParent,
          children: newChildren,
          tasks: newParent.type === "task" && newChildren.length === 1 ? [] : newParent.tasks,
          states: newParent.type === "state" && newChildren.length === 1 ? [] : newParent.states,
        };
      } else {
        const newRootIds = [...newData.rootIds];
        
        if (actualInsertBeforeId) {
          const insertIndex = newRootIds.indexOf(actualInsertBeforeId);
          if (insertIndex >= 0) {
            newRootIds.splice(insertIndex, 0, swimlaneId);
          } else {
            newRootIds.push(swimlaneId);
          }
        } else {
          newRootIds.push(swimlaneId);
        }

        newData.rootIds = newRootIds;
      }

      return newData;
    });
  }, [updateData]);

  return {
    addSwimlane,
    deleteSwimlane,
    toggleExpanded,
    updateSwimlane,
    moveSwimlane,
  };
};
