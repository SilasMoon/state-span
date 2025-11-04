import { ZoomConfig } from "@/types/gantt";

interface GanttTimelineProps {
  zoom: ZoomConfig;
  totalHours: number;
}

export const GanttTimeline = ({ zoom, totalHours }: GanttTimelineProps) => {
  const columnWidth = zoom.columnWidth;
  const columns = Math.ceil(totalHours / zoom.hoursPerColumn);

  // Calculate day spans for the top row
  const renderDayRow = () => {
    const dayElements = [];
    let currentDay = -1;
    let dayStartColumn = 0;

    for (let i = 0; i <= columns; i++) {
      const hour = i * zoom.hoursPerColumn;
      const day = Math.floor(hour / 24);

      if (day !== currentDay || i === columns) {
        if (currentDay >= 0) {
          const columnsInDay = i - dayStartColumn;
          const dayWidth = columnsInDay * columnWidth;
          const isEven = currentDay % 2 === 0;

          dayElements.push(
            <div
              key={currentDay}
              className={`flex items-center justify-center border-r border-gantt-grid text-xs font-semibold ${
                isEven ? 'bg-gantt-header' : 'bg-muted/50'
              }`}
              style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px` }}
            >
              Day {currentDay}
            </div>
          );
        }
        currentDay = day;
        dayStartColumn = i;
      }
    }

    return dayElements;
  };

  // Render time labels for the bottom row
  const renderTimeRow = () => {
    const timeElements = [];

    for (let i = 0; i < columns; i++) {
      const hour = i * zoom.hoursPerColumn;
      const hourInDay = hour % 24;
      const isEven = i % 2 === 0;

      // Format hour display based on granularity - always show start time only
      let hourDisplay: string;
      if (zoom.hoursPerColumn < 1) {
        // For sub-hour granularity, show HH:MM format
        const hours = Math.floor(hourInDay);
        const minutes = Math.round((hourInDay % 1) * 60);
        hourDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      } else {
        // For hour-based granularity, show just the start hour
        hourDisplay = Math.floor(hourInDay).toString();
      }

      timeElements.push(
        <div
          key={i}
          className={`flex items-center justify-center border-r border-gantt-grid text-xs ${
            isEven ? 'bg-background' : 'bg-muted/30'
          }`}
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
        >
          <div className="text-gantt-text-muted">{hourDisplay}</div>
        </div>
      );
    }

    return timeElements;
  };

  return (
    <div className="sticky top-0 z-20 border-b border-border">
      {/* Day row */}
      <div className="flex h-6 border-b border-gantt-grid">{renderDayRow()}</div>
      {/* Time row */}
      <div className="flex h-6">{renderTimeRow()}</div>
    </div>
  );
};
