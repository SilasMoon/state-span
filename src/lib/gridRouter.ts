/**
 * Grid-based A* router for Gantt chart links
 * Provides intelligent pathfinding that avoids obstacles
 */

interface Point {
  x: number;
  y: number;
}

interface GridCell {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost
  parent: GridCell | null;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RouteRequest {
  start: Point;
  end: Point;
  obstacles: Obstacle[];
  gridSize: number; // Cell size in pixels
  chartWidth: number;
  chartHeight: number;
  cornerRadius?: number;
}

export class GridRouter {
  private gridSize: number;
  private grid: boolean[][]; // true = occupied, false = free
  private width: number;
  private height: number;
  private obstacles: Obstacle[];

  constructor(
    chartWidth: number,
    chartHeight: number,
    gridSize: number,
    obstacles: Obstacle[]
  ) {
    this.gridSize = gridSize;
    this.obstacles = obstacles;
    
    // Calculate grid dimensions
    this.width = Math.ceil(chartWidth / gridSize);
    this.height = Math.ceil(chartHeight / gridSize);
    
    // Initialize grid - all free
    this.grid = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(false));
    
    // Mark obstacles
    this.markObstacles();
  }

  private markObstacles() {
    // Mark obstacles with appropriate padding to prevent crossing bars
    // Use moderate padding to allow routing around bars without over-restricting
    const VERTICAL_PADDING = 3; // Cells above/below bar
    const HORIZONTAL_PADDING = 2; // Cells left/right of bar
    
    this.obstacles.forEach(obstacle => {
      const barLeft = Math.floor(obstacle.x / this.gridSize);
      const barRight = Math.ceil((obstacle.x + obstacle.width) / this.gridSize);
      const barTop = Math.floor(obstacle.y / this.gridSize);
      const barBottom = Math.ceil((obstacle.y + obstacle.height) / this.gridSize);
      
      // Mark the bar area plus padding as occupied
      const minX = Math.max(0, barLeft - HORIZONTAL_PADDING);
      const maxX = Math.min(this.width, barRight + HORIZONTAL_PADDING);
      const minY = Math.max(0, barTop - VERTICAL_PADDING);
      const maxY = Math.min(this.height, barBottom + VERTICAL_PADDING);
      
      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          this.grid[y][x] = true; // Mark as occupied
        }
      }
    });
  }

  private toGridCoords(point: Point): Point {
    return {
      x: Math.floor(point.x / this.gridSize),
      y: Math.floor(point.y / this.gridSize)
    };
  }

  private toPixelCoords(gridPoint: Point): Point {
    return {
      x: (gridPoint.x + 0.5) * this.gridSize,
      y: (gridPoint.y + 0.5) * this.gridSize
    };
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && !this.grid[y][x];
  }

  private heuristic(a: Point, b: Point): number {
    // Manhattan distance for rectilinear paths
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getNeighbors(cell: Point): Point[] {
    const neighbors: Point[] = [];
    
    // Only orthogonal moves (no diagonals) for cleaner rectilinear paths
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
    ];
    
    directions.forEach(dir => {
      const newX = cell.x + dir.x;
      const newY = cell.y + dir.y;
      
      if (this.isValidCell(newX, newY)) {
        neighbors.push({ x: newX, y: newY });
      }
    });
    
    return neighbors;
  }

  private getDirection(from: Point, to: Point): string {
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'down';
    if (to.y < from.y) return 'up';
    return 'none';
  }

  private calculateMoveCost(current: Point, next: Point, parent: Point | null): number {
    let cost = 1; // Base cost
    
    // Penalize direction changes to prefer straight lines
    if (parent) {
      const prevDirection = this.getDirection(parent, current);
      const nextDirection = this.getDirection(current, next);
      
      if (prevDirection !== nextDirection) {
        cost += 4; // High penalty for turns
      }
    }
    
    return cost;
  }

  public findPath(start: Point, end: Point): Point[] | null {
    // Create simple elbow-style orthogonal paths
    return this.createElbowPath(start, end);
  }

  /**
   * Creates a clean elbow path using only horizontal and vertical segments
   * Pattern depends on whether start and end are vertically aligned:
   * - Same X (vertical line): Direct vertical path with vertical arrowhead
   * - Different X: Elbow path ending horizontally with horizontal arrowhead
   */
  private createElbowPath(start: Point, end: Point): Point[] {
    const path: Point[] = [start];
    
    // If vertically aligned (same X), direct vertical path (vertical arrowhead)
    if (Math.abs(start.x - end.x) < 1) {
      path.push(end);
      return path;
    }
    
    // Different X positions: create elbow path that ends horizontally
    
    // Calculate clearance needed around obstacles
    const CLEARANCE = 24; // pixels above/below bars
    
    // Determine if we need to route around obstacles
    const needsRouting = this.hasObstacleBetween(start, end);
    
    if (!needsRouting) {
      // Simple 3-point elbow: start -> middle -> end
      // Go horizontal halfway, then vertical, then horizontal to end
      const midX = start.x + (end.x - start.x) / 2;
      path.push({ x: midX, y: start.y });
      path.push({ x: midX, y: end.y });
      path.push(end);
    } else {
      // Route around obstacles with vertical clearance
      // Pattern: horizontal -> vertical (with clearance) -> horizontal -> vertical -> horizontal
      
      // Find a clear Y position to route through
      const routingY = this.findClearRoutingY(start, end, CLEARANCE);
      
      // Build path: start -> vertical escape -> routing level -> approach target -> end
      path.push({ x: start.x, y: routingY });
      path.push({ x: end.x, y: routingY });
      path.push(end);
    }
    
    return path;
  }

  /**
   * Check if there are obstacles between start and end points
   */
  private hasObstacleBetween(start: Point, end: Point): boolean {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    
    return this.obstacles.some(obs => {
      const obsRight = obs.x + obs.width;
      const obsBottom = obs.y + obs.height;
      
      // Check if obstacle intersects the bounding box of our path
      return !(obsRight < minX || obs.x > maxX || obsBottom < minY || obs.y > maxY);
    });
  }

  /**
   * Find a clear Y position to route the link through
   */
  private findClearRoutingY(start: Point, end: Point, clearance: number): number {
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const midY = (minY + maxY) / 2;
    
    // Try routing above the obstacles
    const aboveY = minY - clearance;
    if (aboveY > 0 && this.isYClear(aboveY, start.x, end.x)) {
      return aboveY;
    }
    
    // Try routing below the obstacles
    const belowY = maxY + clearance;
    if (belowY < this.height * this.gridSize && this.isYClear(belowY, start.x, end.x)) {
      return belowY;
    }
    
    // Fallback: use middle with extra clearance
    return midY;
  }

  /**
   * Check if a horizontal routing line at Y is clear between startX and endX
   */
  private isYClear(y: number, startX: number, endX: number): boolean {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    
    return !this.obstacles.some(obs => {
      const obsRight = obs.x + obs.width;
      const obsBottom = obs.y + obs.height;
      
      // Check if obstacle intersects with our horizontal line
      return y >= obs.y && y <= obsBottom && !(obsRight < minX || obs.x > maxX);
    });
  }

  private createSafeFallbackPath(start: Point, end: Point): Point[] {
    // Create a path that goes vertical first, then horizontal, then vertical
    // This ensures we never cross bars horizontally
    const path: Point[] = [start];
    
    // Move vertically away from start to a safe zone
    const midY = start.y < end.y 
      ? Math.max(start.y, end.y) + 30 // Go above
      : Math.min(start.y, end.y) - 30; // Go below
    
    path.push({ x: start.x, y: midY });
    path.push({ x: end.x, y: midY });
    path.push(end);
    
    return path;
  }

  private smoothPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;
    
    // Remove redundant collinear points
    const smoothed: Point[] = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];
      
      const dir1 = this.getDirection(prev, curr);
      const dir2 = this.getDirection(curr, next);
      
      // Only keep points where direction changes
      if (dir1 !== dir2) {
        smoothed.push(curr);
      }
    }
    
    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  /**
   * Ensures the final segment approaches the target horizontally
   * (unless start and end Y are the same, which is already horizontal)
   */
  private ensureHorizontalArrowhead(path: Point[]): Point[] {
    if (path.length < 2) return path;
    
    const start = path[0];
    const end = path[path.length - 1];
    
    // If Y positions are the same, already horizontal
    if (Math.abs(start.y - end.y) < 1) return path;
    
    // Check if last segment is already horizontal
    const secondToLast = path[path.length - 2];
    const lastSegmentIsHorizontal = Math.abs(secondToLast.y - end.y) < 1;
    
    if (lastSegmentIsHorizontal) {
      // Already horizontal, no adjustment needed
      return path;
    }
    
    // Last segment is vertical, need to add a horizontal approach
    // Insert a point that creates: vertical -> horizontal -> end
    const adjustedPath = [...path];
    adjustedPath[adjustedPath.length - 1] = { x: secondToLast.x, y: end.y };
    adjustedPath.push(end);
    
    return adjustedPath;
  }

  public static createSVGPath(points: Point[], cornerRadius: number = 8): string {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate direction vectors
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      
      // Check if it's a corner (direction change)
      if ((dx1 === 0 && dy2 === 0) || (dy1 === 0 && dx2 === 0)) {
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const radius = Math.min(cornerRadius, dist1 / 2, dist2 / 2);
        
        if (radius > 0) {
          // Line to start of curve
          const beforeX = curr.x - (dx1 / dist1) * radius;
          const beforeY = curr.y - (dy1 / dist1) * radius;
          path += ` L ${beforeX} ${beforeY}`;
          
          // Quadratic curve through corner
          const afterX = curr.x + (dx2 / dist2) * radius;
          const afterY = curr.y + (dy2 / dist2) * radius;
          path += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
          continue;
        }
      }
      
      path += ` L ${curr.x} ${curr.y}`;
    }
    
    path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return path;
  }
}
