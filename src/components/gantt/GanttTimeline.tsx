import React, { useMemo } from "react";
import { ZoomConfig } from "@/types/gantt";

interface GanttTimelineProps {
  zoom: ZoomConfig;
  totalHours: number;
}

export const GanttTimeline = React.memo(({ zoom, totalHours }: GanttTimelineProps) => {
  const columnWidth = zoom.columnWidth;
  const columns = Math.ceil(totalHours / zoom.hoursPerColumn);

  // Use zoom config flags directly for what to show
  const shouldShowDays = zoom.showDays;
  const shouldShowHours = zoom.showHours;
  const shouldShowMinutes = zoom.showMinutes;

  // Memoize the rendering to avoid recalculation
  const daysRow = useMemo(() => {
    if (!shouldShowDays) return [];

    const elements = [];
    let currentDay = -1;
    let dayStartColumn = 0;

    for (let i = 0; i <= columns; i++) {
      const hour = i * zoom.hoursPerColumn;
      const day = Math.floor(hour / 24);

      if (day !== currentDay || i === columns) {
        if (currentDay >= 0) {
          const columnsInDay = i - dayStartColumn;
          const dayWidth = columnsInDay * columnWidth;
          // Alternate background based on day number
          const isEven = currentDay % 2 === 0;

          elements.push(
            <div
              key={`day-${currentDay}`}
              className="flex items-center px-2 border-r border-gantt-grid text-xs font-semibold"
              style={{
                width: `${dayWidth}px`,
                minWidth: `${dayWidth}px`,
                backgroundColor: isEven
                  ? 'hsl(var(--gantt-header))'
                  : `hsla(var(--muted) / calc(0.5 * var(--gantt-timescale-contrast)))`
              }}
            >
              {currentDay}d
            </div>
          );
        }
        currentDay = day;
        dayStartColumn = i;
      }
    }

    return elements;
  }, [shouldShowDays, columns, zoom.hoursPerColumn, columnWidth]);

  const hoursRow = useMemo(() => {
    if (!shouldShowHours) return [];

    const elements = [];
    let currentHour = -1;
    let hourStartColumn = 0;

    for (let i = 0; i <= columns; i++) {
      const totalHour = i * zoom.hoursPerColumn;
      const hour = Math.floor(totalHour);

      if (hour !== currentHour || i === columns) {
        if (currentHour >= 0) {
          const columnsInHour = i - hourStartColumn;
          const hourWidth = columnsInHour * columnWidth;
          const hourInDay = currentHour % 24;
          // Alternate background based on hour value
          const isEven = currentHour % 2 === 0;

          elements.push(
            <div
              key={`hour-${currentHour}`}
              className="flex items-center px-2 border-r border-gantt-grid text-xs"
              style={{
                width: `${hourWidth}px`,
                minWidth: `${hourWidth}px`,
                backgroundColor: isEven
                  ? 'hsl(var(--background))'
                  : `hsla(var(--muted) / calc(0.3 * var(--gantt-timescale-contrast)))`
              }}
            >
              <div className="text-gantt-text-muted">{hourInDay}h</div>
            </div>
          );
        }
        currentHour = hour;
        hourStartColumn = i;
      }
    }

    return elements;
  }, [shouldShowHours, columns, zoom.hoursPerColumn, columnWidth]);

  const minutesRow = useMemo(() => {
    if (!shouldShowMinutes) return [];

    const elements = [];
    let currentMinute = -1;
    let minuteStartColumn = 0;

    for (let i = 0; i <= columns; i++) {
      const totalHour = i * zoom.hoursPerColumn;
      const minute = Math.floor(totalHour * 60);

      if (minute !== currentMinute || i === columns) {
        if (currentMinute >= 0) {
          const columnsInMinute = i - minuteStartColumn;
          const minuteWidth = columnsInMinute * columnWidth;
          const minuteInHour = currentMinute % 60;
          // Alternate background based on minute value
          const isEven = currentMinute % 2 === 0;

          elements.push(
            <div
              key={`minute-${currentMinute}`}
              className="flex items-center px-2 border-r border-gantt-grid text-xs"
              style={{
                width: `${minuteWidth}px`,
                minWidth: `${minuteWidth}px`,
                backgroundColor: isEven
                  ? 'hsl(var(--gantt-bg))'
                  : `hsla(var(--muted) / calc(0.2 * var(--gantt-timescale-contrast)))`
              }}
            >
              <div className="text-gantt-text-muted">{minuteInHour.toString().padStart(2, '0')}</div>
            </div>
          );
        }
        currentMinute = minute;
        minuteStartColumn = i;
      }
    }

    return elements;
  }, [shouldShowMinutes, columns, zoom.hoursPerColumn, columnWidth]);

  return (
    <div className="sticky top-0 z-20 border-b border-border">
      {/* Row 1: Days - Always displayed */}
      <div className="flex h-6 border-b border-gantt-grid">
        {daysRow.length > 0 ? daysRow : <div className="flex-1 bg-gantt-header" />}
      </div>
      {/* Row 2: Hours - Always displayed */}
      <div className="flex h-6 border-b border-gantt-grid">
        {hoursRow.length > 0 ? hoursRow : <div className="flex-1 bg-background" />}
      </div>
      {/* Row 3: Minutes - Always displayed */}
      <div className="flex h-6">
        {minutesRow.length > 0 ? minutesRow : <div className="flex-1 bg-gantt-bg" />}
      </div>
    </div>
  );
});

GanttTimeline.displayName = "GanttTimeline";
