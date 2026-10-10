// Every element that travels over a socket or gets written to the database passes
// through here, so a client can never push unknown fields or absurd values into a room.

const TYPES = new Set(['pen', 'line', 'arrow', 'rectangle', 'circle', 'text', 'sticky']);
const BOUND_TYPES = new Set(['rectangle', 'circle', 'text', 'sticky']);

const MAX_COORDINATE = 100000;
const MAX_POINTS = 500;
const MAX_TEXT_LENGTH = 2000;
const MAX_STROKE_WIDTH = 80;
const MAX_ID_LENGTH = 64;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_COLORS = {
  pen: '#1f2937',
  line: '#1f2937',
  arrow: '#1f2937',
  rectangle: '#2563eb',
  circle: '#2563eb',
  text: '#111827',
  sticky: '#fde68a',
};

function toCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(number, -MAX_COORDINATE), MAX_COORDINATE);
}

function toSize(value, fallback) {
  const number = toCoordinate(value);
  if (number === null) return fallback;
  return Math.min(Math.max(Math.abs(number), 1), MAX_COORDINATE);
}

function toStrokeWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 3;
  return Math.min(Math.max(number, 1), MAX_STROKE_WIDTH);
}

function toColor(value, fallback) {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback;
}

function toId(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH) return null;
  return value;
}

function toPoints(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const points = [];
  for (const rawPoint of value.slice(0, MAX_POINTS)) {
    const x = toCoordinate(rawPoint?.x);
    const y = toCoordinate(rawPoint?.y);
    if (x === null || y === null) continue;
    points.push({ x, y });
  }
  return points.length > 0 ? points : null;
}

function toText(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, MAX_TEXT_LENGTH);
}

/** Returns a clean element, or null when the payload cannot be repaired into one. */
export function sanitizeElement(input) {
  if (typeof input !== 'object' || input === null) return null;

  const id = toId(input.id);
  const type = typeof input.type === 'string' ? input.type : '';
  if (!id || !TYPES.has(type)) return null;

  const element = {
    id,
    type,
    color: toColor(input.color, DEFAULT_COLORS[type]),
    strokeWidth: toStrokeWidth(input.strokeWidth),
    updatedBy: typeof input.updatedBy === 'string' ? input.updatedBy : null,
    updatedAt: Date.now(),
  };

  if (type === 'pen') {
    const points = toPoints(input.points);
    if (!points) return null;
    return { ...element, points };
  }

  if (type === 'line' || type === 'arrow') {
    const x = toCoordinate(input.x);
    const y = toCoordinate(input.y);
    const x2 = toCoordinate(input.x2);
    const y2 = toCoordinate(input.y2);
    if (x === null || y === null || x2 === null || y2 === null) return null;
    return { ...element, x, y, x2, y2 };
  }

  if (BOUND_TYPES.has(type)) {
    const x = toCoordinate(input.x);
    const y = toCoordinate(input.y);
    if (x === null || y === null) return null;
    const rawWidth = toCoordinate(input.width);
    const rawHeight = toCoordinate(input.height);
    const bound = {
      x: rawWidth !== null && rawWidth < 0 ? toCoordinate(x + rawWidth) : x,
      y: rawHeight !== null && rawHeight < 0 ? toCoordinate(y + rawHeight) : y,
      width: toSize(input.width, 160),
      height: toSize(input.height, 90),
    };
    if (type === 'text' || type === 'sticky') {
      return { ...element, ...bound, text: toText(input.text) };
    }
    return { ...element, ...bound, fill: toColor(input.fill, 'transparent') };
  }

  return null;
}

/** Element id extracted from a delete payload, or null when it is not usable. */
export function sanitizeElementId(value) {
  return toId(value);
}
