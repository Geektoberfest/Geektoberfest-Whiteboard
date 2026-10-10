export default function Brand({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold text-slate-900 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 18c4-10 9-13 16-13" strokeLinecap="round" />
          <circle cx="18" cy="17" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span>
        Geekstober <span className="font-normal text-slate-500">Whiteboard</span>
      </span>
    </span>
  );
}
