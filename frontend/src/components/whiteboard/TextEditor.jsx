import { useEffect, useRef, useState } from 'react';
import { fontSizeFor } from '../../utils/geometry.js';

export default function TextEditor({ element, onCommit, onCancel }) {
  const [value, setValue] = useState(element.text || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const isSticky = element.type === 'sticky';

  return (
    <textarea
      ref={textareaRef}
      value={value}
      aria-label={isSticky ? 'Edit sticky note' : 'Edit text'}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(event) => {
        // Keeps the board shortcuts from firing while someone is typing.
        event.stopPropagation();

        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }

        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onCommit(value);
        }
      }}
      className={`absolute resize-none overflow-hidden rounded border-2 border-brand-500 text-slate-900 outline-none ${
        isSticky ? 'bg-amber-100/95 p-3' : 'bg-white/95 p-1'
      }`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        fontSize: fontSizeFor(element),
      }}
    />
  );
}
