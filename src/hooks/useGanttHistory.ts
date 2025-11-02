import { useState, useCallback } from "react";
import { GanttData } from "@/types/gantt";

const MAX_HISTORY = 50;

export const useGanttHistory = (initialData: GanttData) => {
  const [data, setData] = useState<GanttData>(initialData);
  const [history, setHistory] = useState<GanttData[]>([initialData]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateData = useCallback((updater: (prev: GanttData) => GanttData) => {
    setData((prev) => {
      const newData = updater(prev);
      
      // Add to history
      setHistory((prevHistory) => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(newData);
        
        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
          setHistoryIndex((prev) => prev);
        } else {
          setHistoryIndex((prev) => prev + 1);
        }
        
        return newHistory;
      });
      
      return newData;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData(history[newIndex]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData(history[newIndex]);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    data,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
