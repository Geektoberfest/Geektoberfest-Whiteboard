export const TOOL_SELECT = 'select';
export const TOOL_ERASER = 'eraser';
export const TOOL_TEXT = 'text';
export const TOOL_STICKY = 'sticky';

const TOOL_PEN = 'pen';
const TOOL_LINE = 'line';
const TOOL_ARROW = 'arrow';
const TOOL_RECTANGLE = 'rectangle';
const TOOL_CIRCLE = 'circle';

// Icons are inline SVG paths so the toolbar needs no icon dependency.
export const TOOLS = [
  { id: TOOL_SELECT, label: 'Select', shortcut: 'V', icon: 'M4 3l14 8-6 1.5L9 20 4 3z' },
  { id: TOOL_PEN, label: 'Pen', shortcut: 'P', icon: 'M4 17l3 3 9-9-3-3-9 9zM13 6l3 3' },
  { id: TOOL_ERASER, label: 'Eraser', shortcut: 'E', icon: 'M7 16l-4-4 8-8 4 4-8 8zM11 20h9' },
  { id: TOOL_LINE, label: 'Line', shortcut: 'L', icon: 'M4 18L18 4' },
  { id: TOOL_ARROW, label: 'Arrow', shortcut: 'A', icon: 'M4 18L18 4M18 4h-6M18 4v6' },
  { id: TOOL_RECTANGLE, label: 'Rectangle', shortcut: 'R', icon: 'M4 6h14v10H4z' },
  { id: TOOL_CIRCLE, label: 'Circle', shortcut: 'C', icon: 'M17 11a6 6 0 11-12 0 6 6 0 0112 0z' },
  { id: TOOL_TEXT, label: 'Text', shortcut: 'T', icon: 'M5 6h12M12 6v12' },
  { id: TOOL_STICKY, label: 'Sticky note', shortcut: 'S', icon: 'M5 4h14v10l-4 4H5zM19 14h-4v4' },
];

export const STROKE_COLORS = ['#111827', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];

export const STROKE_WIDTHS = [2, 4, 8];

export const STICKY_COLORS = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e5e7eb'];
