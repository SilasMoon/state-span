import { ZoomConfig } from "@/types/gantt";

interface GanttTimelineProps {
  zoom: ZoomConfig;
  totalHours: number;
}

export const GanttTimeline = ({ zoom, totalHours }: GanttTimelineProps) => {
  const columnWidth = zoom.columnWidth;
  const columns = Math.ceil(totalHours / zoom.hoursPerColumn);

  // Render Row 1 (Top): Context row
  // L1-L10: Day only (xd format)
  // L11-L16: Day + Hour (xd + yh format)
  const renderRow1 = () => {
    const elements = [];

    if (zoom.row1Unit === "day") {
      // L1-L10: Group by day
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
    } else {
      // L11-L16: Show day + hour for each column
      for (let i = 0; i < columns; i++) {
        const hour = i * zoom.hoursPerColumn;
        const day = Math.floor(hour / 24);
        const hourInDay = Math.floor(hour % 24);
        const isEven = Math.floor(hour) % 2 === 0;

        elements.push(
          <div
            key={`hour-${i}`}
            className="flex items-center px-2 border-r border-gantt-grid text-xs font-semibold"
            style={{ 
              width: `${columnWidth}px`, 
              minWidth: `${columnWidth}px`,
              backgroundColor: isEven 
                ? 'hsl(var(--gantt-header))' 
                : `hsla(var(--muted) / calc(0.5 * var(--gantt-timescale-contrast)))`
            }}
          >
            {day}d + {hourInDay}h
          </div>
        );
      }
    }

    return elements;
  };

  // Render Row 2 (Bottom): Detail row
  // L1-L2: No Row 2 (null)
  // L3-L10: Hours (yh format)
  // L11-L16: Minutes only (mm format)
  const renderRow2 = () => {
    // L1-L2: No Row 2
    if (zoom.row2Increment === null) {
      return null;
    }

    const elements = [];

    for (let i = 0; i < columns; i++) {
      const hour = i * zoom.hoursPerColumn;
      const hourInDay = hour % 24;

      // Determine background alternation based on increment unit
      // For alternation, we divide the column index by the pattern and check if it's even
      const incrementIndex = Math.floor(i);
      const isEven = incrementIndex % 2 === 0;

      let label: string;
      if (zoom.row1Unit === "day") {
        // L3-L10: Show hours as "yh"
        label = `${Math.floor(hourInDay)}h`;
      } else {
        // L11-L16: Show minutes only
        const minutes = Math.round((hourInDay % 1) * 60);
        label = minutes.toString().padStart(2, '0');
      }

      elements.push(
        <div
          key={`detail-${i}`}
          className="flex items-center px-2 border-r border-gantt-grid text-xs"
          style={{ 
            width: `${columnWidth}px`, 
            minWidth: `${columnWidth}px`,
            backgroundColor: isEven 
              ? 'hsl(var(--background))' 
              : `hsla(var(--muted) / calc(0.3 * var(--gantt-timescale-contrast)))`
          }}
        >
          <div className="text-gantt-text-muted">{label}</div>
        </div>
      );
    }

    return elements;
  };

  const row2Content = renderRow2();

  return (
    <div className="sticky top-0 z-20 border-b border-border">
      {/* Row 1: Context row */}
      <div className="flex h-6 border-b border-gantt-grid">{renderRow1()}</div>
      {/* Row 2: Detail row (only if not L1-L2) */}
      {row2Content && <div className="flex h-6">{row2Content}</div>}
    </div>
  );
};
