import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TOOL_ERASER,
  TOOL_SELECT,
  TOOL_STICKY,
  TOOL_TEXT,
} from '../../constants/tools.js';
import { drawElement, drawEmptyBoardHint, drawSelection, getHandlePositions, RESIZE_HANDLES } from '../../utils/canvas.js';
import { canResize, hitTest, resizeElement, translateElement } from '../../utils/geometry.js';
import { createElement, extendDraftElement } from '../../utils/elements.js';
import TextEditor from './TextEditor.jsx';

const HANDLE_HIT_RADIUS = 9;

export default function Whiteboard({
  elements,
  upsertElement,
  removeElement,
  tool,
  style,
  selectedId,
  onSelect,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const erasedRef = useRef(new Set());
  const draftRef = useRef(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState(null);
  const [preview, setPreview] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // A click can start and finish a stroke before React re-renders, so the draft
  // is mirrored in a ref that is written the moment the pointer goes down.
  const updateDraft = useCallback((next) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const selected = elements.find((element) => element.id === selectedId) || null;

  const displayElements = preview
    ? elements.map((element) => (element.id === preview.id ? preview : element))
    : elements;

  const editingElement = editingId
    ? displayElements.find((element) => element.id === editingId)
    : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * ratio);
    canvas.height = Math.floor(size.height * ratio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    for (const element of displayElements) drawElement(context, element);
    if (draft) drawElement(context, draft);
    if (selected) drawSelection(context, selected, style.color);
    if (displayElements.length === 0 && !draft) {
      drawEmptyBoardHint(context, size.width, size.height);
    }
  }, [displayElements, draft, selected, size, style.color]);

  const toPoint = useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const findElementAt = useCallback(
    (point) => {
      for (let index = displayElements.length - 1; index >= 0; index -= 1) {
        if (hitTest(displayElements[index], point.x, point.y)) return displayElements[index];
      }
      return null;
    },
    [displayElements],
  );

  const findHandleAt = useCallback(
    (point) => {
      if (!selected || !canResize(selected)) return null;

      const positions = getHandlePositions(selected);
      return (
        RESIZE_HANDLES.find(
          (handle) => Math.hypot(positions[handle].x - point.x, positions[handle].y - point.y) <= HANDLE_HIT_RADIUS,
        ) || null
      );
    },
    [selected],
  );

  const eraseAt = useCallback(
    (point) => {
      const target = findElementAt(point);
      if (!target || erasedRef.current.has(target.id)) return;

      erasedRef.current.add(target.id);
      removeElement(target.id);
      if (target.id === selectedId) onSelect(null);
    },
    [findElementAt, removeElement, selectedId, onSelect],
  );

  const startTextElement = useCallback(
    (point) => {
      const element = createElement(tool, point, style);
      upsertElement(element);
      onSelect(element.id);
      setEditingId(element.id);
    },
    [onSelect, style, tool, upsertElement],
  );

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;

    // Stops the browser from moving focus or starting a text selection, which
    // would otherwise blur the text editor that a click on the board opens.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = toPoint(event);
    erasedRef.current = new Set();

    if (tool === TOOL_SELECT) {
      const handle = findHandleAt(point);
      if (handle) {
        setInteraction({ mode: 'resize', handle, start: point, origin: selected });
        return;
      }

      const target = findElementAt(point);
      onSelect(target?.id ?? null);
      if (target) setInteraction({ mode: 'move', start: point, origin: target });
      return;
    }

    if (tool === TOOL_ERASER) {
      eraseAt(point);
      return;
    }

    if (tool === TOOL_TEXT || tool === TOOL_STICKY) {
      startTextElement(point);
      return;
    }

    updateDraft(createElement(tool, point, style));
  };

  const handlePointerMove = (event) => {
    const point = toPoint(event);

    if (interaction?.mode === 'move') {
      const moved = translateElement(
        interaction.origin,
        point.x - interaction.start.x,
        point.y - interaction.start.y,
      );
      setPreview({ ...moved, updatedAt: Date.now() });
      return;
    }

    if (interaction?.mode === 'resize') {
      const resized = resizeElement(
        interaction.origin,
        interaction.handle,
        point.x - interaction.start.x,
        point.y - interaction.start.y,
      );
      setPreview({ ...resized, updatedAt: Date.now() });
      return;
    }

    if (draftRef.current) {
      updateDraft(extendDraftElement(draftRef.current, point));
      return;
    }

    if (tool === TOOL_ERASER) eraseAt(point);
  };

  const handlePointerUp = () => {
    if (preview) upsertElement(preview);
    if (draftRef.current) upsertElement(draftRef.current);

    setPreview(null);
    setInteraction(null);
    updateDraft(null);
  };

  const handleDoubleClick = (event) => {
    if (tool !== TOOL_SELECT) return;

    const target = findElementAt(toPoint(event));
    if (target?.type === TOOL_TEXT || target?.type === TOOL_STICKY) {
      onSelect(target.id);
      setEditingId(target.id);
    }
  };

  const cursor =
    tool === TOOL_SELECT
      ? 'cursor-default'
      : tool === TOOL_ERASER
        ? 'cursor-cell'
        : tool === TOOL_TEXT || tool === TOOL_STICKY
          ? 'cursor-text'
          : 'cursor-crosshair';

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className={`block touch-none ${cursor}`}
        role="application"
        aria-label="Collaborative whiteboard canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

      {editingElement ? (
        <TextEditor
          element={editingElement}
          onCommit={(text) => {
            upsertElement({ ...editingElement, text });
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : null}
    </div>
  );
}
