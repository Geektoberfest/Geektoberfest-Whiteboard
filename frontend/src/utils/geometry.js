const MIN_SIZE = 12;
const HIT_TOLERANCE = 8;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);

  const position = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (x1 + position * dx), py - (y1 + position * dy));
}

export function getBounds(element) {
  if (element.type === 'pen') {
    const xs = element.points.map((point) => point.x);
    const ys = element.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(Math.max(...xs) - minX, 1), height: Math.max(Math.max(...ys) - minY, 1) };
  }

  if (element.type === 'line' || element.type === 'arrow') {
    return {
      x: Math.min(element.x, element.x2),
      y: Math.min(element.y, element.y2),
      width: Math.abs(element.x2 - element.x),
      height: Math.abs(element.y2 - element.y),
    };
  }

  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

function isInsideBounds(bounds, x, y, padding = 0) {
  return (
    x >= bounds.x - padding &&
    x <= bounds.x + bounds.width + padding &&
    y >= bounds.y - padding &&
    y <= bounds.y + bounds.height + padding
  );
}

export function hitTest(element, x, y) {
  if (element.type === 'pen') {
    const { points } = element;
    if (points.length === 1) return Math.hypot(x - points[0].x, y - points[0].y) <= HIT_TOLERANCE;

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const reach = HIT_TOLERANCE + element.strokeWidth / 2;
      if (distanceToSegment(x, y, previous.x, previous.y, current.x, current.y) <= reach) return true;
    }
    return false;
  }

  if (element.type === 'line' || element.type === 'arrow') {
    const reach = HIT_TOLERANCE + element.strokeWidth / 2;
    return distanceToSegment(x, y, element.x, element.y, element.x2, element.y2) <= reach;
  }

  if (element.type === 'circle') {
    const bounds = getBounds(element);
    const radiusX = bounds.width / 2 || 1;
    const radiusY = bounds.height / 2 || 1;
    const normalized =
      ((x - (bounds.x + radiusX)) / (radiusX + HIT_TOLERANCE)) ** 2 +
      ((y - (bounds.y + radiusY)) / (radiusY + HIT_TOLERANCE)) ** 2;
    return normalized <= 1;
  }

  return isInsideBounds(getBounds(element), x, y, HIT_TOLERANCE);
}

export function translateElement(element, deltaX, deltaY) {
  if (element.type === 'pen') {
    return {
      ...element,
      points: element.points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })),
    };
  }

  if (element.type === 'line' || element.type === 'arrow') {
    return { ...element, x: element.x + deltaX, y: element.y + deltaY, x2: element.x2 + deltaX, y2: element.y2 + deltaY };
  }

  return { ...element, x: element.x + deltaX, y: element.y + deltaY };
}

/** Resizes box elements from one of the four corner handles ('nw', 'ne', 'se', 'sw'). */
export function resizeElement(element, handle, deltaX, deltaY) {
  const start = getBounds(element);
  let { x, y, width, height } = start;

  if (handle.includes('w')) {
    x = start.x + deltaX;
    width = start.width - deltaX;
  }
  if (handle.includes('e')) width = start.width + deltaX;
  if (handle.includes('n')) {
    y = start.y + deltaY;
    height = start.height - deltaY;
  }
  if (handle.includes('s')) height = start.height + deltaY;

  if (width < MIN_SIZE) {
    if (handle.includes('w')) x = start.x + start.width - MIN_SIZE;
    width = MIN_SIZE;
  }
  if (height < MIN_SIZE) {
    if (handle.includes('n')) y = start.y + start.height - MIN_SIZE;
    height = MIN_SIZE;
  }

  return { ...element, x, y, width, height };
}

export function canResize(element) {
  return ['rectangle', 'circle', 'text', 'sticky'].includes(element.type);
}

export function fontSizeFor(element) {
  if (element.type === 'text') return clamp(element.height * 0.5, 12, 48);
  return clamp(element.height * 0.18, 11, 22);
}
