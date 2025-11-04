import { useState, useEffect } from "react";
import { ZOOM_LEVELS } from "@/types/gantt";

export interface GanttConfig {
  columnWidths: number[]; // 16 values for each zoom level
  gridOpacity: number; // 0.0 - 1.0
  timescaleContrast: number; // 0.0 - 1.0
}

const DEFAULT_CONFIG: GanttConfig = {
  columnWidths: ZOOM_LEVELS.map(z => z.columnWidth),
  gridOpacity: 1.0,
  timescaleContrast: 1.0,
};

const STORAGE_KEY = 'gantt-config';

export const useGanttConfig = () => {
  const [config, setConfig] = useState<GanttConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      
      // Apply CSS variables for dynamic styling
      document.documentElement.style.setProperty('--gantt-grid-opacity', config.gridOpacity.toString());
      document.documentElement.style.setProperty('--gantt-timescale-contrast', config.timescaleContrast.toString());
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }, [config]);

  const updateConfig = (updates: Partial<GanttConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const exportConfig = () => {
    return JSON.stringify(config, null, 2);
  };

  const importConfig = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      setConfig({ ...DEFAULT_CONFIG, ...parsed });
    } catch (error) {
      throw new Error('Invalid configuration format');
    }
  };

  return {
    config,
    updateConfig,
    resetToDefaults,
    exportConfig,
    importConfig,
  };
};
