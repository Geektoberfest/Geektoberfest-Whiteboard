import { STROKE_COLORS, STROKE_WIDTHS, TOOLS } from '../../constants/tools.js';

const toolButtonClasses = (isActive) =>
  `flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Toolbar({ tool, onToolChange, style, onStyleChange, canUndo, canRedo, onUndo, onRedo }) {
  return (
    <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto border-slate-200 bg-white px-3 py-2 md:w-20 md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:border-r md:px-2 md:py-3">
      <div className="flex gap-1 md:grid md:grid-cols-2">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToolChange(item.id)}
            aria-pressed={tool === item.id}
            aria-label={item.label}
            title={`${item.label} (${item.shortcut})`}
            className={toolButtonClasses(tool === item.id)}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
          </button>
        ))}
      </div>

      <div className="h-px w-full bg-slate-200 md:my-1" />

      <div className="flex items-center gap-1.5 md:grid md:grid-cols-2">
        {STROKE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onStyleChange({ ...style, color })}
            aria-label={`Use colour ${color}`}
            aria-pressed={style.color === color}
            title={color}
            className={`h-6 w-6 rounded-full ring-offset-2 focus-visible:outline-2 focus-visible:outline-brand-600 ${
              style.color === color ? 'ring-2 ring-slate-900' : ''
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="h-px w-full bg-slate-200 md:my-1" />

      <div className="flex items-center gap-1.5 md:grid md:grid-cols-2">
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            type="button"
            onClick={() => onStyleChange({ ...style, strokeWidth: width })}
            aria-label={`Stroke width ${width}`}
            aria-pressed={style.strokeWidth === width}
            className={`flex h-8 w-8 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
              style.strokeWidth === width ? 'bg-slate-900' : 'hover:bg-slate-100'
            }`}
          >
            <span
              className={`rounded-full ${style.strokeWidth === width ? 'bg-white' : 'bg-slate-600'}`}
              style={{ width: Math.max(4, width + 4), height: Math.max(4, width + 4) }}
            />
          </button>
        ))}
      </div>

      <div className="h-px w-full bg-slate-200 md:my-1" />

      <div className="flex items-center gap-1.5 md:grid md:grid-cols-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h9a6 6 0 010 12h-3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9h-9a6 6 0 000 12h3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
