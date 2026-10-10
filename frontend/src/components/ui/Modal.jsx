import { useEffect, useId, useRef } from 'react';

export default function Modal({ open, title, onClose, children, footer }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.querySelector('button, [href], input, textarea')?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 space-y-3 text-sm text-slate-600">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
