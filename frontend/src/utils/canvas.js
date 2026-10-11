import { canResize, fontSizeFor, getBounds } from './geometry.js';

export const RESIZE_HANDLES = ['nw', 'ne', 'se', 'sw'];
const HANDLE_SIZE = 8;
const FONT_FAMILY = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

function normalizeBox(element) {
  return {
    x: element.width < 0 ? element.x + element.width : element.x,
    y: element.height < 0 ? element.y + element.height : element.y,
    width: Math.abs(element.width),
    height: Math.abs(element.height),
  };
}

function strokePath(ctx, points) {
  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  if (points.length === 1) ctx.lineTo(points[0].x + 0.01, points[0].y);
  ctx.stroke();
}

function strokeArrow(ctx, element) {
  strokePath(ctx, [
    { x: element.x, y: element.y },
    { x: element.x2, y: element.y2 },
  ]);

  const angle = Math.atan2(element.y2 - element.y, element.x2 - element.x);
  const headLength = Math.max(10, element.strokeWidth * 3.5);

  ctx.beginPath();
  ctx.moveTo(element.x2, element.y2);
  ctx.lineTo(
    element.x2 - headLength * Math.cos(angle - Math.PI / 7),
    element.y2 - headLength * Math.sin(angle - Math.PI / 7),
  );
  ctx.moveTo(element.x2, element.y2);
  ctx.lineTo(
    element.x2 - headLength * Math.cos(angle + Math.PI / 7),
    element.y2 - headLength * Math.sin(angle + Math.PI / 7),
  );
  ctx.stroke();
}

function drawEllipseBox(ctx, element) {
  const box = normalizeBox(element);
  ctx.beginPath();
  ctx.ellipse(
    box.x + box.width / 2,
    box.y + box.height / 2,
    box.width / 2,
    box.height / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.stroke();
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];

  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }

  return lines;
}

function drawLines(ctx, lines, x, y, lineHeight, maxLines) {
  lines.slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

export function drawElement(ctx, element) {
  ctx.save();
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = element.color;
  ctx.fillStyle = element.fill === 'transparent' ? 'transparent' : element.fill;
  ctx.textBaseline = 'top';

  switch (element.type) {
    case 'pen':
      strokePath(ctx, element.points);
      break;
    case 'line':
      strokePath(ctx, [
        { x: element.x, y: element.y },
        { x: element.x2, y: element.y2 },
      ]);
      break;
    case 'arrow':
      strokeArrow(ctx, element);
      break;
    case 'rectangle': {
      const box = normalizeBox(element);
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      break;
    }
    case 'circle':
      drawEllipseBox(ctx, element);
      break;
    case 'text': {
      const fontSize = fontSizeFor(element);
      ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = element.color;
      const lines = wrapText(ctx, element.text || '', element.width);
      drawLines(ctx, lines, element.x, element.y, fontSize * 1.25, Math.ceil(element.height / (fontSize * 1.25)));
      break;
    }
    case 'sticky': {
      const fontSize = fontSizeFor(element);
      ctx.fillStyle = element.fill;
      ctx.fillRect(element.x, element.y, element.width, element.height);
      ctx.font = `500 ${fontSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = '#1f2937';
      const lines = wrapText(ctx, element.text || '', element.width - 24);
      drawLines(ctx, lines, element.x + 12, element.y + 12, fontSize * 1.3, Math.floor((element.height - 24) / (fontSize * 1.3)));
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

export function getHandlePositions(element) {
  const bounds = getBounds(element);
  return {
    nw: { x: bounds.x, y: bounds.y },
    ne: { x: bounds.x + bounds.width, y: bounds.y },
    se: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    sw: { x: bounds.x, y: bounds.y + bounds.height },
  };
}

export function drawSelection(ctx, element, color) {
  const bounds = getBounds(element);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
  ctx.setLineDash([]);

  if (canResize(element)) {
    ctx.fillStyle = '#ffffff';
    for (const position of Object.values(getHandlePositions(element))) {
      ctx.fillRect(position.x - HANDLE_SIZE / 2, position.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(position.x - HANDLE_SIZE / 2, position.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }
  }

  ctx.restore();
}

export function drawEmptyBoardHint(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 15px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pick a tool and start drawing. Everyone in this room sees it instantly.', width / 2, height / 2);
  ctx.restore();
}
