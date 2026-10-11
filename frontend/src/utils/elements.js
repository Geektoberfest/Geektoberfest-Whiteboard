let elementCounter = 0;

const MIN_POINT_DISTANCE = 1.5;

function createElementId() {
  elementCounter += 1;
  return `el_${Date.now().toString(36)}_${elementCounter.toString(36)}`;
}

// Field order is fixed by the server sanitiser, so comparing these keys tells us
// whether an element really changed when we replay an undo or redo.
const ELEMENT_KEYS = [
  'id',
  'type',
  'x',
  'y',
  'x2',
  'y2',
  'width',
  'height',
  'text',
  'color',
  'fill',
  'strokeWidth',
  'points',
];

export function elementSignature(element) {
  return ELEMENT_KEYS.map((key) => JSON.stringify(element[key] ?? null)).join('|');
}

export function upsertElement(elements, element) {
  const index = elements.findIndex((existing) => existing.id === element.id);
  if (index === -1) return [...elements, element];

  const next = elements.slice();
  next[index] = element;
  return next;
}

export function createElement(type, position, style) {
  const base = {
    id: createElementId(),
    type,
    color: style.color,
    strokeWidth: style.strokeWidth,
    updatedAt: Date.now(),
  };

  if (type === 'pen') {
    return { ...base, points: [{ x: position.x, y: position.y }] };
  }

  if (type === 'line' || type === 'arrow') {
    return { ...base, x: position.x, y: position.y, x2: position.x, y2: position.y };
  }

  if (type === 'text') {
    return { ...base, x: position.x, y: position.y, width: 220, height: 48, text: 'Text' };
  }

  if (type === 'sticky') {
    return {
      ...base,
      x: position.x,
      y: position.y,
      width: 180,
      height: 180,
      text: 'Note',
      fill: style.stickyColor ?? style.color,
    };
  }

  return { ...base, x: position.x, y: position.y, width: 1, height: 1, fill: 'transparent' };
}

/** Grows an in-progress element towards the pointer while a drag is active. */
export function extendDraftElement(draft, point) {
  if (draft.type === 'pen') {
    const lastPoint = draft.points[draft.points.length - 1];
    if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < MIN_POINT_DISTANCE) return draft;
    return { ...draft, points: [...draft.points, point] };
  }

  if (draft.type === 'line' || draft.type === 'arrow') {
    return { ...draft, x2: point.x, y2: point.y };
  }

  return { ...draft, width: point.x - draft.x, height: point.y - draft.y };
}
